'use client'

import { useEffect, useRef, useState } from 'react'
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

const HOUR_HEIGHT = 60
const TOTAL_HOURS = 24
const START_HOUR = 6
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT  // 1440px
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)

function formatHour(hour: number) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export function GoogleStyleWeekView({
  currentDate,
  assignments,
  events,
  selectedDate,
  onDateSelect,
}: GoogleStyleWeekViewProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    const now = new Date()
    setCurrentTime(now)
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to 6 AM (or 1h before current time if today) on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const todayInView = weekDates.some(d => isToday(d))
    const now = new Date()
    const target = todayInView
      ? Math.max((now.getHours() - 1) * HOUR_HEIGHT, START_HOUR * HOUR_HEIGHT)
      : START_HOUR * HOUR_HEIGHT
    scrollRef.current.scrollTop = target
  }, [currentDate])

  const getEventsForDate = (date: Date) => {
    const s = new Date(date); s.setHours(0, 0, 0, 0)
    const e = new Date(date); e.setHours(23, 59, 59, 999)
    return events.filter(ev => { const d = new Date(ev.start); return d >= s && d <= e })
  }

  const getAssignmentsForDate = (date: Date) => {
    const s = new Date(date); s.setHours(0, 0, 0, 0)
    const e = new Date(date); e.setHours(23, 59, 59, 999)
    return assignments.filter(a => { const d = new Date(a.deadline); return d >= s && d <= e })
  }

  const getTop = (date: Date) => (date.getHours() + date.getMinutes() / 60) * HOUR_HEIGHT
  const getHeight = (start: Date, end: Date) =>
    Math.max(((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT, 20)

  const currentTimeTop = currentTime
    ? (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT
    : null

  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden flex flex-col h-full">
      {/* Day headers */}
      <div className="flex border-b border-border bg-background sticky top-0 z-30 flex-shrink-0">
        <div className="w-16 flex-shrink-0 py-2 border-r border-border" />
        {weekDates.map(date => {
          const isTodayDate = isToday(date)
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          return (
            <div
              key={date.toISOString()}
              className={clsx(
                'flex-1 py-2 text-center cursor-pointer transition-colors border-r border-border last:border-r-0',
                isSelected && 'bg-surface'
              )}
              onClick={() => onDateSelect(date)}
            >
              <div className={clsx('text-xs font-medium', isTodayDate ? 'text-blue-400' : 'text-text-muted')}>
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

      {/* All-day row */}
      <div className="flex border-b border-border bg-background flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-border py-1 px-2 text-[10px] text-text-muted">All day</div>
        {weekDates.map(date => {
          const allDay = getEventsForDate(date).filter(e => e.isAllDay)
          return (
            <div key={`allday-${date.toISOString()}`} className="flex-1 min-h-[20px] border-r border-border last:border-r-0 p-0.5">
              {allDay.map(ev => (
                <div key={ev.id} className="text-[10px] bg-blue-500/80 text-white px-1 rounded truncate mb-0.5">
                  {ev.summary}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-border relative flex-shrink-0" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-[10px] text-text-muted select-none"
                style={{ top: hour * HOUR_HEIGHT - 7, height: HOUR_HEIGHT }}
              >
                {hour > 0 && formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map(date => {
            const dayEvents = getEventsForDate(date).filter(e => !e.isAllDay)
            const dayAssignments = getAssignmentsForDate(date)
            const isTodayCol = isToday(date)

            return (
              <div
                key={date.toISOString()}
                className="flex-1 relative border-r border-border last:border-r-0"
                style={{ height: TOTAL_HEIGHT }}
              >
                {/* Hour lines */}
                {HOURS.map(hour => (
                  <div key={hour} className="absolute w-full border-t border-border/40" style={{ top: hour * HOUR_HEIGHT }} />
                ))}
                {/* Half-hour lines */}
                {HOURS.map(hour => (
                  <div key={`h-${hour}`} className="absolute w-full border-t border-border/20" style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                ))}

                {/* Current time */}
                {isTodayCol && currentTimeTop !== null && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: currentTimeTop }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                      <div className="flex-1 h-px bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Calendar events */}
                {dayEvents.map(event => {
                  const start = new Date(event.start)
                  const end = new Date(event.end)
                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 bg-blue-500/90 text-white rounded px-1.5 py-0.5 overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10"
                      style={{ top: getTop(start), height: getHeight(start, end) }}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="text-xs font-medium truncate">{event.summary}</div>
                      <div className="text-[10px] opacity-80">{format(start, 'h:mma').toLowerCase()}</div>
                    </div>
                  )
                })}

                {/* Assignments */}
                {dayAssignments.map(assignment => {
                  const deadline = new Date(assignment.deadline)
                  const endTime = new Date(deadline.getTime() + 3600000)
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
                      style={{ top: getTop(deadline), height: getHeight(deadline, endTime) }}
                      onClick={() => onDateSelect(date)}
                    >
                      <div className="text-xs font-medium truncate">📝 {assignment.title}</div>
                      <div className="text-[10px] opacity-80">Due {format(deadline, 'h:mma').toLowerCase()}</div>
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
