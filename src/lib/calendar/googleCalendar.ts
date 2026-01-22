import { google, calendar_v3 } from 'googleapis'
import { Assignment } from '@/types/assignment'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: Date
  end: Date
  colorId?: string
}

export interface ImportedEvent {
  title: string
  description?: string
  deadline: Date
  start: Date
  end: Date
  source: 'google_calendar'
  googleCalendarEventId: string
}

/**
 * Creates a Google Calendar API client with the given access token
 */
export function createCalendarClient(accessToken: string): calendar_v3.Calendar {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Fetches events from Google Calendar within a date range
 */
export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin?: Date,
  timeMax?: Date
): Promise<CalendarEvent[]> {
  const calendar = createCalendarClient(accessToken)
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin?.toISOString() || new Date().toISOString(),
    timeMax: timeMax?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })

  const events = response.data.items || []
  
  return events
    .filter((event) => event.start?.dateTime || event.start?.date)
    .map((event) => ({
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      description: event.description || undefined,
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      colorId: event.colorId || undefined,
    }))
}

/**
 * Converts Google Calendar events to importable assignment format
 */
export function eventsToImportFormat(events: CalendarEvent[]): ImportedEvent[] {
  return events.map((event) => ({
    title: event.summary,
    description: event.description,
    deadline: event.start,
    start: event.start,
    end: event.end,
    source: 'google_calendar' as const,
    googleCalendarEventId: event.id,
  }))
}

/**
 * Creates a Google Calendar event from an assignment
 */
export async function createCalendarEvent(
  accessToken: string,
  assignment: Assignment,
  calendarId: string = 'primary'
): Promise<string> {
  const calendar = createCalendarClient(accessToken)
  
  const deadline = new Date(assignment.deadline)
  const endTime = new Date(deadline.getTime() + (assignment.estimatedHours || 1) * 60 * 60 * 1000)

  const event: calendar_v3.Schema$Event = {
    summary: assignment.title,
    description: assignment.description || `Assignment: ${assignment.title}`,
    start: {
      dateTime: deadline.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  }

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  })

  return response.data.id!
}

/**
 * Updates an existing Google Calendar event
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  assignment: Assignment,
  calendarId: string = 'primary'
): Promise<void> {
  const calendar = createCalendarClient(accessToken)
  
  const deadline = new Date(assignment.deadline)
  const endTime = new Date(deadline.getTime() + (assignment.estimatedHours || 1) * 60 * 60 * 1000)

  const event: calendar_v3.Schema$Event = {
    summary: assignment.title,
    description: assignment.description || `Assignment: ${assignment.title}`,
    start: {
      dateTime: deadline.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  })
}

/**
 * Deletes a Google Calendar event
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  const calendar = createCalendarClient(accessToken)
  
  await calendar.events.delete({
    calendarId,
    eventId,
  })
}

/**
 * Lists available calendars for the user
 */
export async function listCalendars(accessToken: string): Promise<{ id: string; name: string }[]> {
  const calendar = createCalendarClient(accessToken)
  
  const response = await calendar.calendarList.list()
  const calendars = response.data.items || []

  return calendars.map((cal) => ({
    id: cal.id!,
    name: cal.summary || 'Unnamed Calendar',
  }))
}
