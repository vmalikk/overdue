import { create } from 'zustand'
import { Assignment, AssignmentStatus, Priority, AssignmentFormData } from '@/types/assignment'
import * as db from '@/lib/appwrite/database'
import { uploadFile } from '@/lib/appwrite/storage'
import { useCalendarStore } from './calendarStore'

interface AssignmentStore {
  // State
  assignments: Assignment[]
  filteredAssignments: Assignment[]
  searchQuery: string
  filterStatus?: AssignmentStatus
  filterCourseId?: string
  filterDateRange?: { start: Date; end: Date }
  sortBy: 'deadline' | 'priority' | 'createdAt' | 'title'
  sortOrder: 'asc' | 'desc'
  isLoading: boolean
  userId: string | null

  // Actions
  setUserId: (userId: string | null) => void
  loadAssignments: () => Promise<void>
  addAssignment: (data: AssignmentFormData) => Promise<Assignment>
  updateAssignment: (id: string, updates: Partial<Assignment>) => Promise<void>
  deleteAssignment: (id: string) => Promise<void>
  completeAssignment: (id: string) => Promise<void>
  uncompleteAssignment: (id: string) => Promise<void>

  // Filtering and search
  setSearchQuery: (query: string) => void
  setFilterStatus: (status?: AssignmentStatus) => void
  setFilterCourseId: (courseId?: string) => void
  setFilterDateRange: (range?: { start: Date; end: Date }) => void
  setSortBy: (sortBy: 'deadline' | 'priority' | 'createdAt' | 'title') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  applyFilters: () => void

  // Bulk operations
  deleteCompleted: () => Promise<void>
  refreshAssignments: () => Promise<void>
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  // Initial state
  assignments: [],
  filteredAssignments: [],
  searchQuery: '',
  filterStatus: undefined,
  filterCourseId: undefined,
  filterDateRange: undefined,
  sortBy: 'deadline',
  sortOrder: 'asc',
  isLoading: false,
  userId: null,

  // Set user ID
  setUserId: (userId: string | null) => {
    set({ userId })
  },

