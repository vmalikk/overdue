import { format, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

export interface DeadlineInfo {
  primary: string
  secondary: string
  color: string
  cssVar: string
}

export function getDeadlineInfo(deadline: Date, isCompleted = false): DeadlineInfo {
  if (isCompleted) {
    return {
      primary: format(deadline, 'MMM d'),
      secondary: 'Completed',
      color: 'var(--text3)',
      cssVar: '--text3',
    }
  }

  const now = new Date()
  const diffSeconds = differenceInSeconds(deadline, now)
  const diffMinutes = differenceInMinutes(deadline, now)
  const diffHours = differenceInHours(deadline, now)
  const diffDays = differenceInDays(deadline, now)

  // Overdue
  if (diffSeconds < 0) {
    const absDays = Math.abs(diffDays)
    const absHours = Math.abs(diffHours)
    const absMinutes = Math.abs(diffMinutes)
    let secondary: string
    if (absDays >= 1) {
      secondary = `${absDays}d overdue`
    } else if (absHours >= 1) {
      secondary = `${absHours}h overdue`
    } else {
      secondary = `${absMinutes}m overdue`
    }
    return {
      primary: format(deadline, 'MMM d'),
      secondary,
      color: 'var(--red)',
      cssVar: '--red',
    }
  }

  // Within 24h
  if (diffHours < 24) {
    let secondary: string
    if (diffHours >= 1) {
      secondary = `In ${diffHours}h`
    } else if (diffMinutes >= 1) {
      secondary = `In ${diffMinutes}m`
    } else {
      secondary = 'Due now'
    }
    return {
      primary: format(deadline, 'h:mm a'),
      secondary,
      color: 'var(--yellow)',
      cssVar: '--yellow',
    }
  }

  // Within 7 days
  if (diffDays < 7) {
    return {
      primary: format(deadline, 'EEE, MMM d'),
      secondary: `In ${diffDays}d`,
      color: 'var(--yellow)',
      cssVar: '--yellow',
    }
  }

  // Later
  return {
    primary: format(deadline, 'MMM d'),
    secondary: `In ${diffDays}d`,
    color: 'var(--green)',
    cssVar: '--green',
  }
}

export function getStatusColor(deadline: Date, isCompleted: boolean): string {
  if (isCompleted) return 'var(--text3)'
  const now = new Date()
  const diffSeconds = differenceInSeconds(deadline, now)
  const diffHours = differenceInHours(deadline, now)
  const diffDays = differenceInDays(deadline, now)

  if (diffSeconds < 0) return 'var(--red)'
  if (diffHours < 24) return 'var(--yellow)'
  if (diffDays < 7) return 'var(--yellow)'
  return 'var(--green)'
}
