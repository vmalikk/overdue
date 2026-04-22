'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useNextcloudStore } from '@/store/nextcloudStore'
import { useSolverStore } from '@/store/solverStore'
import { useGradescopeStore } from '@/store/gradescopeStore'
import { useMoodleStore } from '@/store/moodleStore'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { account } from '@/lib/appwrite/client'
import { GradescopeSyncSection } from './GradescopeSyncSection'
import { MoodleSyncSection } from './MoodleSyncSection'
import { CalendarSyncSection } from './CalendarSyncSection'

type SectionId = 'profile' | 'appearance' | 'gradescope' | 'moodle' | 'calendar' | 'ai' | 'shortcuts' | 'data' | 'developer'

const navItems: { id: SectionId; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'gradescope', label: 'Gradescope', icon: '📊' },
  { id: 'moodle', label: 'Moodle', icon: '🟠' },
  { id: 'calendar', label: 'Google Calendar', icon: '📅' },
  { id: 'ai', label: 'AI / Gemini', icon: '✨' },
  { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
  { id: 'data', label: 'Data & Storage', icon: '💾' },
  { id: 'developer', label: 'Developer', icon: '🔧' },
]

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('profile')
  const { apiKey, setApiKey, snowEnabled, toggleSnow, devUnlocked, setDevUnlocked, showToast, theme, setTheme, accentHue, setAccentHue } = useUIStore()
  const { assignments, deleteAllAssignments } = useAssignmentStore()
  const { courses, deleteAllCourses } = useCourseStore()
  const { user, signOut } = useAuth()

  const [devPasswordInput, setDevPasswordInput] = useState('')
  const DEV_PASSWORD = 'HelloBye123'

  const handleDevUnlock = async () => {
    if (devPasswordInput === DEV_PASSWORD) {
      setDevUnlocked(true)
      setDevPasswordInput('')
      try {
        const u = await account.get()
        await account.updatePrefs({ ...u.prefs, devUnlocked: true })
      } catch {}
      showToast('Developer features unlocked!', 'success')
    } else {
      showToast('Incorrect password', 'error')
    }
  }

  const handleExport = () => {
    const data = { assignments, courses, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `overdue-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported!', 'success')
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL data? This cannot be undone!\n${assignments.length} assignments, ${courses.length} courses`)) return
    try {
      await deleteAllAssignments()
      await deleteAllCourses()
      showToast('All data deleted', 'success')
    } catch {
      showToast('Failed to delete data', 'error')
    }
  }

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || 'U')

  const visibleNav = navItems.filter(item => {
    if (item.id === 'developer' && !devUnlocked) return false
    return true
  })

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--text3)',
    textTransform: 'uppercase',
    marginBottom: 12,
  }

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: 'var(--bg3)',
    borderRadius: 8,
    marginBottom: 8,
  }

  const inputS: React.CSSProperties = {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div>
            <p style={sectionLabel}>Profile</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), oklch(0.5 0.2 var(--ah)))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{user?.name || firstName}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>

            <div style={row}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Email</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{user?.email}</div>
              </div>
            </div>

            <button
              onClick={signOut}
              style={{
                width: '100%',
                padding: '11px',
                background: 'oklch(0.63 0.22 25 / 0.1)',
                border: '1px solid oklch(0.63 0.22 25 / 0.3)',
                borderRadius: 8,
                color: 'var(--red)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Sign Out
            </button>
          </div>
        )

      case 'appearance':
        return (
          <div>
            <p style={sectionLabel}>Appearance</p>

            {/* Theme */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Theme</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['dark', 'light'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 8,
                      border: `1px solid ${theme === t ? 'var(--accent-border)' : 'var(--border)'}`,
                      background: theme === t ? 'var(--accent-glow)' : 'var(--bg4)',
                      color: theme === t ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 13,
                      fontWeight: theme === t ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{t === 'dark' ? '🌙' : '☀️'}</span>
                    <span style={{ textTransform: 'capitalize' }}>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Accent Color</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Hue: {accentHue}°</div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={accentHue}
                onChange={e => setAccentHue(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div style={row}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Snow Animation</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Festive snowfall effect</div>
              </div>
              <Toggle value={snowEnabled} onChange={toggleSnow} />
            </div>
          </div>
        )

      case 'gradescope':
        return (
          <div>
            <p style={sectionLabel}>Gradescope</p>
            <GradescopeSyncSection />
          </div>
        )

      case 'moodle':
        return (
          <div>
            <p style={sectionLabel}>Moodle</p>
            <MoodleSyncSection />
          </div>
        )

      case 'calendar':
        return (
          <div>
            <p style={sectionLabel}>Google Calendar</p>
            <CalendarSyncSection />
          </div>
        )

      case 'ai':
        return <AISection inputS={inputS} sectionLabel={sectionLabel} row={row} />

      case 'shortcuts':
        return (
          <div>
            <p style={sectionLabel}>Keyboard Shortcuts</p>
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                ['D', 'Dashboard'],
                ['A', 'Assignments'],
                ['L', 'Calendar'],
                ['C', 'Courses'],
                ['S', 'Statistics'],
                ['N', 'New Assignment'],
                ['⌘ ,', 'Settings'],
                ['Esc', 'Close modal'],
              ].map(([key, desc], i, arr) => (
                <div key={key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{desc}</span>
                  <kbd style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    background: 'var(--bg4)',
                    border: '1px solid var(--border2)',
                    borderRadius: 5,
                    padding: '2px 8px',
                    color: 'var(--text2)',
                  }}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )

      case 'data':
        return (
          <div>
            <p style={sectionLabel}>Data & Storage</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={row}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Export Data</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{assignments.length} assignments, {courses.length} courses</div>
                </div>
                <button
                  onClick={handleExport}
                  style={btnStyle}
                >
                  Export JSON
                </button>
              </div>

              <div style={row}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Storage Backend</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Appwrite</div>
                </div>
              </div>

              {/* Developer gate */}
              {!devUnlocked && (
                <div style={{ marginTop: 16, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Developer password</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      value={devPasswordInput}
                      onChange={e => setDevPasswordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleDevUnlock()}
                      placeholder="Enter password"
                      style={{ ...inputS, flex: 1 }}
                    />
                    <button onClick={handleDevUnlock} style={btnStyle}>Unlock</button>
                  </div>
                </div>
              )}

              {/* Danger zone */}
              <div style={{ marginTop: 16, border: '1px solid oklch(0.63 0.22 25 / 0.25)', borderRadius: 10, padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 12 }}>
                  Danger Zone
                </div>
                <button
                  onClick={handleDeleteAll}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'oklch(0.63 0.22 25 / 0.08)',
                    border: '1px solid oklch(0.63 0.22 25 / 0.25)',
                    borderRadius: 8,
                    color: 'var(--red)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Delete All Data
                </button>
              </div>
            </div>
          </div>
        )

      case 'developer':
        return <DeveloperSection inputS={inputS} sectionLabel={sectionLabel} />

      default:
        return null
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%',
        maxWidth: 760,
        height: '80vh',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        display: 'flex',
        overflow: 'hidden',
        animation: 'fadeUp 0.2s ease both',
      }}>
        {/* Left nav */}
        <div style={{
          width: 180,
          minWidth: 180,
          borderRight: '1px solid var(--border)',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <div style={{ padding: '0 16px 16px', fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Settings
          </div>
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 16px',
                border: 'none',
                background: activeSection === item.id ? 'var(--bg4)' : 'transparent',
                cursor: 'pointer',
                color: activeSection === item.id ? 'var(--text)' : 'var(--text2)',
                fontSize: 13,
                textAlign: 'left',
                width: '100%',
                borderRadius: 0,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {navItems.find(n => n.id === activeSection)?.label}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          {renderSection()}
        </div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 99,
        background: value ? 'var(--accent)' : 'var(--bg4)',
        border: '1px solid var(--border2)',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: value ? 20 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function AISection({ inputS, sectionLabel, row }: any) {
  const { apiKey, setApiKey, showToast } = useUIStore()
  const [inputKey, setInputKey] = useState(apiKey || '')
  const [keyVisible, setKeyVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!inputKey.trim()) {
      showToast('Enter a valid Gemini API key', 'error')
      return
    }
    setLoading(true)
    try {
      setApiKey(inputKey.trim())
      const { jwt } = await account.createJWT()
      await fetch('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify({ apiKey: inputKey.trim() }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      })
      showToast('API key saved!', 'success')
    } catch {
      showToast('Saved locally (server sync failed)', 'info')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove API key? AI features will be disabled.')) return
    setApiKey(null)
    setInputKey('')
    try {
      const { jwt } = await account.createJWT()
      await fetch('/api/ai/config', { method: 'DELETE', headers: { 'Authorization': `Bearer ${jwt}` } })
    } catch {}
    showToast('API key removed', 'info')
  }

  return (
    <div>
      <p style={sectionLabel}>AI / Gemini</p>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Gemini API Key</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={keyVisible ? 'text' : 'password'}
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="AIza..."
              style={{ ...inputS, paddingRight: 40 }}
            />
            <button
              onClick={() => setKeyVisible(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
            >
              {keyVisible ? '🙈' : '👁'}
            </button>
          </div>
          <button onClick={handleSave} disabled={loading} style={btnStyle}>
            {loading ? '...' : 'Save'}
          </button>
        </div>
        {apiKey && (
          <button onClick={handleRemove} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Remove key
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>AI enables:</div>
        {['NLP quick-add ("homework due Friday")', 'Course from syllabus PDF', 'Smart study tips'].map(f => (
          <div key={f} style={{ fontSize: 12, color: 'var(--text2)', padding: '3px 0' }}>✓ {f}</div>
        ))}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--accent)', display: 'inline-block', marginTop: 8 }}
        >
          Get a free key from Google AI Studio →
        </a>
      </div>
    </div>
  )
}

function DeveloperSection({ inputS, sectionLabel }: any) {
  const nextcloud = useNextcloudStore()
  const solver = useSolverStore()
  const { showToast } = useUIStore()
  const [ncUrl, setNcUrl] = useState('')
  const [ncUser, setNcUser] = useState('')
  const [ncPass, setNcPass] = useState('')
  const [sessionKey, setSessionKey] = useState('')

  return (
    <div>
      <p style={sectionLabel}>Developer</p>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Nextcloud</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={ncUrl} onChange={e => setNcUrl(e.target.value)} placeholder="https://your.nextcloud.com" style={inputS} />
          <input value={ncUser} onChange={e => setNcUser(e.target.value)} placeholder="Username" style={inputS} />
          <input type="password" value={ncPass} onChange={e => setNcPass(e.target.value)} placeholder="App password" style={inputS} />
          <button
            onClick={async () => {
              try {
                await nextcloud.connect(ncUrl, ncUser, ncPass)
                showToast('Nextcloud connected!', 'success')
              } catch {
                showToast('Connection failed', 'error')
              }
            }}
            style={btnStyle}
          >
            Connect
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 10 }}>Claude AI Solver</div>
        <input value={sessionKey} onChange={e => setSessionKey(e.target.value)} placeholder="Session key" style={{ ...inputS, marginBottom: 8 }} />
        <button
          onClick={async () => {
            try {
              await solver.saveSessionKey(sessionKey)
              showToast('Solver session key saved!', 'success')
            } catch {
              showToast('Failed to save session key', 'error')
            }
          }}
          style={btnStyle}
        >
          Save Key
        </button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
