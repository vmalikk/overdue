'use client'

import { format, isToday, isSameMonth } from 'date-fns'
import { Assignment } from '@/types/assignment'
import { CalendarEvent } from '@/lib/utils/calendarUtils'
import { AssignmentEvent, GoogleCalendarEvent } from './CalendarEvent'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface DayCellProps {
  date: Date
  referenceDate: Date
  isSelected: boolean
  assignments: Assignment[]
  events: CalendarEvent[]
  onClick: () => void
}

export function DayCell({
  date,
  referenceDate,
  isSelected,
  assignments,
  events,
  onClick,
}: DayCellProps) {
  const isCurrentMonth = isSameMonth(date, referenceDate)
  const isTodayDate = isToday(date)
  const totalItems = assignments.length + events.length
  const maxVisible = 3

  // Combine and sort items by time
  const allItems = [
    ...assignments.map(a => ({ type: 'assignment' as const, item: a, time: new Date(a.deadline) })),
    ...events.map(e => ({ type: 'event' as const, item: e, time: new Date(e.start) })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime())

  const visibleItems = allItems.slice(0, maxVisible)
  const overflowCount = totalItems - maxVisible

  return (
    <div
      className={clsx(
        'min-h-[120px] p-2 border border-border transition-colors cursor-pointer',
        isCurrentMonth ? 'bg-secondary' : 'bg-background',
        isSelected && 'ring-2 ring-priority-medium',
        isTodayDate && 'bg-accent/50',
        'hover:bg-accent/30'
      )}
      onClick={onClick}
    >
      {/* Date number */}
      <div className="flex justify-between items-start mb-2">
        <span
          className={clsx(
            'text-sm font-medium',
            isTodayDate
              ? 'bg-priority-medium text-white w-7 h-7 rounded-full flex items-center justify-center'
              : isCurrentMonth
                ? 'text-text-primary'
                : 'text-text-muted'
          )}
        >
          {format(date, 'd')}
        </span>
      </div>

      {/* Events list */}
      <div className="space-y-1">
        {visibleItems.map((item, index) => (
          <div key={`${item.type}-${index}`}>
            {item.type === 'assignment' ? (
              <AssignmentEvent
                assignment={item.item as Assignment}
                compact
              />
            ) : (
              <GoogleCalendarEvent
                event={item.item as CalendarEvent}
                compact
              />
            )}
          </div>
        ))}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div className="text-xs text-text-muted px-2">
            +{overflowCount} more
          </div>
        )}
      </div>
    </div>
  )
}
