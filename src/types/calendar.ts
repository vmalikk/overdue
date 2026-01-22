// Calendar event from Google Calendar
export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: Date
  end: Date
  colorId?: string
  assignmentId?: string              // Link to Assignment if synced
}

// Calendar connection configuration
export interface CalendarConfig {
  connected: boolean
  provider: 'google' | 'outlook' | 'apple'
  calendarId?: string
  accessToken?: string
  refreshToken?: string
  lastSync?: Date
  autoSync: boolean
  syncInterval: number               // minutes
}

// Sync conflict data
export interface SyncConflict {
  assignmentId: string
  localVersion: {
    title: string
    deadline: Date
    updatedAt: Date
  }
  remoteVersion: {
    title: string
    deadline: Date
    updatedAt: Date
  }
}

// Sync status
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  CONFLICT = 'conflict',
}

export interface SyncState {
  status: SyncStatus
  lastSync?: Date
  conflicts: SyncConflict[]
  error?: string
}
