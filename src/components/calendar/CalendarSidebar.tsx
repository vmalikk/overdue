'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar' // We might need to make this controlled later
import clsx from 'clsx'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useUIStore } from '@/store/uiStore'

interface CalendarSidebarProps {
  calendars: { id: string; name: string; backgroundColor?: string }[]
  selectedCalendarIds: string[]
  onToggleCalendar: (id: string) => void
  onConnect: () => void
  isConnected: boolean
  userEmail?: string
  currentDate?: Date
  onDateChange?: (date: Date) => void
  showOfficeHours: boolean
  onToggleOfficeHours: (show: boolean) => void
}

export function CalendarSidebar({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  onConnect,
  isConnected,
  userEmail,
  currentDate,
  onDateChange,
  showOfficeHours,
  onToggleOfficeHours
}: CalendarSidebarProps) {
  const { showToast } = useUIStore()

  const handleConnectClick = () => {
    if (isConnected) {
      showToast('Support for multiple Google accounts is coming soon.', 'info')
    } else {
      onConnect()
    }
  }

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-border bg-background pt-4 h-full overflow-y-auto">
      {/* Mini Calendar Container */}
      <div className="pl-0 pr-0 mb-6 px-2">
        <MiniCalendar value={currentDate} onChange={onDateChange} />
      </div>

      {/* Calendar Accounts */}
      <div className="px-4 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Calendars
          </h3>
          <button onClick={handleConnectClick} className="text-text-muted hover:text-text-primary" title="Add Calendar Account">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          {userEmail && (
            <div className="mb-2 px-2 py-1 text-xs text-text-muted break-words">
              {userEmail}
            </div>
          )}

          {isConnected && calendars.length > 0 ? (
            calendars.map(cal => (
              <div
                key={cal.id}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer group"
                onClick={() => onToggleCalendar(cal.id)}
              >
                <div className={clsx(
                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                  selectedCalendarIds.includes(cal.id)
                    ? "border-transparent"
                    : "border-text-muted"
                )}
                  style={{ backgroundColor: selectedCalendarIds.includes(cal.id) ? (cal.backgroundColor || '#3b82f6') : 'transparent' }}
                >
                  {selectedCalendarIds.includes(cal.id) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <span className="text-sm text-text-secondary truncate flex-1">{cal.name}</span>
                <div className="opacity-0 group-hover:opacity-100 text-text-muted text-xs">...</div>
              </div>
            ))
          ) : (
            <div className="px-2 py-2">
              <Button variant="secondary" size="sm" onClick={onConnect} className="w-full justify-start text-xs">
                Connect Google
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Office Hours Toggle */}
      <div className="px-4 pb-4">
        <div
          className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary cursor-pointer"
          onClick={() => onToggleOfficeHours(!showOfficeHours)}
        >
          <div className={clsx(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            showOfficeHours ? "border-transparent bg-orange-500" : "border-text-muted"
          )}>
            {showOfficeHours && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
          <span className="text-sm text-text-secondary">Office Hours</span>
        </div>
      </div>
