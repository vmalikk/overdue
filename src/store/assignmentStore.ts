import { create } from 'zustand'
import { Assignment, AssignmentStatus, Priority, AssignmentFormData } from '@/types/assignment'
import * as db from '@/lib/appwrite/database'

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

    const assignmentData = {
      ...data,
      status: AssignmentStatus.NOT_STARTED,
    }

    try {
      const assignment = await db.addAssignment(assignmentData, userId)
      set((state) => ({
        assignments: [...state.assignments, assignment],
      }))
      get().applyFilters()
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
