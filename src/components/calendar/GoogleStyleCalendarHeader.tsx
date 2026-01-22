'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { formatMonthHeader, formatWeekHeader } from '@/lib/utils/calendarUtils'
import clsx from 'clsx'

export type CalendarViewType = 'day' | 'week' | 'month'

interface GoogleStyleCalendarHeaderProps {
  currentDate: Date
  view: CalendarViewType
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  onViewChange: (view: CalendarViewType) => void
}

export function GoogleStyleCalendarHeader({
  currentDate,
  view,
  onNavigate,
  onViewChange,
}: GoogleStyleCalendarHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTitle = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'MMMM d, yyyy')
      case 'week':
        return formatWeekHeader(currentDate)
      case 'month':
        return formatMonthHeader(currentDate)
    }
  }

  const viewLabels: Record<CalendarViewType, string> = {
    day: 'Day',
    week: 'Week',
    month: 'Month',
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      {/* Left side: Navigation and title */}
      <div className="flex items-center gap-2">
        {/* Today button */}
        <button
          onClick={() => onNavigate('today')}
          className="px-4 py-2 text-sm font-medium border border-border bg-secondary hover:bg-accent text-text-primary rounded-md transition-colors"
        >
          Today
        </button>

        {/* Navigation arrows */}
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-full hover:bg-accent transition-colors"
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
            className="p-2 rounded-full hover:bg-accent transition-colors"
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

        {/* Title */}
        <h2 className="text-xl font-normal text-text-primary ml-2">{getTitle()}</h2>
      </div>

      {/* Right side: View selector dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-secondary hover:bg-accent text-text-primary rounded-md transition-colors"
        >
          {viewLabels[view]}
          <svg
            className={clsx(
              'w-4 h-4 transition-transform',
              isDropdownOpen && 'rotate-180'
            )}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-32 bg-secondary border border-border rounded-md shadow-lg z-50 overflow-hidden">
            {(['day', 'week', 'month'] as CalendarViewType[]).map((viewOption) => (
              <button
                key={viewOption}
                onClick={() => {
                  onViewChange(viewOption)
                  setIsDropdownOpen(false)
                }}
                className={clsx(
                  'w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors',
                  view === viewOption
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-text-primary'
                )}
              >
                {viewLabels[viewOption]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