  // Load all assignments from Appwrite
  loadAssignments: async () => {
    const { userId } = get()
    if (!userId) return

    set({ isLoading: true })
    try {
      const assignments = await db.getAllAssignments(userId)
      set({ assignments })
      get().applyFilters()

      // Auto-sync check (Daily)
      const { config, setLastSync } = useCalendarStore.getState()
      if (config.connected && config.autoSync) {
        const lastSync = config.lastSync ? new Date(config.lastSync) : null
        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000

        if (!lastSync || (now.getTime() - lastSync.getTime() > oneDay)) {
          fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignments,
              calendarId: config.calendarId || 'primary',
              direction: 'both'
            })
          }).then(res => {
            if (res.ok) {
              setLastSync(new Date())
              console.log('Daily auto-sync completed')
            }
          }).catch(e => console.error('Auto-sync failed', e))
        }
      }
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Add new assignment
  addAssignment: async (data: AssignmentFormData) => {
    const { userId } = get()
    if (!userId) throw new Error('User not authenticated')

    let attachmentData = {}
    if (data.file) {
      try {
        const result = await uploadFile(data.file)
        attachmentData = {
          attachmentFileId: result.fileId,
          attachmentFileName: result.fileName
        }
      } catch (error) {
        console.error('Failed to upload file:', error)
        // Continue without file or throw? The user might prefer it fails.
        // For now, let's log and maybe toast or just fall through if not critical?
        // Let's assume critical for now as they explicitly added it.
        throw error
      }
    }

    const assignmentData = {
      ...data,
      ...attachmentData,
      status: AssignmentStatus.NOT_STARTED,
    }
    // Remove the file object as it's not part of the Assignment type we send to DB
    if ('file' in assignmentData) {
      delete (assignmentData as any).file
    }

    try {
      const assignment = await db.addAssignment(assignmentData, userId)
      set((state) => ({
        assignments: [...state.assignments, assignment],
      }))
      get().applyFilters()

      // Instant Sync (Push to Calendar)
      const { config } = useCalendarStore.getState()
      if (config.connected) {
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignments: [assignment],
            calendarId: config.calendarId || 'primary',
            direction: 'export'
          })
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            if (data.results?.exportedEvents?.length > 0) {
              const mapping = data.results.exportedEvents.find((m: any) => m.assignmentId === assignment.id)
              if (mapping) {
                try {
                  // Use server update to persist googleCalendarEventId
                  await db.updateAssignment(assignment.id, {
                    googleCalendarEventId: mapping.googleCalendarEventId,
                    calendarSynced: true
                  })
                  // Update local state
                  set(state => ({
                    assignments: state.assignments.map(a =>
                      a.id === assignment.id
                        ? { ...a, googleCalendarEventId: mapping.googleCalendarEventId, calendarSynced: true }
                        : a
                    )
                  }))
                  get().applyFilters()
                } catch (err) {
                  console.error('Failed to update assignment with Google ID', err)
                }
              }
            }
          }
        }).catch(err => console.error('Instant sync failed', err))
      }

      return assignment
    } catch (error) {
      console.error('Failed to add assignment:', error)
      throw error
    }
  },

  // Update existing assignment
  updateAssignment: async (id: string, updates: Partial<Assignment>) => {
    try {
      await db.updateAssignment(id, updates)
      set((state) => ({
        assignments: state.assignments.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
        ),
      }))
      get().applyFilters()

      // Instant Sync (Update)
      const { config } = useCalendarStore.getState()
      if (config.connected) {
        const updatedAssignment = get().assignments.find(a => a.id === id)
        if (updatedAssignment) {
          fetch('/api/calendar/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignments: [updatedAssignment],
              calendarId: config.calendarId || 'primary',
              direction: 'export'
            })
          }).catch(err => console.error('Instant sync update failed', err))
        }
      }
    } catch (error) {
      console.error('Failed to update assignment:', error)
      throw error
    }
  },

  // Delete assignment
  deleteAssignment: async (id: string) => {
    try {
      await db.deleteAssignment(id)
      set((state) => ({
        assignments: state.assignments.filter((a) => a.id !== id),
      }))
      get().applyFilters()
    } catch (error) {
      console.error('Failed to delete assignment:', error)
      throw error
    }
  },

  // Mark assignment as completed
  completeAssignment: async (id: string) => {
    try {
      const updates = {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date(),
      }
      await get().updateAssignment(id, updates)
    } catch (error) {
      console.error('Failed to complete assignment:', error)
      throw error
    }
  },

  // Mark assignment as not completed
  uncompleteAssignment: async (id: string) => {
    try {
      const updates = {
        status: AssignmentStatus.NOT_STARTED,
        completedAt: undefined,
      }
      await get().updateAssignment(id, updates)
    } catch (error) {
      console.error('Failed to uncomplete assignment:', error)
      throw error
    }
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
    get().applyFilters()
  },

  // Set status filter
  setFilterStatus: (status?: AssignmentStatus) => {
    set({ filterStatus: status })
    get().applyFilters()
  },

  // Set course filter
  setFilterCourseId: (courseId?: string) => {
    set({ filterCourseId: courseId })
    get().applyFilters()
  },

  // Set date range filter
  setFilterDateRange: (range?: { start: Date; end: Date }) => {
    set({ filterDateRange: range })
    get().applyFilters()
  },

  // Set sort field
  setSortBy: (sortBy: 'deadline' | 'priority' | 'createdAt' | 'title') => {
    set({ sortBy })
    get().applyFilters()
  },

  // Set sort order
  setSortOrder: (order: 'asc' | 'desc') => {
    set({ sortOrder: order })
    get().applyFilters()
  },

  // Apply all filters and sorting
  applyFilters: () => {
    const {
      assignments,
      searchQuery,
      filterStatus,
      filterCourseId,
      filterDateRange,
      sortBy,
      sortOrder,
    } = get()

    let filtered = [...assignments]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.notes?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter((a) => a.status === filterStatus)
    }

    // Apply course filter
    if (filterCourseId) {
      filtered = filtered.filter((a) => a.courseId === filterCourseId)
    }

    // Apply date range filter
    if (filterDateRange) {
      filtered = filtered.filter((a) => {
        const deadline = new Date(a.deadline)
        return (
          deadline >= filterDateRange.start && deadline <= filterDateRange.end
        )
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    set({ filteredAssignments: filtered })
  },

  // Delete all completed assignments
  deleteCompleted: async () => {
    const { assignments, userId } = get()
    if (!userId) return

    const completed = assignments.filter((a) => a.status === AssignmentStatus.COMPLETED)

    try {
      for (const assignment of completed) {
        await db.deleteAssignment(assignment.id)
      }
      await get().loadAssignments()
    } catch (error) {
      console.error('Failed to delete completed assignments:', error)
      throw error
    }
  },

  // Refresh assignments from database
  refreshAssignments: async () => {
    await get().loadAssignments()
  },
}))
