'use client'

import { useState, useEffect } from 'react'
import { format, isToday } from 'date-fns'
import { CalendarEvent } from '@/lib/utils/calendarUtils'
import { Assignment } from '@/types/assignment'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface DayViewProps {
  currentDate: Date
  assignments: Assignment[]
  events: CalendarEvent[]
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function DayView({
  currentDate,
  assignments,
  events,
}: DayViewProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const isTodayDate = isToday(currentDate)

  // Update current time every minute (client-side only)
  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate current time position
  const currentHour = currentTime ? currentTime.getHours() + currentTime.getMinutes() / 60 : 0
  const currentTimePosition = currentTime ? (currentHour / 24) * 100 : null

  // Get events for the current date
  const dayStart = new Date(currentDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(currentDate)
  dayEnd.setHours(23, 59, 59, 999)

  const dayEvents = events.filter(e => {
    const start = new Date(e.start)
    return start >= dayStart && start <= dayEnd && !e.isAllDay
  })

  const allDayEvents = events.filter(e => {
    const start = new Date(e.start)
    return start >= dayStart && start <= dayEnd && e.isAllDay
  })

  const dayAssignments = assignments.filter(a => {
    const deadline = new Date(a.deadline)
    return deadline >= dayStart && deadline <= dayEnd
  })

  // Calculate event position and height
  const getEventStyle = (start: Date, end: Date) => {
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const duration = endHour - startHour
    
    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${Math.max((duration / 24) * 100, 2)}%`,
    }
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex border-b border-border bg-background sticky top-0 z-30">
        <div className="w-16 flex-shrink-0 py-2 px-2 text-[10px] text-text-muted text-center border-r border-border">
          GMT-05
        </div>
        <div className="flex-1 py-2 text-center">
          <div className={clsx(
            'text-xs font-medium',
            isTodayDate ? 'text-blue-400' : 'text-text-muted'
          )}>
            {format(currentDate, 'EEEE').toUpperCase()}
          </div>
          <div className={clsx(
            'text-3xl font-normal mt-0.5',
            isTodayDate 
              ? 'bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto'
              : 'text-text-primary'
          )}>
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-border bg-background">
          <div className="w-16 flex-shrink-0 border-r border-border py-1 px-2 text-[10px] text-text-muted">
            All day
          </div>
          <div className="flex-1 p-1 space-y-0.5">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                className="text-xs bg-blue-500/80 text-white px-2 py-1 rounded"
              >
                {event.summary}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-[1440px]">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-border relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-[10px] text-text-muted"
                style={{ top: `${(hour / 24) * 100}%`, transform: 'translateY(-50%)' }}
              >
                {hour > 0 && formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Main column */}
          <div className="flex-1 relative">
            {/* Hour grid lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/50"
                style={{ top: `${(hour / 24) * 100}%`, height: `${100 / 24}%` }}
              />
            ))}

            {/* Current time indicator */}
            {isTodayDate && currentTime && currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition}%` }}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            )}

            {/* Calendar Events */}
            {dayEvents.map((event) => {
              const start = new Date(event.start)
              const end = new Date(event.end)
              const style = getEventStyle(start, end)

              return (
                <div
                  key={event.id}
                  className="absolute left-1 right-1 bg-blue-500/90 text-white rounded px-2 py-1 overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10"
                  style={style}
                >
                  <div className="text-sm font-medium">{event.summary}</div>
                  <div className="text-xs opacity-90">
                    {format(start, 'h:mma').toLowerCase()} – {format(end, 'h:mma').toLowerCase()}
                  </div>
                  {event.description && (
                    <div className="text-xs opacity-75 mt-1 truncate">{event.description}</div>
                  )}
                </div>
              )
            })}

            {/* Assignments */}
            {dayAssignments.map((assignment) => {
              const deadline = new Date(assignment.deadline)
              const endTime = new Date(deadline.getTime() + 60 * 60 * 1000)
              const style = getEventStyle(deadline, endTime)
              const status = calculateStatus(assignment)

              const bgColor = {
                red: 'bg-red-500/90 hover:bg-red-600',
                yellow: 'bg-yellow-500/90 hover:bg-yellow-600',
                green: 'bg-green-500/90 hover:bg-green-600',
                gray: 'bg-gray-500/90 hover:bg-gray-600',
              }[status.color]

              return (
                <div
                  key={assignment.id}
                  className={clsx(
                    'absolute left-1 right-1 text-white rounded px-2 py-1 overflow-hidden cursor-pointer transition-colors z-10',
                    bgColor
                  )}
                  style={style}
                >
                  <div className="text-sm font-medium">📝 {assignment.title}</div>
                  <div className="text-xs opacity-90">
                    Due {format(deadline, 'h:mma').toLowerCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
