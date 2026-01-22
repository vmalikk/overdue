'use client'

import { useState, useEffect, useCallback } from 'react'
import { addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCalendarStore } from '@/store/calendarStore'
import { getVisibleDateRange, getAssignmentsForDate, getEventsForDate, CalendarEvent } from '@/lib/utils/calendarUtils'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { MonthView } from '@/components/calendar/MonthView'
import { WeekView } from '@/components/calendar/WeekView'
import { DaySidebar } from '@/components/calendar/DaySidebar'

export function FullCalendarPage() {
  const { data: session } = useSession()
  const { assignments } = useAssignmentStore()
  const { config, events, setEvents } = useCalendarStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch Google Calendar events for visible date range
  const fetchCalendarEvents = useCallback(async () => {
    if (!session?.accessToken || !config.connected) {
      return
    }

    setIsLoading(true)
    try {
      const { start, end } = getVisibleDateRange(currentDate, view)
      const response = await fetch(
        `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        // Transform to CalendarEvent format - API returns { title, start, end, googleCalendarEventId }
        const calendarEvents: CalendarEvent[] = data.events.map((e: {
          googleCalendarEventId: string
          title: string
          description?: string
          start: string
          end: string
        }) => {
          // Parse dates - the API returns original Google Calendar datetime strings
          const startDate = new Date(e.start)
          const endDate = new Date(e.end)
          
          return {
            id: e.googleCalendarEventId,
            summary: e.title || 'Untitled',
            description: e.description,
            start: startDate,
            end: endDate,
            isAllDay: !e.start.includes('T'), // All-day events don't have time component
          }
        })
        setEvents(calendarEvents)
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, view, session?.accessToken, config.connected, setEvents])

  useEffect(() => {
    fetchCalendarEvents()
  }, [fetchCalendarEvents])

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date())
      return
    }

    if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    } else {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    }
  }

  const handleViewChange = (newView: 'month' | 'week') => {
    setView(newView)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleCloseSidebar = () => {
    setSelectedDate(null)
  }

  // Get assignments and events for selected date
  const selectedDateAssignments = selectedDate
    ? getAssignmentsForDate(assignments, selectedDate)
    : []
  const selectedDateEvents = selectedDate
    ? getEventsForDate(events, selectedDate)
    : []

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Calendar</h2>
            <p className="text-sm text-text-muted mt-1">
              View all your assignments and events
              {config.connected && (
                <span className="ml-2 text-status-green">● Google Calendar connected</span>
              )}
            </p>
          </div>
          {isLoading && (
            <div className="text-sm text-text-muted">Loading events...</div>
          )}
        </div>

        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onNavigate={handleNavigate}
          onViewChange={handleViewChange}
        />
      </div>

      {/* Calendar content with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main calendar */}
        <div className="flex-1 overflow-auto">
          {view === 'month' ? (
            <MonthView
              year={year}
              month={month}
              assignments={assignments}
              events={events}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              assignments={assignments}
              events={events}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}
        </div>

        {/* Day details sidebar */}
        <DaySidebar
          isOpen={!!selectedDate}
          date={selectedDate}
          assignments={selectedDateAssignments}
          events={selectedDateEvents}
          onClose={handleCloseSidebar}
        />
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-status-red" />
            <span>Overdue/Urgent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-status-yellow" />
            <span>Due Soon (3-5 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-status-green" />
            <span>Upcoming (6-7 days)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-status-gray" />
            <span>Completed/Far</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-priority-low" />
            <span>Calendar Event</span>
          </div>
        </div>
      </div>
    </div>
  )
}
