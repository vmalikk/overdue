import { Priority } from './assignment'

// Parsed assignment data from AI
export interface ParsedAssignment {
  title: string
  courseCode?: string
  deadline?: Date
  priority?: Priority
  estimatedHours?: number
  description?: string
}

// Natural language parsing result from Gemini
export interface NLPParseResult {
  success: boolean
  parsed: ParsedAssignment
  confidence: number                 // 0-1, how confident the AI is
  warnings: string[]
  originalInput: string
}

// AI suggestion types
export enum AISuggestionType {
  DEADLINE = 'deadline',
  STUDY_TIP = 'studyTip',
  WORKLOAD = 'workload',
  TIME_ESTIMATE = 'timeEstimate',
}

// AI suggestion interface
export interface AISuggestion {
  id: string
  type: AISuggestionType
  content: string
  metadata?: Record<string, unknown>
  createdAt: Date
  expiresAt?: Date
}

// Study tips response from Gemini
export interface StudyTipsResponse {
  tips: string[]
  suggestedSchedule: Array<{
    date: Date
    task: string
  }>
  resourceSuggestions: string[]
  warningLevel: 'low' | 'medium' | 'high'
  generatedAt: Date
}

// Deadline suggestion from Gemini
export interface DeadlineSuggestion {
  suggestedStartDate: Date
  suggestedInternalDeadline: Date
  reasoning: string
  workloadLevel: 'light' | 'moderate' | 'heavy'
  conflictingAssignments: string[]
}

// Workload analysis result
export interface WorkloadAnalysis {
  weeklyWorkload: Array<{
    weekStart: Date
    assignmentCount: number
    totalEstimatedHours: number
    intensity: 'low' | 'moderate' | 'high' | 'extreme'
    majorDeadlines: string[]
  }>
  alerts: Array<{
    type: 'overload' | 'gap' | 'conflict'
    week: Date
    message: string
    suggestions: string[]
  }>
  overallBalance: 'good' | 'manageable' | 'concerning'
}

// Gemini API cache entry
export interface GeminiCacheEntry {
  key: string
  response: unknown
  timestamp: Date
  expiresAt: Date
  type: 'parse' | 'tips' | 'suggestion' | 'workload'
}

// Rate limit state
export interface RateLimitState {
  requestCount: number
  lastReset: Date
  isLimited: boolean
}

// Parsed syllabus data from Gemini
export interface ParsedSyllabus {
  courseCode?: string
  courseName?: string
  instructor?: string
  professorEmail?: string
  officeHours?: Array<{
    day: string
    startTime: string
    endTime: string
    location: string
  }>
  gradeWeights?: Array<{
    category: string
    weight: number
  }>
  description?: string
  assignments?: Array<{
     title: string
     date: string
     type: 'exam' | 'quiz' | 'assignment' | 'project' | 'other'
     weight?: number
  }>
}
