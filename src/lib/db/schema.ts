import { DB } from '@/config/constants'

// Database configuration
export const DB_NAME = DB.NAME
export const DB_VERSION = DB.VERSION

// Object store names
export const STORES = DB.STORES

// Object store configurations with indexes
export const ASSIGNMENTS_STORE = {
  name: STORES.ASSIGNMENTS,
  keyPath: 'id',
  indexes: [
    { name: 'deadline', keyPath: 'deadline', unique: false },
    { name: 'courseId', keyPath: 'courseId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'priority', keyPath: 'priority', unique: false },
    { name: 'createdAt', keyPath: 'createdAt', unique: false },
    { name: 'completedAt', keyPath: 'completedAt', unique: false },
  ],
}

export const COURSES_STORE = {
  name: STORES.COURSES,
  keyPath: 'id',
  indexes: [
    { name: 'code', keyPath: 'code', unique: false },
    { name: 'active', keyPath: 'active', unique: false },
    { name: 'createdAt', keyPath: 'createdAt', unique: false },
  ],
}

export const AI_CACHE_STORE = {
  name: STORES.AI_CACHE,
  keyPath: 'key',
  indexes: [
    { name: 'type', keyPath: 'type', unique: false },
    { name: 'expiresAt', keyPath: 'expiresAt', unique: false },
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
  ],
}

export const SETTINGS_STORE = {
  name: STORES.SETTINGS,
  keyPath: 'key',
  indexes: [],
}

export const SYNC_QUEUE_STORE = {
  name: STORES.SYNC_QUEUE,
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'type', keyPath: 'type', unique: false },
  ],
}

// All object stores
export const ALL_STORES = [
  ASSIGNMENTS_STORE,
  COURSES_STORE,
  AI_CACHE_STORE,
  SETTINGS_STORE,
  SYNC_QUEUE_STORE,
]

// Initialize database schema
export function createStores(db: IDBDatabase): void {
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
}
