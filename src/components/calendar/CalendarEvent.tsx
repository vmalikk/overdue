'use client'

import { format } from 'date-fns'
import { Assignment, AssignmentStatus } from '@/types/assignment'
import { CalendarEvent as CalendarEventType } from '@/lib/utils/calendarUtils'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface AssignmentEventProps {
  assignment: Assignment
  compact?: boolean
  onClick?: () => void
}

export function AssignmentEvent({ assignment, compact = false, onClick }: AssignmentEventProps) {
  const status = calculateStatus(assignment)

  const borderColors = {
    red: 'border-l-status-red',
    yellow: 'border-l-status-yellow',
    green: 'border-l-status-green',
    gray: 'border-l-status-gray',
  }

  const bgColors = {
    red: 'bg-status-red/10',
    yellow: 'bg-status-yellow/10',
    green: 'bg-status-green/10',
    gray: 'bg-status-gray/10',
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'w-full text-left px-2 py-1 rounded text-xs truncate',
          'border-l-2 transition-colors hover:opacity-80',
          borderColors[status.color],
          bgColors[status.color],
          assignment.status === AssignmentStatus.COMPLETED && 'opacity-60 line-through'
        )}
        title={`${assignment.title} - ${format(new Date(assignment.deadline), 'h:mm a')}`}
      >
        {assignment.title}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-2 rounded-lg border-l-4 transition-colors hover:opacity-80',
        borderColors[status.color],
        bgColors[status.color],
        assignment.status === AssignmentStatus.COMPLETED && 'opacity-60'
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <span className={clsx(
          'text-sm font-medium text-text-primary',
          assignment.status === AssignmentStatus.COMPLETED && 'line-through'
        )}>
          {assignment.title}
        </span>
        <span className="text-xs text-text-muted whitespace-nowrap">
          {format(new Date(assignment.deadline), 'h:mm a')}
        </span>
      </div>
    </button>
  )
}

interface GoogleCalendarEventProps {
  event: CalendarEventType
  compact?: boolean
  onClick?: () => void
}

export function GoogleCalendarEvent({ event, compact = false, onClick }: GoogleCalendarEventProps) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-2 py-1 rounded text-xs truncate border-l-2 border-l-priority-low bg-priority-low/10 hover:opacity-80 transition-colors"
        title={`${event.summary} - ${format(new Date(event.start), 'h:mm a')}`}
      >
        {event.summary}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg border-l-4 border-l-priority-low bg-priority-low/10 hover:opacity-80 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">📅</span>
        <span className="text-sm font-medium text-text-primary">{event.summary}</span>
      </div>
      <div className="text-xs text-text-muted">
        {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
      </div>
    </button>
  )
}
