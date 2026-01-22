'use client'

import { format, isSameDay } from 'date-fns'
import { getCalendarDates } from '@/lib/utils/dateUtils'
import { getAssignmentsForDate, getEventsForDate, DAY_NAMES, CalendarEvent } from '@/lib/utils/calendarUtils'
import { Assignment } from '@/types/assignment'
import { DayCell } from './DayCell'

interface MonthViewProps {
  year: number
  month: number
  assignments: Assignment[]
  events: CalendarEvent[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
}

export function MonthView({
  year,
  month,
  assignments,
  events,
  selectedDate,
  onDateSelect,
}: MonthViewProps) {
  const dates = getCalendarDates(year, month)
  const referenceDate = new Date(year, month, 1)

  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-text-muted bg-background"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {dates.map((date, index) => {
          const dayAssignments = getAssignmentsForDate(assignments, date)
          const dayEvents = getEventsForDate(events, date)
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false

          return (
            <DayCell
              key={index}
              date={date}
              referenceDate={referenceDate}
              isSelected={isSelected}
              assignments={dayAssignments}
              events={dayEvents}
              onClick={() => onDateSelect(date)}
            />
          )
        })}
      </div>
    </div>
  )
}
