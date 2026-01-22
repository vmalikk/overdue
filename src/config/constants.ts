// App-wide constants

// Character limits
export const LIMITS = {
  ASSIGNMENT_TITLE_MAX: 100,
  ASSIGNMENT_DESCRIPTION_MAX: 500,
  COURSE_CODE_MAX: 20,
  COURSE_NAME_MAX: 100,
}

// Pagination
export const PAGINATION = {
  ASSIGNMENTS_PER_PAGE: 20,
  ASSIGNMENTS_VIRTUAL_SCROLL_THRESHOLD: 100,
}

// Search and filter
export const SEARCH = {
  DEBOUNCE_MS: 300,
}

// Calendar sync
export const CALENDAR_SYNC = {
  AUTO_SYNC_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
  DEFAULT_EVENT_DURATION_HOURS: 1,
}

// AI / Gemini API
export const GEMINI = {
  MODEL: 'gemini-2.0-flash-exp',
  RATE_LIMIT_REQUESTS_PER_MINUTE: 15,
  RATE_LIMIT_REQUESTS_PER_DAY: 1500,
  CACHE_TTL: {
    PARSE: 0, // No cache for parsing (always fresh)
    STUDY_TIPS: 24 * 60 * 60 * 1000, // 24 hours
    SUGGESTIONS: 60 * 60 * 1000, // 1 hour
    WORKLOAD: 6 * 60 * 60 * 1000, // 6 hours
  },
  CONFIDENCE_THRESHOLD: 0.6, // Min confidence to auto-accept
}

// IndexedDB
export const DB = {
  NAME: 'AssignmentTrackerDB',
  VERSION: 1,
  STORES: {
    ASSIGNMENTS: 'assignments',
    COURSES: 'courses',
    AI_CACHE: 'aiCache',
    SETTINGS: 'settings',
    SYNC_QUEUE: 'syncQueue',
  },
}

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  NEW_ASSIGNMENT: 'ctrl+n', // or cmd+n on Mac
  SEARCH: 'ctrl+k', // or cmd+k on Mac
  SAVE: 'ctrl+s', // or cmd+s on Mac
  ESCAPE: 'escape',
}

// Notification timing
export const NOTIFICATIONS = {
  DEADLINE_24H_BEFORE_MS: 24 * 60 * 60 * 1000,
  DEADLINE_2H_BEFORE_MS: 2 * 60 * 60 * 1000,
  OVERDUE_DAILY_TIME: '09:00', // 9 AM
}

// Default values
export const DEFAULTS = {
  ASSIGNMENT_PRIORITY: 'medium' as const,
  ASSIGNMENT_TIME: '23:59', // 11:59 PM
  COURSE_COLOR: '#3b82f6', // Blue
}
