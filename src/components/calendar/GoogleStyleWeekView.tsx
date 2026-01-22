'use client'

import { useState, useEffect } from 'react'
import { format, isToday, isSameDay, addDays, startOfWeek } from 'date-fns'
import { CalendarEvent } from '@/lib/utils/calendarUtils'
import { Assignment } from '@/types/assignment'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface GoogleStyleWeekViewProps {
  currentDate: Date
  assignments: Assignment[]
  events: CalendarEvent[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const START_HOUR = 0
const END_HOUR = 23

export function GoogleStyleWeekView({
  currentDate,
  assignments,
  events,
  selectedDate,
  onDateSelect,
}: GoogleStyleWeekViewProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  
  // Get week dates starting from Sunday
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Update current time every minute (client-side only)
  useEffect(() => {
    setCurrentTime(new Date())
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate current time position
  const currentHour = currentTime ? currentTime.getHours() + currentTime.getMinutes() / 60 : 0
  const currentTimePosition = currentTime ? (currentHour / 24) * 100 : null

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return events.filter(e => {
      const start = new Date(e.start)
      return start >= dayStart && start <= dayEnd
    })
  }

  // Get assignments for a specific date  
  const getAssignmentsForDate = (date: Date) => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return assignments.filter(a => {
      const deadline = new Date(a.deadline)
      return deadline >= dayStart && deadline <= dayEnd
    })
  }

  // Calculate event position and height
  const getEventStyle = (start: Date, end: Date) => {
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const duration = endHour - startHour
    
    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${Math.max((duration / 24) * 100, 2)}%`, // Min 2% height
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
      {/* Header with day names and dates */}
      <div className="flex border-b border-border bg-background sticky top-0 z-30">
        {/* Timezone label */}
        <div className="w-16 flex-shrink-0 py-2 px-2 text-[10px] text-text-muted text-center border-r border-border">
          GMT-05
        </div>
        
        {/* Day headers */}
        {weekDates.map((date) => {
          const isTodayDate = isToday(date)
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          
          return (
            <div
              key={date.toISOString()}
              className={clsx(
                'flex-1 py-2 text-center cursor-pointer transition-colors border-r border-border last:border-r-0',
                isSelected && 'bg-accent/50'
              )}
              onClick={() => onDateSelect(date)}
            >
              <div className={clsx(
                'text-xs font-medium',
                isTodayDate ? 'text-blue-400' : 'text-text-muted'
              )}>
                {format(date, 'EEE').toUpperCase()}
              </div>
              <div className={clsx(
                'text-2xl font-normal mt-0.5',
                isTodayDate 
                  ? 'bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto'
                  : 'text-text-primary'
              )}>
                {format(date, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* All-day events section */}
      <div className="flex border-b border-border bg-background">
        <div className="w-16 flex-shrink-0 border-r border-border" />
        {weekDates.map((date) => {
          const dayEvents = getEventsForDate(date).filter(e => e.isAllDay)
          return (
            <div
              key={`allday-${date.toISOString()}`}
              className="flex-1 min-h-[24px] border-r border-border last:border-r-0 p-0.5"
            >
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="text-[10px] bg-blue-500/80 text-white px-1 rounded truncate"
                >
                  {event.summary}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-[1440px]"> {/* 24 hours * 60px per hour */}
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

          {/* Day columns */}
          {weekDates.map((date) => {
            const dayEvents = getEventsForDate(date).filter(e => !e.isAllDay)
            const dayAssignments = getAssignmentsForDate(date)
            const isTodayColumn = isToday(date)

            return (
              <div
                key={date.toISOString()}
                className="flex-1 relative border-r border-border last:border-r-0"
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50"
                    style={{ top: `${(hour / 24) * 100}%`, height: `${100 / 24}%` }}
                  />
                ))}

                {/* Current time indicator */}
                {isTodayColumn && currentTime && currentTimePosition !== null && (
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
                {dayEvents.map((event, index) => {
                  const start = new Date(event.start)
                  const end = new Date(event.end)
                  const style = getEventStyle(start, end)

                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 bg-blue-500/90 text-white rounded px-1.5 py-0.5 overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10"
                      style={style}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="text-xs font-medium truncate">
                        {event.summary}
                      </div>
                      <div className="text-[10px] opacity-90">
                        {format(start, 'h:mma').toLowerCase()} – {format(end, 'h:mma').toLowerCase()}
                      </div>
                    </div>
                  )
                })}

                {/* Assignments */}
                {dayAssignments.map((assignment, index) => {
                  const deadline = new Date(assignment.deadline)
                  const endTime = new Date(deadline.getTime() + (assignment.estimatedHours || 1) * 60 * 60 * 1000)
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
                        'absolute left-0.5 right-0.5 text-white rounded px-1.5 py-0.5 overflow-hidden cursor-pointer transition-colors z-10',
                        bgColor
                      )}
                      style={style}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="text-xs font-medium truncate">
                        📝 {assignment.title}
                      </div>
                      <div className="text-[10px] opacity-90">
                        Due {format(deadline, 'h:mma').toLowerCase()}
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
