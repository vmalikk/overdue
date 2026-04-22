'use client'

import { useEffect, useRef, useState } from 'react'
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

const HOUR_HEIGHT = 60   // px per hour
const TOTAL_HOURS = 24
const START_HOUR = 6     // scroll to 6 AM on load
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT  // 1440px

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i)

function formatHour(hour: number) {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

export function DayView({ currentDate, assignments, events }: DayViewProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isTodayDate = isToday(currentDate)

  useEffect(() => {
    const now = new Date()
    setCurrentTime(now)
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Scroll to 6 AM (or current time if today) on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const target = isTodayDate && currentTime
      ? Math.max((currentTime.getHours() - 1) * HOUR_HEIGHT, START_HOUR * HOUR_HEIGHT)
      : START_HOUR * HOUR_HEIGHT
    scrollRef.current.scrollTop = target
  }, [isTodayDate])  // only on mount / date change

  const dayStart = new Date(currentDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(currentDate)
  dayEnd.setHours(23, 59, 59, 999)

  const dayEvents = events.filter(e => {
    const s = new Date(e.start)
    return s >= dayStart && s <= dayEnd && !e.isAllDay
  })
  const allDayEvents = events.filter(e => {
    const s = new Date(e.start)
    return s >= dayStart && s <= dayEnd && e.isAllDay
  })
  const dayAssignments = assignments.filter(a => {
    const d = new Date(a.deadline)
    return d >= dayStart && d <= dayEnd
  })

  const getEventTop = (date: Date) =>
    (date.getHours() + date.getMinutes() / 60) * HOUR_HEIGHT

  const getEventHeight = (start: Date, end: Date) => {
    const hrs = (end.getTime() - start.getTime()) / 3600000
    return Math.max(hrs * HOUR_HEIGHT, 22)
  }

  const currentTimeTop = currentTime
    ? (currentTime.getHours() + currentTime.getMinutes() / 60) * HOUR_HEIGHT
    : null

  return (
    <div className="bg-secondary border border-border rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex border-b border-border bg-background sticky top-0 z-30 flex-shrink-0">
        <div className="w-16 flex-shrink-0 py-2 px-2 text-[10px] text-text-muted text-center border-r border-border" />
        <div className="flex-1 py-2 text-center">
          <div className={clsx('text-xs font-medium', isTodayDate ? 'text-blue-400' : 'text-text-muted')}>
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

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="flex border-b border-border bg-background flex-shrink-0">
          <div className="w-16 flex-shrink-0 border-r border-border py-1 px-2 text-[10px] text-text-muted">All day</div>
          <div className="flex-1 p-1 space-y-0.5">
            {allDayEvents.map(event => (
              <div key={event.id} className="text-xs bg-blue-500/80 text-white px-2 py-1 rounded">
                {event.summary}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-border relative" style={{ height: TOTAL_HEIGHT }}>
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

          {/* Grid + events */}
          <div className="flex-1 relative" style={{ height: TOTAL_HEIGHT }}>
            {/* Hour lines */}
            {HOURS.map(hour => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/40"
                style={{ top: hour * HOUR_HEIGHT }}
              />
            ))}
            {/* Half-hour lines */}
            {HOURS.map(hour => (
              <div
                key={`h-${hour}`}
                className="absolute w-full border-t border-border/20"
                style={{ top: hour * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
              />
            ))}

            {/* Current time indicator */}
            {isTodayDate && currentTimeTop !== null && (
              <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: currentTimeTop }}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 flex-shrink-0" />
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
                  className="absolute left-1 right-1 bg-blue-500/90 text-white rounded px-2 py-1 overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10"
                  style={{ top: getEventTop(start), height: getEventHeight(start, end) }}
                >
                  <div className="text-xs font-semibold leading-tight truncate">{event.summary}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    {format(start, 'h:mma').toLowerCase()} – {format(end, 'h:mma').toLowerCase()}
                  </div>
                </div>
              )
            })}

            {/* Assignments */}
            {dayAssignments.map(assignment => {
              const deadline = new Date(assignment.deadline)
              const endTime = new Date(deadline.getTime() + 60 * 60 * 1000)
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
                  style={{ top: getEventTop(deadline), height: getEventHeight(deadline, endTime) }}
                >
                  <div className="text-xs font-semibold leading-tight truncate">📝 {assignment.title}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Due {format(deadline, 'h:mma').toLowerCase()}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
