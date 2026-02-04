import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GradescopeConfig, GradescopeConflict, ConflictResolution } from '@/types/gradescope'
import { account } from '@/lib/appwrite/client'

export enum GradescopeStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

interface GradescopeStore {
  // State
  config: GradescopeConfig
  conflicts: GradescopeConflict[]
  status: GradescopeStatus
  error: string | null
  isLoading: boolean

  // Config actions
  setConnected: (connected: boolean, email?: string) => void
  setLastSync: (date: Date) => void
  setTokenExpiry: (date: Date) => void

  // Connection actions
  startConnecting: () => void
  connectSuccess: (email: string, tokenExpiry?: Date) => void
  connectError: (error: string) => void
  disconnect: () => void

  // Conflict actions
  setConflicts: (conflicts: GradescopeConflict[]) => void
  addConflict: (conflict: GradescopeConflict) => void
  resolveConflictLocally: (conflictId: string, resolution: ConflictResolution) => void
  clearConflicts: () => void

  // Status actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Check connection status
  checkStatus: () => Promise<void>

  // Load conflicts from server
  loadConflicts: () => Promise<void>
}

const defaultConfig: GradescopeConfig = {
  connected: false
}

export const useGradescopeStore = create<GradescopeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      config: defaultConfig,
      conflicts: [],
      status: GradescopeStatus.IDLE,
      error: null,
      isLoading: false,

      // Config actions
      setConnected: (connected: boolean, email?: string) =>
        set((state) => ({
          config: { ...state.config, connected, email: email || state.config.email },
          status: connected ? GradescopeStatus.CONNECTED : GradescopeStatus.IDLE
        })),

      setLastSync: (date: Date) =>
        set((state) => ({
          config: { ...state.config, lastSync: date }
        })),

      setTokenExpiry: (date: Date) =>
        set((state) => ({
          config: { ...state.config, tokenExpiry: date }
        })),

      // Connection actions
      startConnecting: () =>
        set({
          status: GradescopeStatus.CONNECTING,
          error: null
        }),

      connectSuccess: (email: string, tokenExpiry?: Date) =>
        set((state) => ({
          config: {
            ...state.config,
            connected: true,
            email,
            tokenExpiry
          },
          status: GradescopeStatus.CONNECTED,
          error: null
        })),

      connectError: (error: string) =>
        set({
          status: GradescopeStatus.ERROR,
          error
        }),

      disconnect: () =>
        set({
          config: defaultConfig,
          conflicts: [],
          status: GradescopeStatus.IDLE,
          error: null
        }),

      // Conflict actions
      setConflicts: (conflicts: GradescopeConflict[]) =>
        set({ conflicts }),

      addConflict: (conflict: GradescopeConflict) =>
        set((state) => ({
          conflicts: [...state.conflicts, conflict]
        })),

      resolveConflictLocally: (conflictId: string, resolution: ConflictResolution) =>
        set((state) => ({
          conflicts: state.conflicts.map((c) =>
            c.id === conflictId
              ? { ...c, resolved: true, resolution, resolvedAt: new Date() }
              : c
          )
        })),

      clearConflicts: () =>
        set({ conflicts: [] }),

      // Status actions
      setLoading: (loading: boolean) =>
        set({ isLoading: loading }),

      setError: (error: string | null) =>
        set({
          error,
          status: error ? GradescopeStatus.ERROR : get().status
        }),

      clearError: () =>
        set({ error: null }),

      // Check connection status from server
      checkStatus: async () => {
        try {
          set({ isLoading: true })
          
          let headers: Record<string, string> = {}
          try {
            const { jwt } = await account.createJWT()
            headers['Authorization'] = `Bearer ${jwt}`
          } catch (e) {
            // If user isn't logged in, this fails. That's fine, request will fail with 401.
          }

          const response = await fetch('/api/gradescope/status', {
            headers
          })
          const data = await response.json()

          if (data.connected) {
            set((state) => ({
              config: {
                ...state.config,
                connected: true,
                email: data.email,
                lastSync: data.lastSync ? new Date(data.lastSync) : undefined,
                tokenExpiry: data.tokenExpiry ? new Date(data.tokenExpiry) : undefined
              },
              status: GradescopeStatus.CONNECTED
            }))
          } else {
            set({
              config: defaultConfig,
              status: GradescopeStatus.IDLE
            })
          }
        } catch (error) {
          console.error('Error checking Gradescope status:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Load conflicts from server
      loadConflicts: async () => {
        try {
          set({ isLoading: true })
          // Conflicts are loaded via the conflicts page directly using Appwrite client
          // This is a placeholder for potential future API endpoint
        } catch (error) {
          console.error('Error loading conflicts:', error)
        } finally {
          set({ isLoading: false })
        }
      }
    }),
    {
      name: 'gradescope-storage',
      partialize: (state) => ({ config: state.config }) // Only persist config
    }
  )
)
