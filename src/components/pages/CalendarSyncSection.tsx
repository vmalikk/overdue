'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useCalendarStore } from '@/store/calendarStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { format } from 'date-fns'
import { SyncStatus } from '@/types/calendar'

interface ImportableEvent {
  title: string
  deadline: Date
  end?: string       // Add end time support
  googleCalendarEventId: string
}

export function CalendarSyncSection() {
  const { data: session, status } = useSession()
  const { config, syncState, setConnected, setCalendarId, startSync, syncSuccess, syncError, setLastSync } = useCalendarStore()
  const { assignments, loadAssignments } = useAssignmentStore()
  const { showToast } = useUIStore()

  const [calendars, setCalendars] = useState<{ id: string; name: string }[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState(config.calendarId || 'primary')
  const [importableEvents, setImportableEvents] = useState<ImportableEvent[]>([])
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Sync local state when store updates (e.g. from hydration)
  useEffect(() => {
    if (config.calendarId) {
      setSelectedCalendar(config.calendarId)
    }
  }, [config.calendarId])

  // Check if connected on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      setConnected(true)
      fetchCalendars()
    } else {
      // Don't disconnect if we have a persisted session valid? 
      // Actually, we rely on NextAuth session. If that expires, we disconnect.
      if (status === 'unauthenticated') {
        setConnected(false)
      }
    }
  }, [status, session, setConnected])

  const fetchCalendars = async () => {
    if (!session?.accessToken) return

    setIsLoadingCalendars(true)
    try {
      const response = await fetch('/api/calendar/calendars')
      const data = await response.json()

      if (data.success) {
        setCalendars(data.calendars)
        if (data.calendars.length > 0 && !config.calendarId) {
          setCalendarId(data.calendars[0].id)
          setSelectedCalendar(data.calendars[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching calendars:', error)
    } finally {
      setIsLoadingCalendars(false)
    }
  }

  const handleConnect = () => {
    signIn('google', { callbackUrl: window.location.href })
  }

  const handleDisconnect = () => {
    signOut({ redirect: false })
    setConnected(false)
    setCalendars([])
    setImportableEvents([])
  }

  const handleFetchEvents = async () => {
    if (!session?.accessToken) return

    startSync()
    try {
      const response = await fetch(`/api/calendar/events?calendarId=${selectedCalendar}`)
      const data = await response.json()

      if (data.success) {
        setImportableEvents(data.events)
        showToast(`Found ${data.count} events to import`, 'success')
        syncSuccess()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      syncError(String(error))
      showToast('Failed to fetch calendar events', 'error')
    }
  }

  // Need to get courses to assign a default course
  const { courses } = useCourseStore() // Ensure this is imported or available in scope. 
  // It is imported in line 8? No, only useAssignmentStore.
  // I need to import useCourseStore at line 8.

  const handleImportEvents = async () => {
    if (importableEvents.length === 0) return

    setIsImporting(true)
    try {
      // Always persist imported events as assignments in Appwrite DB
      const defaultCourse = useCourseStore.getState().courses.find(c => c.active)
      const courseIdToUse = defaultCourse?.id || 'general-import'

      let importedCount = 0
      for (const event of importableEvents) {
        try {
          // This will persist to Appwrite DB, making it available on all devices
          await useAssignmentStore.getState().addAssignment({
            title: event.title,
            description: 'Imported from Google Calendar',
            courseId: courseIdToUse,
            deadline: new Date(event.deadline),
            priority: 'medium',
            status: 'not_started',
            category: 'event', // Import as Event
            googleCalendarEventId: event.googleCalendarEventId,
            // Store end time in notes as JSON since we don't have an 'end' field on Assignment
            notes: JSON.stringify({
              end: event.end || new Date(new Date(event.deadline).getTime() + 60 * 60 * 1000).toISOString(), // Default 1h
              originalEvent: true
            })
          } as any)
          importedCount++
        } catch (e) {
          console.error('Failed to save imported event', e)
        }
      }
      showToast(`Imported ${importedCount} events`, 'success')
      setImportableEvents([])
      await loadAssignments() // Ensure state is up to date
      setLastSync(new Date())
    } catch (error) {
      showToast('Failed to import events', 'error')
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportAssignments = async () => {
    if (assignments.length === 0) {
      showToast('No assignments to export', 'info')
      return
    }

    setIsExporting(true)
    startSync()
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: assignments.filter((a) => !a.calendarSynced),
          calendarId: selectedCalendar,
          direction: 'export',
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast(`Exported ${data.results.exported} assignments, updated ${data.results.updated}`, 'success')
        syncSuccess()
        setLastSync(new Date())
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      syncError(String(error))
      showToast('Failed to export assignments', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFullSync = async () => {
    startSync()
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments,
          calendarId: selectedCalendar,
          direction: 'both',
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast(data.message, 'success')
        syncSuccess()
        setLastSync(new Date())
        loadAssignments()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      syncError(String(error))
      showToast('Sync failed', 'error')
    }
  }

  const getSyncStatusDisplay = () => {
    switch (syncState.status) {
      case SyncStatus.SYNCING:
        return { text: 'Syncing...', color: 'text-status-yellow', icon: '🔄' }
      case SyncStatus.SUCCESS:
        return { text: 'Synced', color: 'text-status-green', icon: '✓' }
      case SyncStatus.ERROR:
        return { text: 'Error', color: 'text-status-red', icon: '✕' }
      case SyncStatus.CONFLICT:
        return { text: 'Conflicts', color: 'text-status-yellow', icon: '⚠️' }
      default:
        return { text: 'Ready', color: 'text-text-muted', icon: '○' }
    }
  }

  const statusDisplay = getSyncStatusDisplay()

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Google Calendar Sync</h3>
          <p className="text-sm text-text-muted mt-1">
            Connect your Google Calendar to sync assignments
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${statusDisplay.color}`}>
          <span>{statusDisplay.icon}</span>
          <span>{statusDisplay.text}</span>
          {config.lastSync && (
            <span className="text-text-muted text-xs">
              (Last: {format(new Date(config.lastSync), 'MMM d, h:mm a')})
            </span>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <section className="bg-secondary border border-border rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-4">Connection</h4>

        {status === 'loading' ? (
          <div className="flex items-center gap-2 text-text-muted">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Checking connection...
          </div>
        ) : config.connected && session ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-status-green/20 rounded-full flex items-center justify-center">
                <span className="text-status-green text-lg">✓</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">Connected to Google Calendar</p>
                <p className="text-sm text-text-muted">{session.user?.email}</p>
              </div>
              <Button onClick={handleDisconnect} variant="ghost" size="sm" className="ml-auto">
                Disconnect
              </Button>
            </div>

            {/* Calendar Selection */}
            {calendars.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Select
                  label="Select Calendar"
                  value={selectedCalendar}
                  onChange={(e) => {
                    setSelectedCalendar(e.target.value)
                    setCalendarId(e.target.value)
                  }}
                  options={calendars.map((cal) => ({ value: cal.id, label: cal.name }))}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-muted">
              Connect your Google account to enable calendar synchronization.
            </p>
            <Button onClick={handleConnect} variant="primary">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                  />
                </svg>
                Connect Google Calendar
              </span>
            </Button>
          </div>
        )}
      </section>

      {/* Sync Actions - Only show when connected */}
      {config.connected && session && (
        <>
          <section className="bg-secondary border border-border rounded-lg p-6">
            <h4 className="font-medium text-text-primary mb-4">Sync Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleFetchEvents}
                variant="secondary"
                disabled={syncState.status === SyncStatus.SYNCING}
              >
                📥 Preview Import
              </Button>
              <Button
                onClick={handleExportAssignments}
                variant="secondary"
                disabled={isExporting || syncState.status === SyncStatus.SYNCING}
              >
                {isExporting ? '📤 Exporting...' : '📤 Export to Calendar'}
              </Button>
              <Button
                onClick={handleFullSync}
                variant="primary"
                disabled={syncState.status === SyncStatus.SYNCING}
              >
                {syncState.status === SyncStatus.SYNCING ? '🔄 Syncing...' : '🔄 Full Sync'}
              </Button>
            </div>
          </section>

          {/* Import Preview */}
          {importableEvents.length > 0 && (
            <section className="bg-secondary border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-text-primary">
                  Events to Import ({importableEvents.length})
                </h4>
                <Button onClick={handleImportEvents} variant="primary" size="sm" disabled={isImporting}>
                  {isImporting ? 'Importing...' : 'Import All'}
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importableEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-accent rounded">
                    <div>
                      <p className="font-medium text-text-primary">{event.title}</p>
                      <p className="text-sm text-text-muted">
                        {format(new Date(event.deadline), 'PPp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sync Error */}
          {syncState.error && (
            <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4">
              <p className="text-status-red font-medium">Sync Error</p>
              <p className="text-sm text-text-muted mt-1">{syncState.error}</p>
            </div>
          )}
        </>
      )}

      {/* Setup Instructions */}
      <section className="bg-secondary border border-border rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-4">Setup Instructions</h4>
        <p className="text-sm text-text-muted">
          To use Google Calendar sync, you need to configure your API credentials:
        </p>
        <ol className="list-decimal list-inside space-y-2 mt-3 text-sm text-text-muted">
          <li>Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
          <li>Create a new project or select an existing one</li>
          <li>Enable the Google Calendar API</li>
          <li>Create OAuth 2.0 credentials (Web application type)</li>
          <li>Add authorized redirect URI: <code className="bg-accent px-1 rounded">http://localhost:3000/api/auth/callback/google</code></li>
          <li>Copy your Client ID and Client Secret to <code className="bg-accent px-1 rounded">.env.local</code></li>
        </ol>
      </section>
    </div>
  )
}
