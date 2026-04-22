import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { fetchCalendarEvents, eventsToImportFormat, createCalendarEvent } from '@/lib/calendar/googleCalendar'
import { Assignment } from '@/types/assignment'

/**
 * GET /api/calendar/events
 * Fetches events from Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please connect your Google Calendar.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const calendarId = searchParams.get('calendarId') || 'primary'
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    const events = await fetchCalendarEvents(
      session.accessToken,
      calendarId,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    )

    const importableEvents = eventsToImportFormat(events)

    return NextResponse.json({
      success: true,
      events: importableEvents,
      count: importableEvents.length,
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/calendar/events
 * Creates a Google Calendar event from an assignment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please connect your Google Calendar.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { assignment, calendarId = 'primary' } = body as {
      assignment: Assignment
      calendarId?: string
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment data is required' },
        { status: 400 }
      )
    }

    const eventId = await createCalendarEvent(
      session.accessToken,
      assignment,
      calendarId
    )

    return NextResponse.json({
      success: true,
      eventId,
      message: 'Event created successfully',
    })
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar event', details: String(error) },
      { status: 500 }
    )
  }
}
