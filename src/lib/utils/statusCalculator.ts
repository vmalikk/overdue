import { Assignment, AssignmentStatus, StatusColor, StatusIndicatorData } from '@/types/assignment'

/**
 * Calculate the status color for an assignment based on deadline proximity
 *
 * Color rules:
 * - Red: Due within 48 hours (0-2 days) OR overdue
 * - Yellow: Due in 3-5 days
 * - Green: Due in 6-7 days
 * - Gray: Completed OR due after 7 days
 */
export function calculateStatus(assignment: Assignment): StatusIndicatorData {
  // Gray: Completed assignments
  if (assignment.status === AssignmentStatus.COMPLETED) {
    return {
      color: 'gray',
      daysUntilDue: 0,
      message: 'Completed'
    }
  }

  const now = new Date()
  const deadline = new Date(assignment.deadline)

  // Calculate days until due (ceiling to count partial days as full days)
  const timeDiff = deadline.getTime() - now.getTime()
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

  // Red: Overdue
  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    return {
      color: 'red',
      daysUntilDue,
      message: `${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue`
    }
  }

  // Red: Due within 2 days
  if (daysUntilDue <= 2) {
    if (daysUntilDue === 0) {
      return {
        color: 'red',
        daysUntilDue,
        message: 'Due today!'
      }
    }
    return {
      color: 'red',
      daysUntilDue,
      message: `Due in ${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'}`
    }
  }

  // Yellow: Due in 3-5 days
  if (daysUntilDue <= 5) {
    return {
      color: 'yellow',
      daysUntilDue,
      message: `Due in ${daysUntilDue} days`
    }
  }

  // Green: Due in 6-7 days
  if (daysUntilDue <= 7) {
    return {
      color: 'green',
      daysUntilDue,
      message: `Due in ${daysUntilDue} days`
    }
  }

  // Gray: Due after 7 days
  return {
    color: 'gray',
    daysUntilDue,
    message: `Due in ${daysUntilDue} days`
  }
}

/**
 * Get Tailwind CSS color class for status indicator dot
 */
export function getStatusColorClass(color: StatusColor): string {
  const colorMap: Record<StatusColor, string> = {
    red: 'bg-status-red',
    yellow: 'bg-status-yellow',
    green: 'bg-status-green',
    gray: 'bg-status-gray',
  }
  return colorMap[color]
}

/**
 * Check if assignment is overdue
 */
export function isOverdue(assignment: Assignment): boolean {
  if (assignment.status === AssignmentStatus.COMPLETED) {
    return false
  }
  const now = new Date()
  const deadline = new Date(assignment.deadline)
  return deadline < now
}

/**
 * Check if assignment is due soon (within 48 hours)
 */
export function isDueSoon(assignment: Assignment): boolean {
  if (assignment.status === AssignmentStatus.COMPLETED) {
    return false
  }
  const status = calculateStatus(assignment)
  return status.color === 'red' && status.daysUntilDue >= 0
}
