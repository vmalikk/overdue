import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { account } from '@/lib/appwrite/client'

export interface MoodleConfig {
  connected: boolean
  url?: string
  username?: string
  lastSync?: Date
  tokenExpiry?: Date
}

export enum MoodleStatus {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

interface MoodleStore {
  // State
  config: MoodleConfig
  status: MoodleStatus
  error: string | null
  isLoading: boolean

  // Config actions
  setConnected: (connected: boolean, url?: string, username?: string) => void
  setLastSync: (date: Date) => void

  // Connection actions
  startConnecting: () => void
  connectSuccess: (url: string, username: string) => void
  connectError: (error: string) => void
  disconnect: () => void

  // Status actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Check connection status
  checkStatus: () => Promise<void>
}

const defaultConfig: MoodleConfig = {
  connected: false
}

export const useMoodleStore = create<MoodleStore>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      status: MoodleStatus.IDLE,
      error: null,
      isLoading: false,

      setConnected: (connected, url, username) =>
        set((state) => ({
          config: { ...state.config, connected, url, username },
          status: connected ? MoodleStatus.CONNECTED : MoodleStatus.IDLE
        })),

      setLastSync: (date) =>
        set((state) => ({
          config: { ...state.config, lastSync: date }
        })),

      startConnecting: () =>
        set({ status: MoodleStatus.CONNECTING, isLoading: true, error: null }),

      connectSuccess: (url, username) =>
        set((state) => ({
          config: { ...state.config, connected: true, url, username, lastSync: new Date() },
          status: MoodleStatus.CONNECTED,
          isLoading: false,
          error: null
        })),

      connectError: (error) =>
        set({
          status: MoodleStatus.ERROR,
          isLoading: false,
          error
        }),

      disconnect: async () => {
        // Here you might call an API to clear the cookie/token on server
        // For now, clear client state
        set({
           config: defaultConfig,
           status: MoodleStatus.IDLE
        })
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      checkStatus: async () => {
        try {
            // Check against server to see if user has stored credentials (encrypted in prefs)
            const { jwt } = await account.createJWT();
            const res = await fetch('/api/moodle/connect', {
                headers: { 'Authorization': `Bearer ${jwt}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.connected) {
                    set((state) => ({
                        config: { ...state.config, connected: true, url: data.url, username: data.username },
                        status: MoodleStatus.CONNECTED
                    }));
                    return;
                }
            }
        } catch (e) {
            console.error("Moodle status check failed", e);
        }

        // Fallback: If server check returns false or fails, we trust the server says "not connected"
        // typically, but let's clear local state if server says no.
        set((state) => ({
             config: { ...state.config, connected: false },
             status: MoodleStatus.IDLE
        }));
      }
    }),
    {
      name: 'moodle-storage',
      partialize: (state) => ({ config: state.config }), // Only persist config
    }
  )
)
