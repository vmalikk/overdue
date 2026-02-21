import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { account } from '@/lib/appwrite/client'
import { useAssignmentStore } from '@/store/assignmentStore'

// Status labels from the solver server
export type SolverStatus =
  | 'queued'
  | 'downloading'
  | 'navigating'
  | 'prompting'
  | 'waiting_for_response'
  | 'compiling'
  | 'uploading_solution'
  | 'done'
  | 'error'

export interface SolveJob {
  assignmentId: string
  jobId?: string
  status: SolverStatus | 'submitting'
  solverMessage?: string        // human-readable status
  solutionFolder?: string
  texPath?: string
  pdfPath?: string
  preview?: string
  error?: string
  startedAt: number
}

// Map solver statuses to human-readable labels
const STATUS_LABELS: Record<string, string> = {
  submitting: 'Submitting job…',
  queued: 'Queued — waiting for solver…',
  downloading: 'Downloading assignment PDF…',
  navigating: 'Opening Claude…',
  prompting: 'Sending prompt to Claude…',
  waiting_for_response: 'Waiting for Claude\'s response…',
  compiling: 'Compiling LaTeX to PDF…',
  uploading_solution: 'Uploading solution to Nextcloud…',
  done: 'Solution ready!',
  error: 'Failed',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status
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

const POLL_INTERVAL = 10_000 // 10 seconds

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
          if (!res.ok) return
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
        // 1. Set initial "submitting" state
        set((state) => ({
          jobs: {
            ...state.jobs,
            [assignmentId]: {
              assignmentId,
              status: 'submitting',
              solverMessage: STATUS_LABELS.submitting,
              startedAt: Date.now(),
            },
          },
        }))

        try {
          // 2. Submit job to solver via our API proxy
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
                  status: 'error',
                  error: data.error || 'Failed to submit job',
                },
              },
            }))
            return
          }

          const jobId = data.jobId
          if (!jobId) {
            set((state) => ({
              jobs: {
                ...state.jobs,
                [assignmentId]: {
                  ...state.jobs[assignmentId],
                  status: 'error',
                  error: 'Solver did not return a job ID',
                },
              },
            }))
            return
          }

          // 3. Update with jobId, start polling
          set((state) => ({
            jobs: {
              ...state.jobs,
              [assignmentId]: {
                ...state.jobs[assignmentId],
                jobId,
                status: 'queued',
                solverMessage: STATUS_LABELS.queued,
              },
            },
          }))

          // 4. Poll until done or error
          const poll = async () => {
            while (true) {
              await new Promise((r) => setTimeout(r, POLL_INTERVAL))

              // Check if job was cleared by user
              const currentJob = get().jobs[assignmentId]
              if (!currentJob || !currentJob.jobId) return

              try {
                // Get fresh JWT for each poll (they expire)
                const { jwt: pollJwt } = await account.createJWT()
                const statusRes = await fetch(
                  `/api/ai/solve/status?jobId=${currentJob.jobId}`,
                  { headers: { Authorization: `Bearer ${pollJwt}` } }
                )

                if (!statusRes.ok) {
                  // Transient error, keep polling
                  continue
                }

                const statusData = await statusRes.json()

                if (statusData.status === 'done') {
                  set((state) => ({
                    jobs: {
                      ...state.jobs,
                      [assignmentId]: {
                        ...state.jobs[assignmentId],
                        status: 'done',
                        solverMessage: STATUS_LABELS.done,
                        solutionFolder: statusData.solutionFolder,
                        texPath: statusData.texPath,
                        pdfPath: statusData.pdfPath,
                        preview: statusData.preview,
                      },
                    },
                  }))

                  // Save the solved file path back to the assignment in the database
                  try {
                    const assignmentStore = useAssignmentStore.getState()
                    const existingAssignment = assignmentStore.assignments.find(a => a.id === assignmentId)
                    const existingFiles = existingAssignment?.nextcloudFiles || []
                    const newFiles = [...existingFiles]
                    // Add solution PDF if it doesn't already exist
                    if (statusData.pdfPath && !newFiles.some((f: { path: string }) => f.path === statusData.pdfPath)) {
                      newFiles.push({ name: 'solution.pdf', path: statusData.pdfPath })
                    }
                    // Add solution .tex if it doesn't already exist
                    if (statusData.texPath && !newFiles.some((f: { path: string }) => f.path === statusData.texPath)) {
                      newFiles.push({ name: 'solution.tex', path: statusData.texPath })
                    }
                    await assignmentStore.updateAssignment(assignmentId, {
                      solvedFilePath: statusData.pdfPath || statusData.texPath || statusData.solutionFolder,
                      nextcloudFiles: newFiles,
                    })
                  } catch (e) {
                    console.error('Failed to save solved file path to assignment:', e)
                  }
                  return
                }

                if (statusData.status === 'error') {
                  set((state) => ({
                    jobs: {
                      ...state.jobs,
                      [assignmentId]: {
                        ...state.jobs[assignmentId],
                        status: 'error',
                        error: statusData.error || 'Solver failed',
                      },
                    },
                  }))
                  return
                }

                // Still running — update the status message
                set((state) => ({
                  jobs: {
                    ...state.jobs,
                    [assignmentId]: {
                      ...state.jobs[assignmentId],
                      status: statusData.status,
                      solverMessage: STATUS_LABELS[statusData.status] || statusData.status,
                    },
                  },
                }))
              } catch {
                // Network error — keep polling, don't fail the job
              }
            }
          }

          // Fire polling in background (don't await)
          poll()
        } catch (error: any) {
          set((state) => ({
            jobs: {
              ...state.jobs,
              [assignmentId]: {
                ...state.jobs[assignmentId],
                status: 'error',
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
