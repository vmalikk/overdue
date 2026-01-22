'use client'

import { useState, useEffect } from 'react'
import { format, isToday, isSameDay, startOfDay } from 'date-fns'
import {
  getWeekDates,
  getAssignmentsForDate,
  getEventsForDate,
  getTimeSlots,
  getEventPosition,
  WEEK_VIEW_START_HOUR,
  WEEK_VIEW_END_HOUR,
  CalendarEvent,
} from '@/lib/utils/calendarUtils'
import { Assignment } from '@/types/assignment'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface WeekViewProps {
  currentDate: Date
  assignments: Assignment[]
  events: CalendarEvent[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
}

export function WeekView({
  currentDate,
  assignments,
  events,
  selectedDate,
  onDateSelect,
}: WeekViewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const weekDates = getWeekDates(currentDate)
  const timeSlots = getTimeSlots()

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate current time position
  const now = currentTime
  const currentHour = now.getHours() + now.getMinutes() / 60
  const totalHours = WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1
  const currentTimePosition =
    currentHour >= WEEK_VIEW_START_HOUR && currentHour <= WEEK_VIEW_END_HOUR + 1
      ? ((currentHour - WEEK_VIEW_START_HOUR) / totalHours) * 100
      : null

  const borderColors: Record<string, string> = {
    red: 'border-l-status-red',
    yellow: 'border-l-status-yellow',
    green: 'border-l-status-green',
    gray: 'border-l-status-gray',
  }

  const bgColors: Record<string, string> = {
    red: 'bg-status-red/20',
    yellow: 'bg-status-yellow/20',
    green: 'bg-status-green/20',
    gray: 'bg-status-gray/20',
  }

  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border">
        <div className="py-3 text-center text-sm font-medium text-text-muted bg-background" />
        {weekDates.map((date) => (
          <div
            key={date.toISOString()}
            className={clsx(
              'py-3 text-center bg-background cursor-pointer hover:bg-accent/30 transition-colors',
              selectedDate && isSameDay(date, selectedDate) && 'bg-accent',
              isToday(date) && 'bg-priority-medium/20'
            )}
            onClick={() => onDateSelect(date)}
          >
            <div className="text-xs text-text-muted">{format(date, 'EEE')}</div>
            <div
              className={clsx(
                'text-lg font-medium mt-1',
                isToday(date)
                  ? 'text-priority-medium'
                  : 'text-text-primary'
              )}
            >
              {format(date, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative max-h-[600px] overflow-y-auto">
        <div className="grid grid-cols-8">
          {/* Time labels column */}
          <div className="border-r border-border">
            {timeSlots.map((slot, index) => (
              <div
                key={slot}
                className="h-16 border-b border-border px-2 py-1 text-xs text-text-muted"
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date) => {
            const dayAssignments = getAssignmentsForDate(assignments, date)
            const dayEvents = getEventsForDate(events, date)
            const isTodayColumn = isToday(date)

            return (
              <div
                key={date.toISOString()}
                className="relative border-r border-border last:border-r-0"
              >
                {/* Hour grid lines */}
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot}
                    className="h-16 border-b border-border"
                  />
                ))}

                {/* Current time indicator */}
                {isTodayColumn && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 border-t-2 border-status-red z-20"
                    style={{ top: `${currentTimePosition}%` }}
                  >
                    <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-status-red" />
                  </div>
                )}

                {/* Assignments */}
                {dayAssignments.map((assignment) => {
                  const deadline = new Date(assignment.deadline)
                  const endTime = new Date(deadline.getTime() + (assignment.estimatedHours || 1) * 60 * 60 * 1000)
                  const position = getEventPosition(deadline, endTime)
                  const status = calculateStatus(assignment)

                  return (
                    <div
                      key={assignment.id}
                      className={clsx(
                        'absolute left-1 right-1 rounded px-1.5 py-1 text-xs overflow-hidden cursor-pointer',
                        'border-l-2 z-10',
                        borderColors[status.color],
                        bgColors[status.color]
                      )}
                      style={{
                        top: `${position.top}%`,
                        height: `${Math.max(position.height, 4)}%`,
                      }}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="font-medium text-text-primary truncate">
                        {assignment.title}
                      </div>
                      <div className="text-text-muted">
                        {format(deadline, 'h:mm a')}
                      </div>
                    </div>
                  )
                })}

                {/* Calendar events */}
                {dayEvents.map((event) => {
                  const position = getEventPosition(new Date(event.start), new Date(event.end))

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded px-1.5 py-1 text-xs overflow-hidden cursor-pointer border-l-2 border-l-priority-low bg-priority-low/20 z-10"
                      style={{
                        top: `${position.top}%`,
                        height: `${Math.max(position.height, 4)}%`,
                      }}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="font-medium text-text-primary truncate">
                        {event.summary}
                      </div>
                      <div className="text-text-muted">
                        {format(new Date(event.start), 'h:mm a')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
