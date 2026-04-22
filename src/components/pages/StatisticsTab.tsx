'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { format, subDays, isSameDay, startOfDay } from 'date-fns'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { AssignmentCategory } from '@/types/assignment'

function AnimatedCount({ value, color, size = 36 }: { value: number; color: string; size?: number }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>()
  useEffect(() => {
    const start = performance.now()
    const duration = 900
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(value * ease))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [value])
  return (
    <span style={{ color, fontFamily: 'var(--mono)', fontSize: size, fontWeight: 700, lineHeight: 1 }}>
      {displayed}
    </span>
  )
}

function CompletionRing({ pct, size = 120, stroke = 9 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)
  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - pct / 100)), 120)
    return () => clearTimeout(t)
  }, [pct, circ])
  const cx = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: size * 0.22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
          {Math.round(pct)}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>done</span>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.1em',
  color: 'var(--text3)',
  textTransform: 'uppercase',
  marginBottom: 14,
}

export function StatisticsTab() {
  const { assignments } = useAssignmentStore()
  const { courses } = useCourseStore()
  const now = new Date()

  const nonEvent = useMemo(() =>
    assignments.filter(a => a.category !== AssignmentCategory.EVENT),
    [assignments]
  )

  const total = nonEvent.length
  const completed = nonEvent.filter(a => a.status === 'completed').length
  const overdue = nonEvent.filter(a => a.status !== 'completed' && new Date(a.deadline) < now).length
  const dueWeek = nonEvent.filter(a => {
    if (a.status === 'completed') return false
    const d = new Date(a.deadline).getTime()
    return d >= now.getTime() && d <= now.getTime() + 7 * 86400000
  }).length
  const pct = total > 0 ? (completed / total) * 100 : 0

  const streak = useMemo(() => {
    const sorted = nonEvent
      .filter(a => a.status === 'completed' && a.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    if (sorted.length === 0) return 0
    let s = 0
    let check = startOfDay(now)
    while (true) {
      const has = sorted.some(a => isSameDay(new Date(a.completedAt!), check))
      if (has) { s++; check = subDays(check, 1) } else break
    }
    return s
  }, [nonEvent])

  const trend = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i)
      const total = nonEvent.filter(a => isSameDay(new Date(a.deadline), day)).length
      const done = nonEvent.filter(a =>
        a.status === 'completed' && a.completedAt && isSameDay(new Date(a.completedAt), day)
      ).length
      return { day, label: format(day, 'EEE'), total, done, isToday: isSameDay(day, now) }
    }),
    [nonEvent, now]
  )
  const maxBar = Math.max(...trend.map(d => d.total), 1)

  const workload = useMemo(() =>
    courses.filter(c => c.active).map(course => {
      const ca = nonEvent.filter(a => a.courseId === course.id)
      const done = ca.filter(a => a.status === 'completed').length
      return { course, total: ca.length, done }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total),
    [courses, nonEvent]
  )

  const cats = useMemo(() => {
    const map = new Map<string, number>()
    nonEvent.forEach(a => map.set(a.category || 'other', (map.get(a.category || 'other') || 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ cat, count }))
  }, [nonEvent])

  const catColors = ['var(--accent)', 'var(--yellow)', 'var(--green)', 'var(--red)', 'oklch(0.7 0.18 310)', 'var(--text2)']

  const statCards = [
    { label: 'Total', value: total, color: 'var(--text)', accent: 'var(--border2)' },
    { label: 'Completed', value: completed, color: 'var(--green)', accent: 'var(--green)' },
    { label: 'Overdue', value: overdue, color: 'var(--red)', accent: 'var(--red)' },
    { label: 'Due this week', value: dueWeek, color: 'var(--yellow)', accent: 'var(--yellow)' },
  ]

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Statistics
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
          {total > 0
            ? <>{completed} of {total} assignments completed · {Math.round(pct)}% completion rate</>
            : 'No assignments yet'}
        </p>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            ...card,
            borderLeft: `3px solid ${s.accent}`,
            padding: '14px 16px',
          }}>
            <AnimatedCount value={s.value} color={s.color} size={32} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Completion + Streak row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Completion */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 24 }}>
          <CompletionRing pct={pct} size={110} stroke={9} />
          <div style={{ flex: 1 }}>
            <div style={sectionLabel}>Completion Rate</div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>
              {completed} / {total} assignments
            </div>
            <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: 'var(--accent)',
                borderRadius: 99,
                transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            {overdue > 0 && (
              <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 500 }}>
                {overdue} overdue
              </div>
            )}
            {overdue === 0 && completed > 0 && (
              <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>
                All caught up!
              </div>
            )}
          </div>
        </div>

        {/* Streak */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center' }}>
          <div style={sectionLabel}>Daily Streak</div>
          {streak > 0 && (
            <span style={{ fontSize: 32, display: 'block', animation: 'flamePulse 1.5s ease-in-out infinite' }}>🔥</span>
          )}
          {streak === 0 && (
            <span style={{ fontSize: 32, display: 'block', opacity: 0.4 }}>🔥</span>
          )}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 44, fontWeight: 700, color: streak > 0 ? 'var(--yellow)' : 'var(--text3)', lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {streak === 1 ? 'day streak' : 'day streak'}
          </div>
          <div style={{ fontSize: 11, color: streak > 0 ? 'var(--green)' : 'var(--text3)', marginTop: 4, fontWeight: 500 }}>
            {streak >= 7 ? 'On fire! 🎉' : streak > 0 ? 'Keep it up!' : 'Complete something today'}
          </div>
        </div>
      </div>

      {/* 7-Day Activity */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={sectionLabel}>7-Day Activity</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
              Due
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />
              Completed
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          {trend.map((d, i) => {
            const barH = (d.total / maxBar) * 120
            const doneH = d.total > 0 ? (d.done / d.total) * barH : 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {/* count above bar */}
                <span style={{ fontSize: 10, color: d.total > 0 ? 'var(--text2)' : 'transparent', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                  {d.total}
                </span>
                {/* bar container */}
                <div style={{ width: '100%', height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: Math.max(barH, d.total > 0 ? 4 : 2),
                    background: d.isToday ? 'var(--accent)' : 'var(--bg4)',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: `height 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.07}s`,
                    border: d.isToday ? '1px solid var(--accent-border)' : 'none',
                  }}>
                    {doneH > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(doneH / Math.max(barH, 1)) * 100}%`,
                        background: 'var(--green)',
                      }} />
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: d.isToday ? 700 : 400,
                  color: d.isToday ? 'var(--accent)' : 'var(--text3)',
                }}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Course Workload */}
      {workload.length > 0 && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={sectionLabel}>Course Workload</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workload.map(({ course, total, done }, i) => {
              const p = total > 0 ? (done / total) * 100 : 0
              return (
                <div key={course.id} style={{ animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: course.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{course.code}</span>
                      {course.name && (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{course.name}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{done}/{total}</span>
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)', fontWeight: 600, minWidth: 34, textAlign: 'right' }}>
                        {Math.round(p)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${p}%`,
                      background: course.color,
                      borderRadius: 99,
                      transition: `width 0.9s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {cats.length > 0 && (
        <div style={{ ...card }}>
          <div style={sectionLabel}>By Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cats.map(({ cat, count }, i) => {
              const color = catColors[i % catColors.length]
              const catPct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={cat} style={{
                  background: 'var(--bg3)',
                  border: `1px solid var(--border)`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  minWidth: 100,
                  flex: '1 1 100px',
                  maxWidth: 160,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color }}>{count}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{catPct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize', fontWeight: 500 }}>{cat}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: 'var(--text3)', fontSize: 13 }}>
          No assignment data yet. Add some assignments to see your stats.
        </div>
      )}
    </div>
  )
}
