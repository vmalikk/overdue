import { Assignment, AssignmentStatus, AssignmentCategory } from '@/types/assignment'
import { Course } from '@/types/course'
import { startOfDay, endOfDay, subDays, addDays, format, isAfter, isBefore, isSameDay } from 'date-fns'

// Completion rate metrics
export interface CompletionMetrics {
  total: number
  completed: number
  rate: number
  onTime: number
  late: number
}

export function calculateCompletionRate(assignments: Assignment[]): CompletionMetrics {
  const validAssignments = assignments.filter(a => a.category !== AssignmentCategory.EVENT)
  const total = validAssignments.length
  const completed = validAssignments.filter(a => a.status === AssignmentStatus.COMPLETED).length

  // Calculate on-time vs late completions
  let onTime = 0
  let late = 0

  assignments.forEach(a => {
    if (a.status === AssignmentStatus.COMPLETED && a.completedAt) {
      const completedDate = new Date(a.completedAt)
      const deadline = new Date(a.deadline)
      if (completedDate <= deadline) {
        onTime++
      } else {
        late++
      }
    }
  })

  return {
    total,
    completed,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    onTime,
    late,
  }
}

// Status distribution
export interface StatusDistribution {
  notStarted: number
  inProgress: number
  completed: number
}

export function getStatusDistribution(assignments: Assignment[]): StatusDistribution {
  const validAssignments = assignments.filter(a => a.category !== AssignmentCategory.EVENT)
  return {
    notStarted: validAssignments.filter(a => a.status === AssignmentStatus.NOT_STARTED).length,
    inProgress: validAssignments.filter(a => a.status === AssignmentStatus.IN_PROGRESS).length,
    completed: validAssignments.filter(a => a.status === AssignmentStatus.COMPLETED).length,
  }
}



// Course workload
export interface CourseWorkloadItem {
  courseId: string
  courseCode: string
  courseName: string
  courseColor: string
  total: number
  completed: number
  pending: number
}

export function getCourseWorkload(assignments: Assignment[], courses: Course[]): CourseWorkloadItem[] {
  const courseMap = new Map(courses.map(c => [c.id, c]))
  const workloadMap = new Map<string, CourseWorkloadItem>()

  assignments.filter(a => a.category !== AssignmentCategory.EVENT).forEach(a => {
    const course = courseMap.get(a.courseId)
    if (!course) return

    const existing = workloadMap.get(a.courseId)
    if (existing) {
      existing.total++
      if (a.status === AssignmentStatus.COMPLETED) {
        existing.completed++
      } else {
        existing.pending++
      }
    } else {
      workloadMap.set(a.courseId, {
        courseId: a.courseId,
        courseCode: course.code,
        courseName: course.name,
        courseColor: course.color,
        total: 1,
        completed: a.status === AssignmentStatus.COMPLETED ? 1 : 0,
        pending: a.status !== AssignmentStatus.COMPLETED ? 1 : 0,
      })
    }
  })

  return Array.from(workloadMap.values()).sort((a, b) => b.total - a.total)
}

// Deadline trends
export interface TrendDataPoint {
  date: string
  label: string
  due: number
  completed: number
}

export function getDeadlineTrends(
  allAssignments: Assignment[],
  period: 'week' | 'month'
): TrendDataPoint[] {
  const assignments = allAssignments.filter(a => a.category !== AssignmentCategory.EVENT)
  const now = new Date()
  const daysToShow = period === 'week' ? 7 : 30
  const trends: TrendDataPoint[] = []

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = subDays(now, i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const dueOnDay = assignments.filter(a => {
      const deadline = new Date(a.deadline)
      return deadline >= dayStart && deadline <= dayEnd
    }).length

    const completedOnDay = assignments.filter(a => {
      if (!a.completedAt) return false
      const completedDate = new Date(a.completedAt)
      return completedDate >= dayStart && completedDate <= dayEnd
    }).length

    trends.push({
      date: format(date, 'yyyy-MM-dd'),
      label: period === 'week' ? format(date, 'EEE') : format(date, 'MMM d'),
      due: dueOnDay,
      completed: completedOnDay,
    })
  }

  return trends
}

// Streak tracking
export interface StreakData {
  current: number
  longest: number
  lastCompletedDate: Date | null
}

