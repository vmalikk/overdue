'use client'

import { format, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { formatMonthHeader, formatWeekHeader } from '@/lib/utils/calendarUtils'

interface CalendarHeaderProps {
  currentDate: Date
  view: 'month' | 'week'
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  onViewChange: (view: 'month' | 'week') => void
}

export function CalendarHeader({
  currentDate,
  view,
  onNavigate,
  onViewChange,
}: CalendarHeaderProps) {
  const title = view === 'month'
    ? formatMonthHeader(currentDate)
    : formatWeekHeader(currentDate)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={`Previous ${view}`}
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
          <button
            onClick={() => onNavigate('next')}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={`Next ${view}`}
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

        <h2 className="text-xl font-bold text-text-primary">{title}</h2>

        <button
          onClick={() => onNavigate('today')}
          className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent/80 text-text-primary rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex bg-secondary border border-border rounded-lg p-1">
        <button
          onClick={() => onViewChange('month')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'month'
              ? 'bg-accent text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => onViewChange('week')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            view === 'week'
              ? 'bg-accent text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Week
        </button>
      </div>
    </div>
  )
}
