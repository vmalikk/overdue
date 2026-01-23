'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useCourseStore } from '@/store/courseStore'
import { getVisibleDateRange, getAssignmentsForDate, getEventsForDate, CalendarEvent, getOfficeHourEvents } from '@/lib/utils/calendarUtils'
import { GoogleStyleCalendarHeader, CalendarViewType } from '@/components/calendar/GoogleStyleCalendarHeader'
import { MonthView } from '@/components/calendar/MonthView'
import { GoogleStyleWeekView } from '@/components/calendar/GoogleStyleWeekView'
import { DayView } from '@/components/calendar/DayView'
import { DaySidebar } from '@/components/calendar/DaySidebar'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { signIn } from 'next-auth/react'

interface GoogleCalendar {
  id: string
  name: string
  backgroundColor?: string
}

export function FullCalendarPage() {
  const { data: session } = useSession()
  const { assignments } = useAssignmentStore()
  const { config, events, setEvents, setConnected } = useCalendarStore()
  const { courses } = useCourseStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarViewType>('week')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Multi-calendar state
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

  // Persist selectedCalendarIds to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCalendarIds', JSON.stringify(selectedCalendarIds))
    }
  }, [selectedCalendarIds])

  // Fetch available calendars list and restore selectedCalendarIds from localStorage
  useEffect(() => {
    async function getCalendars() {
      if (!session?.accessToken) {
        setConnected(false)
        return
      }
      setConnected(true)
      try {
        const res = await fetch('/api/calendar/calendars')
        const data = await res.json()
        if (data.success) {
          const mapped = data.calendars.map((c: any) => ({
            id: c.id,
            name: c.name || c.summary || 'Untitled',
            backgroundColor: c.backgroundColor || c.color || '#4285F4'
          }))
          setCalendars(mapped)
          // Restore selectedCalendarIds from localStorage if available and valid
          const stored = typeof window !== 'undefined' ? localStorage.getItem('selectedCalendarIds') : null
          let restored: string[] = []
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              if (Array.isArray(parsed)) {
                // Only keep ids that exist in mapped
                restored = parsed.filter((id: string) => mapped.some((c: any) => c.id === id))
              }
            } catch { }
          }
          if (restored.length > 0) {
            setSelectedCalendarIds(restored)
          } else if (mapped.length > 0) {
            // Default to ALL calendars selected
            setSelectedCalendarIds(mapped.map((c: any) => c.id))
          }
        }
      } catch (err) {
        console.error('Failed to load calendars', err)
      }
    }
    if (config.connected) {
      getCalendars()
    }
  }, [config.connected, session?.accessToken, setConnected])

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // Fetch Google Calendar events for visible date range AND selected calendars
  const fetchCalendarEvents = useCallback(async () => {
    if (!session?.accessToken || !config.connected || selectedCalendarIds.length === 0) {
      if (selectedCalendarIds.length === 0) setEvents([])
      return
    }

    setIsLoading(true)
    try {
      const { start, end } = getVisibleDateRange(currentDate, view)

      // Fetch for all selected calendars
      // Using Promise.all to fetch concurrently
      const promises = selectedCalendarIds.map(calId =>
        fetch(
          `/api/calendar/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&calendarId=${encodeURIComponent(calId)}`
        ).then(res => res.ok ? res.json() : { events: [] }).catch(e => ({ events: [] }))
      )

      const results = await Promise.all(promises)
      // Merge all events
      let allRemoteEvents: CalendarEvent[] = []

      results.forEach(data => {
        if (data.events) {
          const mapped = data.events.map((e: any) => ({
            id: e.googleCalendarEventId || e.id,
            summary: e.title || e.summary || 'Untitled',
            description: e.description,
            start: new Date(e.start),
            end: new Date(e.end),
            isAllDay: !e.start.includes('T'), // Basic check
            color: e.color // if available
          }))
          allRemoteEvents = [...allRemoteEvents, ...mapped]
        }
      })

      setEvents(allRemoteEvents)

    } catch (error) {
      console.error('Error fetching calendar events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, view, session?.accessToken, config.connected, setEvents, selectedCalendarIds])

  useEffect(() => {
    fetchCalendarEvents()
  }, [fetchCalendarEvents])

  // Process assignments: Separate "Tasks" from "Events"
  const { taskAssignments, dbEvents } = useMemo(() => {
    const tasks: typeof assignments = []
    const dbEvts: CalendarEvent[] = []

    assignments.forEach(a => {
      if (a.category === 'event') {
        // Parse end time from notes if available
        let endTime = new Date(new Date(a.deadline).getTime() + 60 * 60 * 1000) // Default 1h
        try {
          if (a.notes) {
            const parsed = JSON.parse(a.notes)
            if (parsed.end) {
              endTime = new Date(parsed.end)
            }
          }
        } catch (e) {
          // ignore parse error
        }

        dbEvts.push({
          id: a.id,
          summary: a.title,
          description: a.description,
          start: a.deadline,
          end: endTime,
          color: '#8e24aa', // Purple for internal DB events
          type: 'event', // treat as event
          assignmentId: a.id // link back if needed
        })
      } else {
        tasks.push(a)
      }
    })
    return { taskAssignments: tasks, dbEvents: dbEvts }
  }, [assignments])

  // Combine remote events, DB events, and course office hours
  const allEvents = useMemo(() => {
    const { start, end } = getVisibleDateRange(currentDate, view)
    const officeHours = getOfficeHourEvents(courses, start, end)

    // Deduplication logic (Optional):
    // If we have a Google Event (blue) and a DB Event (purple) with same googleCalendarEventId,
    // which one do we show? For now show both to confirm import worked, or filter?
    // Let's show both but maybe DB events are clearer "Imported" ones.

    return [...events, ...dbEvents, ...officeHours]
  }, [currentDate, view, courses, events, dbEvents])

  // Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date())
      return
    }

    switch (view) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
        break
      case 'week':
        setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
        break
      case 'day':
        setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1))
        break
    }
  }

  const handleViewChange = (newView: CalendarViewType) => {
    setView(newView)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleCloseSidebar = () => {
    setSelectedDate(null)
  }

  const handleConnect = () => {
    signIn('google', { callbackUrl: window.location.href })
  }

  // Get assignments and events for selected date
  const selectedDateAssignments = selectedDate
    ? getAssignmentsForDate(taskAssignments, selectedDate)
    : []
  const selectedDateEvents = selectedDate
    ? getEventsForDate(allEvents, selectedDate)
    : []

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-background border rounded-lg border-border overflow-hidden">
      {/* Sidebar List */}
      <CalendarSidebar
        calendars={calendars}
        selectedCalendarIds={selectedCalendarIds}
        onToggleCalendar={toggleCalendar}
        onConnect={handleConnect}
        isConnected={config.connected}
        userEmail={session?.user?.email || undefined}
        currentDate={currentDate}
        onDateChange={(date) => {
          setCurrentDate(date)
          setSelectedDate(date)
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-text-muted">
                {isLoading && (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin text-primary">⟳</span> Updating...
                  </span>
                )}
              </p>
            </div>
          </div>

          <GoogleStyleCalendarHeader
            currentDate={currentDate}
            view={view}
            onNavigate={handleNavigate}
            onViewChange={handleViewChange}
          />
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'month' && (
            <MonthView
              year={year}
              month={month}
              assignments={taskAssignments}
              events={allEvents}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}
          {view === 'week' && (
            <GoogleStyleWeekView
              currentDate={currentDate}
              assignments={taskAssignments}
              events={allEvents}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              assignments={taskAssignments}
              events={allEvents}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar (Details/Sync) */}
      {selectedDate && (
        <div className="w-80 border-l border-border bg-background flex flex-col overflow-y-auto">
          <DaySidebar
            isOpen={true} // Always open if selectedDate is set in this layout
            date={selectedDate}
            assignments={selectedDateAssignments}
            events={selectedDateEvents}
            onClose={handleCloseSidebar}
          />
        </div>
      )}
      {/* Use this space for right sidebar from screenshot if no date selected? 
           Screenshot has "Invite to Notion Calendar" etc. 
           For now, let's keep it clean or show a placeholder shortcuts panel. */}
      {!selectedDate && (
        <div className="hidden lg:block w-64 border-l border-border bg-background p-4">
          <h4 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Useful shortcuts</h4>
          <div className="space-y-2 text-sm text-text-secondary">
            <div className="flex justify-between"><span>Command menu</span><span className="text-text-muted">⌘ K</span></div>
            <div className="flex justify-between"><span>Today</span><span className="text-text-muted">T</span></div>
            <div className="flex justify-between"><span>Next period</span><span className="text-text-muted">J</span></div>
            <div className="flex justify-between"><span>Prev period</span><span className="text-text-muted">K</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

