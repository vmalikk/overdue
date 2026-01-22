// Course interface
export interface Course {
  id: string                    // UUID
  code: string                  // e.g., "ECE 306"
  name: string                  // e.g., "Embedded Systems"
  color: string                 // Hex color for badge (#3b82f6)
  instructor?: string           // Optional instructor name
  active: boolean               // Archive old courses
  createdAt: Date
}

// Form data for creating/updating courses
export interface CourseFormData {
  code: string
  name: string
  color: string
  instructor?: string
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
