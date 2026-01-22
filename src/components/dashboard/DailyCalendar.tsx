'use client'

import { useState, useEffect } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { format, startOfDay, endOfDay, addDays, subDays, getHours, getMinutes } from 'date-fns'
import { formatTime } from '@/lib/utils/dateUtils'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import { CourseBadge } from '@/components/courses/CourseBadge'
import clsx from 'clsx'

// Hours to display in the schedule (6 AM to 11 PM)
const SCHEDULE_START_HOUR = 6
const SCHEDULE_END_HOUR = 23
const HOURS = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, i) => SCHEDULE_START_HOUR + i)

export function DailyCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())
  const { assignments } = useAssignmentStore()
  const { getCourseById } = useCourseStore()

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const goToToday = () => setSelectedDate(new Date())

  // Get assignments for selected date
  const dayAssignments = assignments
    .filter((assignment) => {
      const deadline = new Date(assignment.deadline)
      return (
        deadline >= startOfDay(selectedDate) &&
        deadline <= endOfDay(selectedDate)
      )
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // Calculate position for current time indicator
  const currentHour = getHours(currentTime)
  const currentMinute = getMinutes(currentTime)
  const currentTimePosition = ((currentHour - SCHEDULE_START_HOUR) * 60 + currentMinute) / ((SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1) * 60) * 100

  // Get assignments for a specific hour
  const getAssignmentsForHour = (hour: number) => {
    return dayAssignments.filter((assignment) => {
      const deadline = new Date(assignment.deadline)
      return getHours(deadline) === hour
    })
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Today's Schedule</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {isToday ? format(selectedDate, 'EEEE, MMM d') : format(selectedDate, 'EEEE, MMM d, yyyy')}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousDay}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            aria-label="Previous day"
          >
            <svg
              className="w-4 h-4 text-text-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {!isToday && (
            <button
              onClick={goToToday}
              className="px-2 py-1 text-xs bg-accent hover:bg-border rounded transition-colors text-text-primary"
            >
              Today
            </button>
          )}

          <button
            onClick={goToNextDay}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            aria-label="Next day"
          >
            <svg
              className="w-4 h-4 text-text-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Summary */}
      {dayAssignments.length > 0 && (
        <div className="mb-3 px-2 py-1.5 bg-accent/50 rounded-md">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text-primary">{dayAssignments.length}</span> assignment{dayAssignments.length !== 1 ? 's' : ''} due today
          </p>
        </div>
      )}

      {/* Schedule Timeline */}
      <div className="relative max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {/* Current time indicator */}
        {isToday && currentHour >= SCHEDULE_START_HOUR && currentHour <= SCHEDULE_END_HOUR && (
          <div 
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          </div>
        )}

        {/* Hour rows */}
        <div className="space-y-0">
          {HOURS.map((hour) => {
            const hourAssignments = getAssignmentsForHour(hour)
            const isPastHour = isToday && hour < currentHour
            const isCurrentHour = isToday && hour === currentHour

            return (
              <div
                key={hour}
                className={clsx(
                  'flex border-t border-border/50 min-h-[48px]',
                  isPastHour && 'opacity-50'
                )}
              >
                {/* Time label */}
                <div className={clsx(
                  'w-14 flex-shrink-0 py-1 pr-2 text-right text-xs',
                  isCurrentHour ? 'text-red-500 font-medium' : 'text-text-muted'
                )}>
                  {formatHour(hour)}
                </div>

                {/* Events */}
                <div className="flex-1 py-1 pl-2 space-y-1">
                  {hourAssignments.map((assignment) => {
                    const course = getCourseById(assignment.courseId)
                    const status = calculateStatus(assignment)
                    const statusColors = {
                      red: 'border-l-status-red bg-status-red/10',
                      yellow: 'border-l-status-yellow bg-status-yellow/10',
                      green: 'border-l-status-green bg-status-green/10',
                      gray: 'border-l-status-gray bg-status-gray/10',
                    }

                    return (
                      <div
                        key={assignment.id}
                        className={clsx(
                          'border-l-2 rounded-r px-2 py-1.5',
                          statusColors[status.color],
                          assignment.status === 'completed' && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-text-primary truncate">
                                {assignment.title}
                              </span>
                              {assignment.status === 'completed' && (
                                <span className="text-xs text-status-green">✓</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-text-muted">
                                {formatTime(assignment.deadline)}
                              </span>
                              {course && (
                                <span 
                                  className="text-[10px] px-1 rounded"
                                  style={{ 
                                    backgroundColor: `${course.color}20`,
                                    color: course.color 
                                  }}
                                >
                                  {course.code}
                                </span>
                              )}
                            </div>
                          </div>
                          {assignment.priority === 'high' && (
                            <span className="text-xs">⚡</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state */}
      {dayAssignments.length === 0 && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-text-muted mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-text-muted">
            {isToday ? 'No assignments due today!' : 'No assignments on this day'}
          </p>
        </div>
      )}
    </div>
  )
}
