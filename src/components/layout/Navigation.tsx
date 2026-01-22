'use client'

import { useState } from 'react'
import clsx from 'clsx'

export type TabType = 'dashboard' | 'statistics' | 'fullcalendar' | 'courses' | 'calendar' | 'settings'

interface NavigationProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
}

export function Navigation({ currentTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: '📊' },
    { id: 'statistics' as TabType, label: 'Statistics', icon: '📈' },
    { id: 'fullcalendar' as TabType, label: 'Calendar', icon: '📅' },
    { id: 'courses' as TabType, label: 'Courses', icon: '📚' },
    { id: 'calendar' as TabType, label: 'Sync', icon: '🔗' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' },
  ]

  return (
    <nav className="border-b border-border bg-secondary">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium transition-colors relative',
                'hover:text-text-primary',
                currentTab === tab.id
                  ? 'text-text-primary'
                  : 'text-text-muted'
              )}
            >
              <span className="flex items-center gap-2">
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </span>
              {/* Active indicator */}
              {currentTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
