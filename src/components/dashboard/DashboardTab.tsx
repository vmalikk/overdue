'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { format } from 'date-fns'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { NewAssignmentRow } from './NewAssignmentRow'
import { AssignmentDetailModal } from './AssignmentDetailModal'
import { Assignment } from '@/types/assignment'

function AnimatedCount({ value, color }: { value: number; color: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    const start = performance.now()
    const duration = 600
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(value * ease))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [value])

  return (
    <span style={{ color, fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
      {displayed}
    </span>
  )
}

interface NLPInputProps {
  courses: { id: string; code: string }[]
}

function NLPInput({ courses }: NLPInputProps) {
  const { apiKey } = useUIStore()
  const { addAssignment } = useAssignmentStore()
  const { showToast } = useUIStore()
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const handleEnter = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !value.trim()) return
    if (!apiKey) {
      showToast('Set a Gemini API key in Settings to use AI quick-add', 'info')
      return
    }
    setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const courseList = courses.map(c => c.id + ':' + c.code).join(', ')
      const res = await fetch('/api/gemini/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: value,
          today,
          courses: courseList,
          apiKey,
        }),
      })
      const data = await res.json()
      if (data.title && data.deadline) {
        await addAssignment({
          title: data.title,
          courseId: data.courseId || (courses[0]?.id || ''),
          deadline: new Date(data.deadline),
          category: data.category || 'assignment',
          status: 'not_started' as any,
        })
        setValue('')
        showToast(`Added: ${data.title}`, 'success')
      } else {
        showToast('Could not parse assignment. Try a clearer description.', 'error')
      }
    } catch (err) {
      showToast('AI parsing failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg3)',
        border: `1px solid ${focused ? 'var(--accent-border)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        {loading ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" style={{ animation: 'nlpSpin 0.8s linear infinite', flexShrink: 0 }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z"/>
          </svg>
        )}
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleEnter}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder='AI quick-add — "CS homework due Friday" or "physics quiz tomorrow 9am"'
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 13.5,
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, paddingLeft: 2 }}>
        AI-powered · understands natural language · press Enter
      </div>
    </div>
  )
}

export function DashboardTab() {
  const { user } = useAuth()
  const { assignments } = useAssignmentStore()
  const { courses } = useCourseStore()
  const { openQuickAdd } = useUIStore()
  const [now, setNow] = useState(new Date())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'week' | 'all'>('week')
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const nowTime = now.getTime()

  const allIncomplete = useMemo(() =>
    assignments.filter(a => a.status !== 'completed' && a.category !== 'event'),
    [assignments]
  )

  const overdueCount = useMemo(() =>
    allIncomplete.filter(a => new Date(a.deadline).getTime() < nowTime).length,
    [allIncomplete, nowTime]
  )

  const weekCount = useMemo(() =>
    allIncomplete.filter(a => {
      const d = new Date(a.deadline).getTime()
      return d >= nowTime && d <= nowTime + 7 * 86400000
    }).length,
    [allIncomplete, nowTime]
  )

  const laterCount = useMemo(() =>
    allIncomplete.filter(a => new Date(a.deadline).getTime() > nowTime + 7 * 86400000).length,
    [allIncomplete, nowTime]
  )

  const pending = useMemo(() => {
    let list = allIncomplete
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q))
    }
    if (filter === 'week') {
      list = list.filter(a => {
        const d = new Date(a.deadline).getTime()
        return d < nowTime || d <= nowTime + 7 * 86400000
      })
    }
    return list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [allIncomplete, search, filter, nowTime])

  const completed = useMemo(() => {
    let list = assignments.filter(a => a.status === 'completed' && a.category !== 'event')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q))
    }
    return list.sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime()).slice(0, 20)
  }, [assignments, search])

  return (
    <div style={{ padding: '24px 28px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Greeting + Clock */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, margin: '4px 0 0' }}>
            {overdueCount > 0
              ? <span style={{ color: 'var(--red)' }}>{overdueCount} overdue — get on it!</span>
              : <span>You're all caught up! 🎉</span>
            }
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '0.02em' }}>
            {format(now, 'h:mm:ss a')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
            {format(now, 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </div>

      {/* NLP Input */}
      <NLPInput courses={courses} />

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Overdue', value: overdueCount, color: 'var(--red)' },
          { label: 'Due this week', value: weekCount, color: 'var(--yellow)' },
          { label: 'Later', value: laterCount, color: 'var(--green)' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <AnimatedCount value={stat.value} color={stat.color} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter + Add */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '7px 12px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assignments..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)' }}
          />
        </div>
        {/* Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['week', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: filter === f ? 500 : 400,
                background: filter === f ? 'var(--bg4)' : 'transparent',
                color: filter === f ? 'var(--text)' : 'var(--text2)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {f === 'week' ? 'This week' : 'All'}
            </button>
          ))}
        </div>
        <button
          onClick={openQuickAdd}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add
        </button>
      </div>

      {/* Lists */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* PENDING section */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            padding: '0 2px',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>
              Pending
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text3)',
              background: 'var(--bg4)',
              padding: '1px 7px',
              borderRadius: 99,
            }}>
              {pending.length}
            </span>
          </div>
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {pending.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                Nothing due this week 🎉
              </div>
            ) : (
              pending.map((a, i) => (
                <div key={a.id} style={{ borderBottom: i < pending.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <NewAssignmentRow
                    assignment={a}
                    index={i}
                    onClick={() => setSelectedAssignment(a)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* COMPLETED section */}
        {completed.length > 0 && (
          <div style={{ opacity: 0.65 }}>
            <button
              onClick={() => setShowCompleted(p => !p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: 6,
                padding: '0 2px',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>
                Completed
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                  background: 'var(--bg4)', padding: '1px 7px', borderRadius: 99,
                }}>
                  {completed.length}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)' }}>{showCompleted ? '▲' : '▼'}</span>
              </div>
            </button>
            {showCompleted && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {completed.map((a, i) => (
                  <div key={a.id} style={{ borderBottom: i < completed.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <NewAssignmentRow assignment={a} index={i} onClick={() => setSelectedAssignment(a)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AssignmentDetailModal
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </div>
  )
}
