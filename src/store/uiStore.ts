import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

interface UIStore {
  // Modal state
  isQuickAddOpen: boolean
  isEditModalOpen: boolean
  editingAssignmentId?: string
  isCourseManagerOpen: boolean
  isSettingsOpen: boolean
  apiKey: string | null

  // Visual effects
  snowEnabled: boolean

  // Dev features
  devUnlocked: boolean

  // Toast state
  toasts: Toast[]

  // Loading state
  isLoading: boolean
  isSyncing: boolean

  // Actions - Modals
  openQuickAdd: () => void
  closeQuickAdd: () => void
  openEditModal: (assignmentId: string) => void
  closeEditModal: () => void
  openCourseManager: () => void
  closeCourseManager: () => void
  openSettings: () => void
  closeSettings: () => void
  setApiKey: (key: string | null) => void
  toggleSnow: () => void
  setDevUnlocked: (unlocked: boolean) => void

  // Actions - Toasts
  showToast: (message: string, type: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
  clearToasts: () => void

  // Actions - Loading
  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean) => void
}

import { persist, createJSONStorage } from 'zustand/middleware'

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial modal state
      isQuickAddOpen: false,
      isEditModalOpen: false,
      editingAssignmentId: undefined,
      isCourseManagerOpen: false,
      isSettingsOpen: false,
      apiKey: null,

      // Visual effects
      snowEnabled: false,

      // Dev features
      devUnlocked: false,

      // Initial toast state
      toasts: [],

      // Initial loading state
      isLoading: false,
      isSyncing: false,

      // Modal actions
      openQuickAdd: () => set({ isQuickAddOpen: true }),
      closeQuickAdd: () => set({ isQuickAddOpen: false }),

      openEditModal: (assignmentId: string) =>
        set({ isEditModalOpen: true, editingAssignmentId: assignmentId }),
      closeEditModal: () =>
        set({ isEditModalOpen: false, editingAssignmentId: undefined }),

      openCourseManager: () => set({ isCourseManagerOpen: true }),
      closeCourseManager: () => set({ isCourseManagerOpen: false }),

      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      setApiKey: (key) => set({ apiKey: key }),
      toggleSnow: () => set((state) => ({ snowEnabled: !state.snowEnabled })),
      setDevUnlocked: (unlocked) => set({ devUnlocked: unlocked }),

      // Toast actions
      showToast: (message: string, type: Toast['type'], duration = 5000) => {
        const toast: Toast = {
          id: uuidv4(),
          type,
          message,
          duration,
        }

        set((state) => ({
          toasts: [...state.toasts, toast],
        }))

        // Auto-remove toast after duration
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(toast.id)
          }, duration)
        }
      },

      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      },

      clearToasts: () => set({ toasts: [] }),

      // Loading actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ apiKey: state.apiKey, snowEnabled: state.snowEnabled, devUnlocked: state.devUnlocked }),
    }
  )
)
