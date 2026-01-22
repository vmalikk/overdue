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

  // Actions - Toasts
  showToast: (message: string, type: Toast['type'], duration?: number) => void
  removeToast: (id: string) => void
  clearToasts: () => void

  // Actions - Loading
  setLoading: (loading: boolean) => void
  setSyncing: (syncing: boolean) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial modal state
  isQuickAddOpen: false,
  isEditModalOpen: false,
  editingAssignmentId: undefined,
  isCourseManagerOpen: false,
  isSettingsOpen: false,

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
}))
