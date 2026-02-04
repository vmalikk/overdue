// Gradescope integration types

export interface GradescopeConfig {
  connected: boolean
  email?: string
  lastSync?: Date
  tokenExpiry?: Date
}

export interface GradescopeConflict {
  id: string
  userId: string
  manualAssignmentId: string
  gradescopeTitle: string
  gradescopeDeadline: Date
  gradescopeCourseId: string
  gradescopeCourseName: string
  gradescopeData: string // JSON blob with full assignment data
  resolved: boolean
  resolution?: ConflictResolution
  createdAt: Date
  resolvedAt?: Date
}

export interface GradescopeAssignment {
  id: string
  title: string
  courseId: string
  courseName: string
  deadline: Date
  pointsPossible?: number
  submissionStatus?: 'submitted' | 'not_submitted' | 'late'
}

export interface GradescopeCourse {
  id: string
  name: string
  shortName: string
  term: string
}

export enum AssignmentSource {
  MANUAL = 'manual',
  GRADESCOPE = 'gradescope'
}

export enum ConflictResolution {
  KEEP_MANUAL = 'keep_manual',
  USE_GRADESCOPE = 'use_gradescope',
  KEEP_BOTH = 'keep_both'
}

// API request/response types
export interface ConnectRequest {
  email: string
  password: string
}

export interface ConnectResponse {
  success: boolean
  email?: string
  error?: string
}

export interface StatusResponse {
  connected: boolean
  email?: string
  lastSync?: string
  tokenExpiry?: string
}

export interface DisconnectResponse {
  success: boolean
  error?: string
}

// User preferences structure for Gradescope
export interface GradescopeUserPrefs {
  gradescopeConnected?: boolean
  gradescopeEmail?: string
  gradescopeSessionToken?: string // Encrypted
  gradescopeTokenExpiry?: string // ISO timestamp
  gradescopeLastSync?: string // ISO timestamp
}
