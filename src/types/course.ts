// Course interface
export interface OfficeHour {
  day: string // e.g., "Monday", "Tuesday"
  startTime: string // e.g., "14:00"
  endTime: string // e.g., "15:00"
  location: string // e.g., "Room 301"
}

export interface GradeWeight {
  category: string // e.g., "Quizzes", "Final Exam"
  weight: number // Percentage, e.g., 20
}

export interface Course {
  id: string                    // UUID
  code: string                  // e.g., "ECE 306"
  name: string                  // e.g., "Embedded Systems"
  color: string                 // Hex color for badge (#3b82f6)
  instructor?: string           // Optional instructor name
  professorEmail?: string
  officeHours?: OfficeHour[]
  gradeWeights?: GradeWeight[]
  description?: string
  active: boolean               // Archive old courses
  createdAt: Date
}

// Form data for creating/updating courses
export interface CourseFormData {
  code: string
  name: string
  color: string
  instructor?: string
  professorEmail?: string
  officeHours?: OfficeHour[]
  gradeWeights?: GradeWeight[]
  description?: string
  active?: boolean
}

// Default course colors for selection
export const DEFAULT_COURSE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]
