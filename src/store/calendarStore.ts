import { create } from 'zustand'
import { CalendarConfig, SyncState, SyncStatus, SyncConflict } from '@/types/calendar'

interface CalendarStore {
  // State
  config: CalendarConfig
  syncState: SyncState

  // Actions
  setConnected: (connected: boolean) => void
  setCalendarId: (calendarId: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLastSync: (date: Date) => void
  setAutoSync: (enabled: boolean) => void
  setSyncInterval: (minutes: number) => void

  // Sync actions
  startSync: () => void
  syncSuccess: () => void
  syncError: (error: string) => void
  addConflict: (conflict: SyncConflict) => void
  resolveConflict: (assignmentId: string) => void
  clearConflicts: () => void

  // Reset
  disconnect: () => void
}

const defaultConfig: CalendarConfig = {
  connected: false,
  provider: 'google',
  autoSync: true,
  syncInterval: 15, // 15 minutes
}

const defaultSyncState: SyncState = {
  status: SyncStatus.IDLE,
  conflicts: [],
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  config: defaultConfig,
  syncState: defaultSyncState,

  // Config actions
  setConnected: (connected: boolean) =>
    set((state) => ({
      config: { ...state.config, connected },
    })),

  setCalendarId: (calendarId: string) =>
    set((state) => ({
      config: { ...state.config, calendarId },
    })),

  setTokens: (accessToken: string, refreshToken: string) =>
    set((state) => ({
      config: { ...state.config, accessToken, refreshToken },
    })),

  setLastSync: (date: Date) =>
    set((state) => ({
      config: { ...state.config, lastSync: date },
    })),

  setAutoSync: (enabled: boolean) =>
    set((state) => ({
      config: { ...state.config, autoSync: enabled },
    })),

  setSyncInterval: (minutes: number) =>
    set((state) => ({
      config: { ...state.config, syncInterval: minutes },
    })),

  // Sync actions
  startSync: () =>
    set((state) => ({
      syncState: { ...state.syncState, status: SyncStatus.SYNCING },
    })),

  syncSuccess: () =>
    set((state) => ({
      syncState: { ...state.syncState, status: SyncStatus.SUCCESS, error: undefined },
      config: { ...state.config, lastSync: new Date() },
    })),

  syncError: (error: string) =>
    set((state) => ({
      syncState: { ...state.syncState, status: SyncStatus.ERROR, error },
    })),

  addConflict: (conflict: SyncConflict) =>
    set((state) => ({
      syncState: {
        ...state.syncState,
        status: SyncStatus.CONFLICT,
        conflicts: [...state.syncState.conflicts, conflict],
      },
    })),

  resolveConflict: (assignmentId: string) =>
    set((state) => ({
      syncState: {
        ...state.syncState,
        conflicts: state.syncState.conflicts.filter(
          (c) => c.assignmentId !== assignmentId
        ),
        status:
          state.syncState.conflicts.length === 1
            ? SyncStatus.IDLE
            : SyncStatus.CONFLICT,
      },
    })),

  clearConflicts: () =>
    set((state) => ({
      syncState: { ...state.syncState, conflicts: [], status: SyncStatus.IDLE },
    })),

  // Disconnect calendar
  disconnect: () =>
    set({
      config: defaultConfig,
      syncState: defaultSyncState,
    }),
}))
