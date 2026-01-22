// Assignment status enum
export enum AssignmentStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

// Priority levels
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// Status indicator colors based on deadline proximity
export type StatusColor = 'red' | 'yellow' | 'green' | 'gray'

// Main Assignment interface
export interface Assignment {
  id: string                            // UUID
  title: string                          // Max 100 chars
  description?: string                   // Max 500 chars
  courseId: string                       // Reference to Course
  deadline: Date
  priority: Priority
  status: AssignmentStatus
  estimatedHours?: number
  tags?: string[]
  notes?: string

  // Metadata
  createdAt: Date
  updatedAt: Date
  completedAt?: Date

  // Calendar integration (Phase 2)
  googleCalendarEventId?: string
  calendarSynced?: boolean

  // AI features (Phase 3)
  aiParsed?: boolean
  aiConfidence?: number
  aiSuggestions?: string
}

// Status indicator data with color and metadata
export interface StatusIndicatorData {
  color: StatusColor
  daysUntilDue: number
  message: string
}

// Form data for creating/updating assignments
export interface AssignmentFormData {
  title: string
  description?: string
  courseId: string
  deadline: Date
  priority: Priority
  estimatedHours?: number
  tags?: string[]
  notes?: string
  // AI fields (Phase 3)
  aiParsed?: boolean
  aiConfidence?: number
}
