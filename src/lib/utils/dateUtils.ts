import { format, formatDistance, formatRelative, isToday, isTomorrow, isThisWeek, startOfDay, endOfDay, addDays, subDays } from 'date-fns'

/**
 * Format date for assignment deadline display
 * Example: "Jan 25, 3:00 PM"
 */
export function formatDeadline(date: Date): string {
  return format(date, 'MMM d, h:mm a')
}

/**
 * Format date for header display
 * Example: "Wednesday, January 21, 2026 • 3:45 PM"
 */
export function formatHeaderDate(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy • h:mm a')
}

/**
 * Format relative time for tooltips
 * Example: "in 3 days"
 */
export function formatRelativeTime(date: Date): string {
  return formatDistance(date, new Date(), { addSuffix: true })
}

/**
 * Get human-readable date description
 * Example: "Today at 3:00 PM", "Tomorrow at 5:00 PM", "Friday at 2:00 PM"
 */
export function getReadableDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE \'at\' h:mm a')
  }
  return format(date, 'MMM d \'at\' h:mm a')
}

/**
 * Parse date from natural language (basic implementation)
 * This is used as a fallback when Gemini AI is unavailable
 */
export function parseNaturalDate(input: string): Date | null {
  const lowerInput = input.toLowerCase()
  const now = new Date()

  // Today
  if (lowerInput.includes('today')) {
    return endOfDay(now)
  }

  // Tomorrow
  if (lowerInput.includes('tomorrow')) {
    return endOfDay(addDays(now, 1))
  }

  // Day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < days.length; i++) {
    if (lowerInput.includes(days[i])) {
      const currentDay = now.getDay()
      const targetDay = i
      let daysToAdd = targetDay - currentDay
      if (daysToAdd <= 0) daysToAdd += 7 // Next occurrence
      return endOfDay(addDays(now, daysToAdd))
    }
  }

  // Try parsing as ISO date
  try {
    const parsed = new Date(input)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return null
}

/**
 * Get start and end of current week
 */
export function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = startOfDay(subDays(now, dayOfWeek))
  const end = endOfDay(addDays(start, 6))
  return { start, end }
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return startOfDay(date1).getTime() === startOfDay(date2).getTime()
}

/**
 * Format date for calendar display
 * Example: "Jan 25"
 */
export function formatCalendarDate(date: Date): string {
  return format(date, 'MMM d')
}

/**
 * Format time only
 * Example: "3:00 PM"
 */
export function formatTime(date: Date): string {
  return format(date, 'h:mm a')
}

/**
 * Get dates for calendar month view
 */
export function getCalendarDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = startOfDay(subDays(firstDay, firstDay.getDay()))
  const endDate = endOfDay(addDays(lastDay, 6 - lastDay.getDay()))

  const dates: Date[] = []
  let current = startDate
  while (current <= endDate) {
    dates.push(current)
    current = addDays(current, 1)
  }

  return dates
}
