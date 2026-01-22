'use client'

import { format } from 'date-fns'
import { Assignment, AssignmentStatus } from '@/types/assignment'
import { CalendarEvent } from '@/lib/utils/calendarUtils'
import { AssignmentEvent, GoogleCalendarEvent } from './CalendarEvent'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import clsx from 'clsx'

interface DaySidebarProps {
  isOpen: boolean
  date: Date | null
  assignments: Assignment[]
  events: CalendarEvent[]
  onClose: () => void
}

export function DaySidebar({
  isOpen,
  date,
  assignments,
  events,
  onClose,
}: DaySidebarProps) {
  const { completeAssignment, uncompleteAssignment } = useAssignmentStore()
  const { getCourseById } = useCourseStore()

  if (!isOpen || !date) {
    return null
  }

  const handleToggleComplete = (assignment: Assignment) => {
    if (assignment.status === AssignmentStatus.COMPLETED) {
      uncompleteAssignment(assignment.id)
    } else {
      completeAssignment(assignment.id)
    }
  }

  const totalItems = assignments.length + events.length

  return (
    <div className="w-80 border-l border-border bg-secondary flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div>
          <div className="text-lg font-semibold text-text-primary">
            {format(date, 'EEEE')}
          </div>
          <div className="text-sm text-text-muted">
            {format(date, 'MMMM d, yyyy')}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Close sidebar"
        >
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {totalItems === 0 ? (
          <div className="text-center text-text-muted py-8">
            <div className="text-4xl mb-2">📭</div>
            <p>No events or assignments for this day</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Assignments section */}
            {assignments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                  <span>📝</span>
                  Assignments ({assignments.length})
                </h3>
                <div className="space-y-2">
                  {assignments
                    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                    .map((assignment) => {
                      const course = getCourseById(assignment.courseId)
                      return (
                        <div
                          key={assignment.id}
                          className="bg-background rounded-lg p-3 border border-border"
                        >
                          <AssignmentEvent assignment={assignment} />

                          {/* Course badge */}
                          {course && (
                            <div className="mt-2 flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: course.color }}
                              />
                              <span className="text-xs text-text-muted">
                                {course.code}
                              </span>
                            </div>
                          )}

                          {/* Toggle complete button */}
                          <button
                            onClick={() => handleToggleComplete(assignment)}
                            className={clsx(
                              'mt-3 w-full py-1.5 text-xs font-medium rounded transition-colors',
                              assignment.status === AssignmentStatus.COMPLETED
                                ? 'bg-status-gray/20 text-text-muted hover:bg-status-gray/30'
                                : 'bg-status-green/20 text-status-green hover:bg-status-green/30'
                            )}
                          >
                            {assignment.status === AssignmentStatus.COMPLETED
                              ? 'Mark Incomplete'
                              : 'Mark Complete'}
                          </button>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Calendar events section */}
            {events.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                  <span>📅</span>
                  Calendar Events ({events.length})
                </h3>
                <div className="space-y-2">
                  {events
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map((event) => (
                      <div
                        key={event.id}
                        className="bg-background rounded-lg p-3 border border-border"
                      >
                        <GoogleCalendarEvent event={event} />
                        {event.description && (
                          <p className="mt-2 text-xs text-text-muted line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-text-muted text-center">
          {totalItems} item{totalItems !== 1 ? 's' : ''} on this day
        </div>
      </div>
    </div>
  )
}
