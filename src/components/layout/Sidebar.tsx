'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { useAssignmentStore } from '@/store/assignmentStore'

export type TabType = 'dashboard' | 'assignments' | 'statistics' | 'calendar' | 'courses' | 'settings'

interface SidebarProps {
  currentTab: TabType
  onTabChange: (tab: TabType) => void
}

const navItems = [
  {
    id: 'dashboard' as TabType,
    label: 'Dashboard',
    shortcut: 'D',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
        <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.9"/>
      </svg>
    ),
  },
  {
    id: 'assignments' as TabType,
    label: 'Assignments',
    shortcut: 'A',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 3h2M1 7h2M1 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M5 3h8M5 7h8M5 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
        <path d="M2 3l0 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="2" cy="3" r="0.8" fill="currentColor"/>
        <circle cx="2" cy="7" r="0.8" fill="currentColor"/>
        <circle cx="2" cy="11" r="0.8" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'calendar' as TabType,
    label: 'Calendar',
    shortcut: 'L',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4 1v3M10 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="3" y="8" width="2" height="1.5" rx="0.5" fill="currentColor" opacity="0.7"/>
        <rect x="6.5" y="8" width="2" height="1.5" rx="0.5" fill="currentColor" opacity="0.7"/>
        <rect x="10" y="8" width="1" height="1.5" rx="0.5" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 'courses' as TabType,
    label: 'Courses',
    shortcut: 'C',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L1 5l6 3 6-3-6-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M1 5v4M13 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M3 6.5v2.5c0 1 1.8 2 4 2s4-1 4-2V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'statistics' as TabType,
    label: 'Statistics',
    shortcut: 'S',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="8" width="3" height="5" rx="0.8" fill="currentColor" opacity="0.6"/>
        <rect x="5.5" y="5" width="3" height="8" rx="0.8" fill="currentColor" opacity="0.8"/>
        <rect x="10" y="2" width="3" height="11" rx="0.8" fill="currentColor"/>
      </svg>
    ),
  },
]

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { user } = useAuth()
  const { assignments } = useAssignmentStore()
  const navRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pillStyle, setPillStyle] = useState({ top: 0, height: 36 })
  const [mounted, setMounted] = useState(false)

  const overdueCount = assignments.filter(a => {
    if (a.status === 'completed') return false
    const deadline = new Date(a.deadline)
    return deadline < new Date()
  }).length

  const activeIdx = navItems.findIndex(n => n.id === currentTab)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const idx = navItems.findIndex(n => n.id === currentTab)
    const btn = navRefs.current[idx]
    if (btn) {
      setPillStyle({ top: btn.offsetTop, height: btn.offsetHeight })
    }
  }, [currentTab, mounted])

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || 'U')

  return (
    <aside
      style={{
        width: 168,
        minWidth: 168,
        height: '100vh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0 16px',
        animation: 'sidebarIn 0.35s ease forwards',
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 16px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          color: 'var(--accent)',
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}>
          overdue
        </span>
        <span style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'dotPulse 2.4s ease-in-out infinite',
          flexShrink: 0,
        }} />
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '0 8px', position: 'relative' }}>
        {/* Sliding pill */}
        {mounted && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: pillStyle.top,
              height: pillStyle.height,
              background: 'var(--bg4)',
              borderRadius: 8,
              transition: 'top 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s cubic-bezier(0.4,0,0.2,1)',
              pointerEvents: 'none',
            }}
          />
        )}

        {navItems.map((item, idx) => {
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              ref={el => { navRefs.current[idx] = el }}
              onClick={() => onTabChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                gap: 9,
                animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
                color: isActive ? 'var(--text)' : 'var(--text2)',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 500 : 400, textAlign: 'left' }}>
                {item.label}
              </span>
              {/* Overdue badge on Assignments */}
              {item.id === 'assignments' && overdueCount > 0 && (
                <span style={{
                  background: 'var(--red)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: 99,
                  lineHeight: 1.6,
                }}>
                  {overdueCount}
                </span>
              )}
              {/* Keyboard shortcut hint */}
              {!isActive && item.id !== 'assignments' && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--text3)',
                  fontFamily: 'var(--mono)',
                  opacity: 0.7,
                }}>
                  {item.shortcut}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Settings button */}
      <div style={{ padding: '0 8px 8px' }}>
        <button
          onClick={() => onTabChange('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '9px 10px',
            borderRadius: 8,
            border: 'none',
            background: currentTab === 'settings' ? 'var(--bg4)' : 'transparent',
            cursor: 'pointer',
            gap: 9,
            color: currentTab === 'settings' ? 'var(--text)' : 'var(--text2)',
            transition: 'color 0.15s, background 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span style={{ flex: 1, fontSize: 13, textAlign: 'left' }}>Settings</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>⌘,</span>
        </button>
      </div>

      {/* User section */}
      <div style={{
        padding: '12px 12px 0',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--accent)',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firstName}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email || ''}
          </div>
        </div>
      </div>
    </aside>
  )
}
