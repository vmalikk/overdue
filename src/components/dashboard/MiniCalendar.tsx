'use client'

import { useState, useEffect } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { getCalendarDates, isSameDay } from '@/lib/utils/dateUtils'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { calculateStatus } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface MiniCalendarProps {
  value?: Date
  onChange?: (date: Date) => void
  disabled?: boolean
}

export function MiniCalendar({ value, onChange, disabled }: MiniCalendarProps) {
  const [internalDate, setInternalDate] = useState(new Date())
  const { assignments, setFilterDateRange } = useAssignmentStore()

  // Sync internal state with prop if provided
  useEffect(() => {
    if (value) {
       setInternalDate(value)
    }
  }, [value])

  // Use either controlled or internal date for navigation (month view)
  // For selection, if controlled, we call onChange.
  const displayDate = value || internalDate

  const year = displayDate.getFullYear()
  const month = displayDate.getMonth()
  const dates = getCalendarDates(year, month)
  const today = new Date()

  const previousMonth = () => {
     const newDate = subMonths(displayDate, 1)
     if (!value) setInternalDate(newDate)
     // Typically onChange is for selection, not month nav, but if we want the parent to track month:
     // For now, let's keep nav internal to the calendar unless we want to change parent month
     // If value is provided, we might assume parent controls everything.
     // But usually MiniCalendar navigates months independently until a day is clicked.
     // Let's keep month navigation separate from selection value.
     setInternalDate(newDate) 
  }
  
  const nextMonth = () => {
     setInternalDate(addMonths(displayDate, 1))
  }

  // Handle day click
  const handleDateClick = (date: Date) => {
     if (onChange) {
        onChange(date)
     } else {
        setFilterDateRange({ start: startOfDay(date), end: endOfDay(date) })
     }
  }


  // Get assignments for each date
  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter((assignment) =>
      isSameDay(new Date(assignment.deadline), date)
    )
  }

  // Get color indicator for date
  const getDateIndicator = (date: Date) => {
    const dateAssignments = getAssignmentsForDate(date)
    if (dateAssignments.length === 0) return null

    // Find the most urgent assignment (red > yellow > green > gray)
    const colorPriority = { red: 4, yellow: 3, green: 2, gray: 1 }
    let mostUrgent = null
    let highestPriority = 0

    dateAssignments.forEach((assignment) => {
      const status = calculateStatus(assignment)
      const priority = colorPriority[status.color]
      if (priority > highestPriority) {
        highestPriority = priority
        mostUrgent = status.color
      }
    })

    return mostUrgent
  }

  return (
    <div
      className="bg-secondary border border-border rounded-lg p-3 md:p-4 w-full md:w-[280px] md:min-h-[300px]"
    >
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <button
          onClick={previousMonth}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Previous month"
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

        <h3 className="text-sm font-semibold text-text-primary">
          {format(displayDate, 'MMMM yyyy')}
        </h3>

        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-accent transition-colors"
          aria-label="Next month"
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

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {dates.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month
          const isToday = isSameDay(date, today)
          const isSelected = value && isSameDay(date, value)
          
          const dateAssignments = getAssignmentsForDate(date)
          const hasAssignments = dateAssignments.length > 0
          const indicator = getDateIndicator(date)

          const indicatorColors: Record<string, string> = {
            red: 'bg-status-red',
            yellow: 'bg-status-yellow',
            green: 'bg-status-green',
            gray: 'bg-status-gray',
          }

          return (
            <button
              key={index}
              onClick={() => isCurrentMonth && handleDateClick(date)}
              className={clsx(
                'relative aspect-square rounded text-xs font-medium transition-colors',
                'flex flex-col items-center justify-center',
                isCurrentMonth
                  ? 'text-text-primary hover:bg-accent cursor-pointer'
                  : 'text-text-muted cursor-default',
                isToday && !isSelected && 'border-2 border-priority-medium',
                isSelected && 'bg-primary text-secondary font-bold hover:bg-primary/90'
              )}
              disabled={!isCurrentMonth || disabled}
              title={
                hasAssignments
                  ? `${dateAssignments.length} assignment${dateAssignments.length !== 1 ? 's' : ''}`
                  : undefined
              }
            >
              <span>{format(date, 'd')}</span>

              {/* Colored dot indicator */}
              {indicator && !isSelected && (
                <div
                  className={clsx(
                    'absolute bottom-0.5 w-1 h-1 rounded-full',
                    indicatorColors[indicator]
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Clear filter button */}
      <button
        onClick={() => setFilterDateRange(undefined)}
        className="w-full mt-4 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        Clear date filter
      </button>
    </div>
  )
}
