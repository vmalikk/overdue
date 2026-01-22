'use client'

import { useState, useEffect } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { formatTime } from '@/lib/utils/dateUtils'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import { CourseBadge } from '@/components/courses/CourseBadge'
import clsx from 'clsx'

export function DailyCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { assignments } = useAssignmentStore()
  const { getCourseById } = useCourseStore()

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

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-text-primary">Daily View</h3>
          <p className="text-sm text-text-muted mt-1">
            {isToday ? 'Today' : format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-2 rounded hover:bg-accent transition-colors"
            aria-label="Previous day"
          >
            <svg
              className="w-5 h-5 text-text-primary"
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
              className="px-3 py-1 text-sm bg-accent hover:bg-border rounded transition-colors text-text-primary"
            >
              Today
            </button>
          )}

          <button
            onClick={goToNextDay}
            className="p-2 rounded hover:bg-accent transition-colors"
            aria-label="Next day"
          >
            <svg
              className="w-5 h-5 text-text-primary"
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

      {/* Assignments for the day */}
      <div className="space-y-3">
        {dayAssignments.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 text-text-muted mx-auto mb-3"
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
            <p className="text-text-muted">
              {isToday ? 'No assignments due today!' : 'No assignments on this day'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-muted mb-3">
              {dayAssignments.length} assignment{dayAssignments.length !== 1 ? 's' : ''} due
            </p>
            {dayAssignments.map((assignment) => {
              const course = getCourseById(assignment.courseId)
              const status = calculateStatus(assignment)
              const statusColors = {
                red: 'border-status-red',
                yellow: 'border-status-yellow',
                green: 'border-status-green',
                gray: 'border-status-gray',
              }

              return (
                <div
                  key={assignment.id}
                  className={clsx(
                    'bg-background border-l-4 rounded-lg p-4',
                    statusColors[status.color]
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-text-primary">
                          {assignment.title}
                        </h4>
                        {assignment.status === 'completed' && (
                          <span className="text-xs text-status-green">✓ Done</span>
                        )}
                      </div>

                      {course && (
                        <div className="mb-2">
                          <CourseBadge course={course} size="sm" />
                        </div>
                      )}

                      {assignment.description && (
                        <p className="text-sm text-text-muted line-clamp-2 mb-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span>⏰ {formatTime(assignment.deadline)}</span>
                        {assignment.estimatedHours && (
                          <span>📊 {assignment.estimatedHours}h estimated</span>
                        )}
                      </div>
                    </div>

                    {/* Priority indicator */}
                    <div className="flex-shrink-0">
                      {assignment.priority === 'high' && <span className="text-2xl">⚡</span>}
                      {assignment.priority === 'medium' && <span className="text-2xl">➖</span>}
                      {assignment.priority === 'low' && <span className="text-2xl">⬇️</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
