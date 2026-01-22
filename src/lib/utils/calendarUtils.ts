import { format, startOfWeek, endOfWeek, addDays, startOfDay, endOfDay, isSameMonth, getWeek } from 'date-fns'
import { Assignment } from '@/types/assignment'

// Calendar event from Google Calendar (simplified for display)
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: Date
  end: Date
  isAllDay?: boolean
}

// Get week dates (Sunday to Saturday)
export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(start, i))
  }
  return dates
}

// Get month metadata
export interface MonthMetadata {
  startDate: Date
  endDate: Date
  totalDays: number
  startDayOfWeek: number
  year: number
  month: number
}

export function getMonthMetadata(year: number, month: number): MonthMetadata {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  return {
    startDate: firstDay,
    endDate: lastDay,
    totalDays: lastDay.getDate(),
    startDayOfWeek: firstDay.getDay(),
    year,
    month,
  }
}

// Group items by date
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  items.forEach(item => {
    const dateKey = format(getDate(item), 'yyyy-MM-dd')
    const existing = grouped.get(dateKey) || []
    grouped.set(dateKey, [...existing, item])
  })

  return grouped
}

// Check if date is weekend
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

// Get week number
export function getWeekNumber(date: Date): number {
  return getWeek(date, { weekStartsOn: 0 })
}

// Get visible date range for calendar view
export function getVisibleDateRange(
  currentDate: Date,
  view: 'month' | 'week'
): { start: Date; end: Date } {
  if (view === 'week') {
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 }),
    }
  }

  // Month view - include days from adjacent months that are visible
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start from the Sunday of the week containing the 1st
  const start = startOfWeek(firstDay, { weekStartsOn: 0 })
  // End on the Saturday of the week containing the last day
  const end = endOfWeek(lastDay, { weekStartsOn: 0 })

  return { start: startOfDay(start), end: endOfDay(end) }
}

// Format month header
export function formatMonthHeader(date: Date): string {
  return format(date, 'MMMM yyyy')
}

// Format week header range
export function formatWeekHeader(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  const end = endOfWeek(date, { weekStartsOn: 0 })

  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`
  }
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

// Check if a date is in the current month
export function isCurrentMonth(date: Date, referenceDate: Date): boolean {
  return isSameMonth(date, referenceDate)
}

// Time slots for week view (6 AM to 11 PM)
export const WEEK_VIEW_START_HOUR = 6
export const WEEK_VIEW_END_HOUR = 23

export function getTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = WEEK_VIEW_START_HOUR; hour <= WEEK_VIEW_END_HOUR; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    slots.push(`${displayHour} ${period}`)
  }
  return slots
}

// Get position for an event in week view (as percentage of day height)
export function getEventPosition(
  start: Date,
  end: Date
): { top: number; height: number } {
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60

  const totalHours = WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1
  const top = ((startHour - WEEK_VIEW_START_HOUR) / totalHours) * 100
  const height = ((endHour - startHour) / totalHours) * 100

  return {
    top: Math.max(0, Math.min(100, top)),
    height: Math.max(2, Math.min(100 - top, height)), // Minimum 2% height for visibility
  }
}

// Get assignments for a specific date
export function getAssignmentsForDate(
  assignments: Assignment[],
  date: Date
): Assignment[] {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  return assignments.filter(a => {
    const deadline = new Date(a.deadline)
    return deadline >= dayStart && deadline <= dayEnd
  })
}

// Get events for a specific date
export function getEventsForDate(
  events: CalendarEvent[],
  date: Date
): CalendarEvent[] {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)

  return events.filter(e => {
    const start = new Date(e.start)
    const end = new Date(e.end)
    // Event overlaps with this day
    return start <= dayEnd && end >= dayStart
  })
}

// Day names for calendar header
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
