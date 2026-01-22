import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { Course, CourseFormData } from '@/types/course'
import * as db from '@/lib/db/indexedDB'
import { DEFAULTS } from '@/config/constants'

interface CourseStore {
  // State
  courses: Course[]
  activeCourses: Course[]
  isLoading: boolean

  // Actions
  loadCourses: () => Promise<void>
  addCourse: (data: CourseFormData) => Promise<Course>
  updateCourse: (id: string, updates: Partial<Course>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  archiveCourse: (id: string) => Promise<void>
  unarchiveCourse: (id: string) => Promise<void>
  getCourseById: (id: string) => Course | undefined
  getCourseByCode: (code: string) => Course | undefined
  refreshCourses: () => Promise<void>
}

export const useCourseStore = create<CourseStore>((set, get) => ({
  // Initial state
  courses: [],
  activeCourses: [],
  isLoading: false,

  // Load all courses from IndexedDB
  loadCourses: async () => {
    set({ isLoading: true })
    try {
      const courses = await db.getAllCourses()
      const activeCourses = courses.filter((c) => c.active)
      set({ courses, activeCourses })
    } catch (error) {
      console.error('Failed to load courses:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Add new course
  addCourse: async (data: CourseFormData) => {
    const course: Course = {
      id: uuidv4(),
      code: data.code,
      name: data.name,
      color: data.color || DEFAULTS.COURSE_COLOR,
      instructor: data.instructor,
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date(),
    }

    try {
      await db.addCourse(course)
      set((state) => ({
        courses: [...state.courses, course],
        activeCourses: course.active
          ? [...state.activeCourses, course]
          : state.activeCourses,
      }))
      return course
    } catch (error) {
      console.error('Failed to add course:', error)
      throw error
    }
  },

  // Update existing course
  updateCourse: async (id: string, updates: Partial<Course>) => {
    try {
      await db.updateCourse(id, updates)
      set((state) => {
        const updatedCourses = state.courses.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        )
        const activeCourses = updatedCourses.filter((c) => c.active)
        return { courses: updatedCourses, activeCourses }
      })
    } catch (error) {
      console.error('Failed to update course:', error)
      throw error
    }
  },

  // Delete course
  deleteCourse: async (id: string) => {
    try {
      await db.deleteCourse(id)
      set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        activeCourses: state.activeCourses.filter((c) => c.id !== id),
      }))
    } catch (error) {
      console.error('Failed to delete course:', error)
      throw error
    }
  },

  // Archive course (set active = false)
  archiveCourse: async (id: string) => {
    try {
      await get().updateCourse(id, { active: false })
    } catch (error) {
      console.error('Failed to archive course:', error)
      throw error
    }
  },

  // Unarchive course (set active = true)
  unarchiveCourse: async (id: string) => {
    try {
      await get().updateCourse(id, { active: true })
    } catch (error) {
      console.error('Failed to unarchive course:', error)
      throw error
    }
  },

  // Get course by ID
  getCourseById: (id: string) => {
    return get().courses.find((c) => c.id === id)
  },

  // Get course by code
  getCourseByCode: (code: string) => {
    return get().courses.find((c) => c.code === code)
  },

  // Refresh courses from database
  refreshCourses: async () => {
    await get().loadCourses()
  },
}))
