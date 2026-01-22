import { openDB, IDBPDatabase } from 'idb'
import { Assignment } from '@/types/assignment'
import { Course } from '@/types/course'
import { GeminiCacheEntry } from '@/types/ai'
import { DB_NAME, DB_VERSION, ALL_STORES } from './schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: IDBPDatabase<any> | null = null

// Initialize and get database connection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDB(): Promise<IDBPDatabase<any>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create all object stores
      ALL_STORES.forEach((storeConfig) => {
        if (!db.objectStoreNames.contains(storeConfig.name)) {
          const store = db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath,
          })

          // Create indexes
          storeConfig.indexes.forEach((index) => {
            store.createIndex(index.name, index.keyPath, { unique: index.unique })
          })
        }
      })
    },
  })

  return dbInstance
}

// === ASSIGNMENT CRUD OPERATIONS ===

export async function getAllAssignments(): Promise<Assignment[]> {
  const db = await getDB()
  return db.getAll('assignments')
}

export async function getAssignment(id: string): Promise<Assignment | undefined> {
  const db = await getDB()
  return db.get('assignments', id)
}

export async function addAssignment(assignment: Assignment): Promise<void> {
  const db = await getDB()
  await db.add('assignments', assignment)
}

export async function updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('assignments', id)
  if (!existing) {
    throw new Error(`Assignment with id ${id} not found`)
  }

  const updated: Assignment = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  }

  await db.put('assignments', updated)
}

export async function deleteAssignment(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('assignments', id)
}

export async function getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
  const db = await getDB()
  return db.getAllFromIndex('assignments', 'courseId', courseId)
}

export async function getAssignmentsByStatus(status: string): Promise<Assignment[]> {
  const db = await getDB()
  return db.getAllFromIndex('assignments', 'status', status)
}

export async function getAssignmentsByDateRange(start: Date, end: Date): Promise<Assignment[]> {
  const db = await getDB()
  const all = await db.getAll('assignments')

  return all.filter((assignment) => {
    const deadline = new Date(assignment.deadline)
    return deadline >= start && deadline <= end
  })
}

// === COURSE CRUD OPERATIONS ===

export async function getAllCourses(): Promise<Course[]> {
  const db = await getDB()
  return db.getAll('courses')
}

export async function getActiveCourses(): Promise<Course[]> {
  const db = await getDB()
  return db.getAllFromIndex('courses', 'active', true)
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const db = await getDB()
  return db.get('courses', id)
}

export async function addCourse(course: Course): Promise<void> {
  const db = await getDB()
  await db.add('courses', course)
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('courses', id)
  if (!existing) {
    throw new Error(`Course with id ${id} not found`)
  }

  const updated: Course = {
    ...existing,
    ...updates,
  }

  await db.put('courses', updated)
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('courses', id)
}

export async function getCourseByCode(code: string): Promise<Course | undefined> {
  const db = await getDB()
  const all = await db.getAllFromIndex('courses', 'code', code)
  return all[0]
}

// === AI CACHE OPERATIONS ===

export async function getAICacheEntry(key: string): Promise<GeminiCacheEntry | undefined> {
  const db = await getDB()
  const entry = await db.get('aiCache', key)

  // Check if entry is expired
  if (entry && entry.expiresAt < new Date()) {
    await db.delete('aiCache', key)
    return undefined
  }

  return entry
}

export async function setAICacheEntry(entry: GeminiCacheEntry): Promise<void> {
  const db = await getDB()
  await db.put('aiCache', entry)
}

export async function clearExpiredAICache(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('aiCache')
  const now = new Date()

  for (const entry of all) {
    if (entry.expiresAt < now) {
      await db.delete('aiCache', entry.key)
    }
  }
}

export async function clearAllAICache(): Promise<void> {
  const db = await getDB()
  await db.clear('aiCache')
}

// === SETTINGS OPERATIONS ===

export async function getSetting(key: string): Promise<unknown | undefined> {
  const db = await getDB()
  return db.get('settings', key)
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('settings', value, key)
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('settings', key)
}

// === SYNC QUEUE OPERATIONS ===

export async function addToSyncQueue(item: {
  id: string
  type: string
  data: unknown
  timestamp: Date
}): Promise<void> {
  const db = await getDB()
  await db.add('syncQueue', item)
}

export async function getSyncQueue(): Promise<Array<unknown>> {
  const db = await getDB()
  return db.getAll('syncQueue')
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('syncQueue')
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

// === UTILITY OPERATIONS ===

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await db.clear('assignments')
  await db.clear('courses')
  await db.clear('aiCache')
  await db.clear('settings')
  await db.clear('syncQueue')
}

export async function exportData(): Promise<string> {
  const assignments = await getAllAssignments()
  const courses = await getAllCourses()

  const data = {
    assignments,
    courses,
    exportedAt: new Date().toISOString(),
  }

  return JSON.stringify(data, null, 2)
}

export async function importData(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData)

  if (data.assignments && Array.isArray(data.assignments)) {
    for (const assignment of data.assignments) {
      await addAssignment(assignment)
    }
  }

  if (data.courses && Array.isArray(data.courses)) {
    for (const course of data.courses) {
      await addCourse(course)
    }
  }
}
