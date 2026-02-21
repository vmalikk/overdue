import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { account } from '@/lib/appwrite/client'

export interface SolveJob {
  assignmentId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  solutionPath?: string
  preview?: string
  error?: string
  startedAt: number
}

interface SolverStore {
  isEnabled: boolean
  claudeSessionKey: string
  jobs: Record<string, SolveJob>

  checkStatus: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  saveSessionKey: (key: string) => Promise<void>
  clearSessionKey: () => Promise<void>
  solveAssignment: (assignmentId: string, nextcloudFilePath: string, assignmentTitle: string) => Promise<void>
  clearJob: (assignmentId: string) => void
}

export const useSolverStore = create<SolverStore>()(
  persist(
    (set, get) => ({
      isEnabled: false,
      claudeSessionKey: '',
      jobs: {},

      checkStatus: async () => {
        try {
          const { jwt } = await account.createJWT()
          const res = await fetch('/api/ai/solver-config', {
            headers: { Authorization: `Bearer ${jwt}` },
          })
          if (!res.ok) return // Don't overwrite local state on failure
          const data = await res.json()
          set({
            isEnabled: !!data.solverEnabled,
            claudeSessionKey: data.hasClaudeSession ? '••••••••' : '',
          })
        } catch {
          // Keep existing local state on error
        }
      },

      setEnabled: async (enabled: boolean) => {
        try {
          const { jwt } = await account.createJWT()
          await fetch('/api/ai/solver-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ solverEnabled: enabled }),
          })
          set({ isEnabled: enabled })
        } catch (error) {
          console.error('Failed to toggle solver:', error)
        }
      },

      saveSessionKey: async (key: string) => {
        const { jwt } = await account.createJWT()
        const res = await fetch('/api/ai/solver-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ claudeSessionKey: key }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to save session key')
        }
        set({ claudeSessionKey: '••••••••' })
      },

      clearSessionKey: async () => {
        const { jwt } = await account.createJWT()
        await fetch('/api/ai/solver-config', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${jwt}` },
        })
        set({ claudeSessionKey: '' })
      },

      solveAssignment: async (assignmentId: string, nextcloudFilePath: string, assignmentTitle: string) => {
        set((state) => ({
          jobs: {
            ...state.jobs,
            [assignmentId]: {
              assignmentId,
              status: 'running',
              startedAt: Date.now(),
            },
          },
        }))

        try {
          const { jwt } = await account.createJWT()
          const res = await fetch('/api/ai/solve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ nextcloudFilePath, assignmentTitle }),
          })

          const data = await res.json()

          if (!res.ok) {
            set((state) => ({
              jobs: {
                ...state.jobs,
                [assignmentId]: {
                  ...state.jobs[assignmentId],
                  status: 'failed',
                  error: data.error,
                },
              },
            }))
            return
          }

          set((state) => ({
            jobs: {
              ...state.jobs,
              [assignmentId]: {
                ...state.jobs[assignmentId],
                status: 'completed',
                solutionPath: data.solutionPath,
                preview: data.preview,
              },
            },
          }))
        } catch (error: any) {
          set((state) => ({
            jobs: {
              ...state.jobs,
              [assignmentId]: {
                ...state.jobs[assignmentId],
                status: 'failed',
                error: error.message,
              },
            },
          }))
        }
      },

      clearJob: (assignmentId: string) => {
        set((state) => {
          const newJobs = { ...state.jobs }
          delete newJobs[assignmentId]
          return { jobs: newJobs }
        })
      },
    }),
    {
      name: 'solver-storage',
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        claudeSessionKey: state.claudeSessionKey,
        jobs: state.jobs,
      }),
    }
  )
)
