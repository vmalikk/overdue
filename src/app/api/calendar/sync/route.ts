import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '@/lib/calendar/googleCalendar'
import { Assignment } from '@/types/assignment'

/**
 * POST /api/calendar/sync
 * Performs a full sync between local assignments and Google Calendar
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
    const {
      assignments,
      calendarId = 'primary',
      direction = 'both' // 'import', 'export', or 'both'
    } = body as {
      assignments: Assignment[]
      calendarId?: string
      direction?: 'import' | 'export' | 'both'
    }

    const results = {
      imported: 0,
      exported: 0,
      updated: 0,
      errors: [] as string[],
      exportedEvents: [] as { assignmentId: string; googleCalendarEventId: string }[],
      importedEvents: [] as { title: string; deadline: Date; end: Date | string; googleCalendarEventId: string }[],
    }

    // Import from Google Calendar
    if (direction === 'import' || direction === 'both') {
      try {
        const events = await fetchCalendarEvents(
          session.accessToken,
          calendarId,
          new Date(), // From now
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days ahead
        )

        // Filter out events that are already tracked
        const existingEventIds = new Set(
          assignments
            .filter((a) => a.googleCalendarEventId)
            .map((a) => a.googleCalendarEventId)
        )

        const newEvents = events.filter((e) => !existingEventIds.has(e.id))

        results.importedEvents = newEvents.map((e) => ({
          title: e.summary,
          deadline: e.start,
          end: e.end,
          googleCalendarEventId: e.id,
        }))
        results.imported = newEvents.length
      } catch (error) {
        results.errors.push(`Import error: ${String(error)}`)
      }
    }

    // Export to Google Calendar
    if (direction === 'export' || direction === 'both') {
      for (const assignment of assignments) {
        try {
          if (assignment.googleCalendarEventId) {
            // Update existing event
            await updateCalendarEvent(
              session.accessToken,
              assignment.googleCalendarEventId,
              assignment,
              calendarId
            )
            results.updated++
          } else if (!assignment.calendarSynced) {
            // Create new event
            const eventId = await createCalendarEvent(
              session.accessToken,
              assignment,
              calendarId
            )
            results.exportedEvents.push({
              assignmentId: assignment.id,
              googleCalendarEventId: eventId
            })
            results.exported++
          }
        } catch (error) {
          results.errors.push(`Export error for "${assignment.title}": ${String(error)}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Sync complete. Imported: ${results.imported}, Exported: ${results.exported}, Updated: ${results.updated}`,
    })
  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      { error: 'Failed to sync calendar', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/calendar/sync
 * Removes an event from Google Calendar
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please connect your Google Calendar.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const calendarId = searchParams.get('calendarId') || 'primary'

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    await deleteCalendarEvent(session.accessToken, eventId, calendarId)

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar event', details: String(error) },
      { status: 500 }
    )
  }
}
