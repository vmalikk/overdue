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

  // Fetch available calendars list
  useEffect(() => {
    async function getCalendars() {
      if (!session?.accessToken) {
         setConnected(false)
         return
      }
      setConnected(true) // Helper synchronizer
      try {
        const res = await fetch('/api/calendar/calendars')
        const data = await res.json()
        if (data.success) {
           // Map to our interface (API returns {id, summary, backgroundColor})
           // The previous fetchCalendars in SyncSection used id, name for mapping
           // Let's assume the API returns standard Google Calendar List Resource fields or just id/name.
           // We'll trust the API returns sensible data.
           const mapped = data.calendars.map((c: any) => ({
             id: c.id,
             name: c.name || c.summary || 'Untitled',
             backgroundColor: c.backgroundColor || c.color || '#4285F4'
           }))
           setCalendars(mapped)
           // Default select the primary one if none selected
           if (selectedCalendarIds.length === 0 && mapped.length > 0) {
             const primary = mapped.find((c: any) => c.primary) || mapped[0]
             setSelectedCalendarIds([primary.id])
           }
        }
      } catch (err) {
        console.error('Failed to load calendars', err)
      }
    }
    if (config.connected) {
       getCalendars()
    }
  }, [config.connected, session?.accessToken, setConnected]) // Removed selectedCalendarIds dependency loop

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

  // Combine remote events with course office hours
  const allEvents = useMemo(() => {
    const { start, end } = getVisibleDateRange(currentDate, view)
    const officeHours = getOfficeHourEvents(courses, start, end)
    return [...events, ...officeHours]
  }, [currentDate, view, courses, events])

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
    ? getAssignmentsForDate(assignments, selectedDate)
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
              assignments={assignments}
              events={allEvents}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}
          {view === 'week' && (
            <GoogleStyleWeekView
              currentDate={currentDate}
              assignments={assignments}
              events={allEvents}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              assignments={assignments}
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