export function calculateStreak(assignments: Assignment[]): StreakData {
  const completedAssignments = assignments
    .filter(a => a.category !== AssignmentCategory.EVENT)
    .filter(a => a.status === AssignmentStatus.COMPLETED && a.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

  if (completedAssignments.length === 0) {
    return { current: 0, longest: 0, lastCompletedDate: null }
  }

  // Get unique completion dates
  const completionDates = new Set<string>()
  completedAssignments.forEach(a => {
    completionDates.add(format(new Date(a.completedAt!), 'yyyy-MM-dd'))
  })

  const sortedDates = Array.from(completionDates).sort().reverse()
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  // Calculate current streak
  let current = 0
  const startCheck = sortedDates[0] === today || sortedDates[0] === yesterday

  if (startCheck) {
    let checkDate = sortedDates[0] === today ? new Date() : subDays(new Date(), 1)
    for (const dateStr of sortedDates) {
      if (format(checkDate, 'yyyy-MM-dd') === dateStr) {
        current++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }
  }

  // Calculate longest streak
  let longest = 0
  let tempStreak = 1

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = new Date(sortedDates[i])
    const nextDate = new Date(sortedDates[i + 1])
    const diffDays = Math.round((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
    } else {
      longest = Math.max(longest, tempStreak)
      tempStreak = 1
    }
  }
  longest = Math.max(longest, tempStreak, current)

  return {
    current,
    longest,
    lastCompletedDate: completedAssignments[0] ? new Date(completedAssignments[0].completedAt!) : null,
  }
}

// Productivity insights
export interface ProductivityInsight {
  type: 'positive' | 'warning' | 'neutral'
  title: string
  message: string
  value?: string
}

export function getProductivityInsights(allAssignments: Assignment[]): ProductivityInsight[] {
  const assignments = allAssignments.filter(a => a.category !== AssignmentCategory.EVENT)
  const insights: ProductivityInsight[] = []
  const now = new Date()

  // Overdue count
  const overdue = assignments.filter(a => {
    const deadline = new Date(a.deadline)
    return a.status !== AssignmentStatus.COMPLETED && deadline < now
  })
  if (overdue.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Overdue',
      message: `${overdue.length} assignment${overdue.length > 1 ? 's' : ''} past deadline`,
      value: overdue.length.toString(),
    })
  } else {
    insights.push({
      type: 'positive',
      title: 'On Track',
      message: 'No overdue assignments',
    })
  }

  // Due this week
  const weekEnd = addDays(now, 7)
  const dueThisWeek = assignments.filter(a => {
    const deadline = new Date(a.deadline)
    return a.status !== AssignmentStatus.COMPLETED && deadline >= now && deadline <= weekEnd
  })
  insights.push({
    type: dueThisWeek.length > 5 ? 'warning' : 'neutral',
    title: 'This Week',
    message: `${dueThisWeek.length} assignment${dueThisWeek.length !== 1 ? 's' : ''} due`,
    value: dueThisWeek.length.toString(),
  })

  // Average completion time
  const completedWithTime = assignments.filter(a =>
    a.status === AssignmentStatus.COMPLETED && a.completedAt && a.createdAt
  )
  if (completedWithTime.length >= 3) {
    const avgDays = completedWithTime.reduce((sum, a) => {
      const created = new Date(a.createdAt)
      const completed = new Date(a.completedAt!)
      return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    }, 0) / completedWithTime.length

    insights.push({
      type: 'neutral',
      title: 'Avg Completion',
      message: `Tasks completed in ~${Math.round(avgDays)} days on average`,
      value: `${Math.round(avgDays)}d`,
    })
  }

  return insights.slice(0, 4) // Max 4 insights
}

// Quick stats for overview
export interface QuickStats {
  total: number
  completed: number
  overdue: number
  dueSoon: number // Due within 48 hours
  inProgress: number
}

export function getQuickStats(assignments: Assignment[]): QuickStats {
  const now = new Date()
  const soon = addDays(now, 2)

  // Exclude events
  const validAssignments = assignments.filter(a => a.category !== AssignmentCategory.EVENT)

  return {
    total: validAssignments.length,
    completed: validAssignments.filter(a => a.status === AssignmentStatus.COMPLETED).length,
    overdue: validAssignments.filter(a => {
      const deadline = new Date(a.deadline)
      return a.status !== AssignmentStatus.COMPLETED && deadline < now
    }).length,
    dueSoon: validAssignments.filter(a => {
      const deadline = new Date(a.deadline)
      return a.status !== AssignmentStatus.COMPLETED && deadline >= now && deadline <= soon
    }).length,
    inProgress: validAssignments.filter(a => a.status === AssignmentStatus.IN_PROGRESS).length,
  }
}
