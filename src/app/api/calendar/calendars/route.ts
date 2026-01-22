import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { listCalendars } from '@/lib/calendar/googleCalendar'

/**
 * GET /api/calendar/calendars
 * Lists all available calendars for the user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please connect your Google Calendar.' },
        { status: 401 }
      )
    }

    const calendars = await listCalendars(session.accessToken)

    return NextResponse.json({
      success: true,
      calendars,
    })
  } catch (error) {
    console.error('Error listing calendars:', error)
    return NextResponse.json(
      { error: 'Failed to list calendars', details: String(error) },
      { status: 500 }
    )
  }
}
