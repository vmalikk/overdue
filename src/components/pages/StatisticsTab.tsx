'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { format, subDays, isSameDay, startOfDay } from 'date-fns'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { AssignmentCategory } from '@/types/assignment'

function AnimatedCount({ value, color }: { value: number; color: string }) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>()
  useEffect(() => {
    const start = performance.now()
    const duration = 800
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(value * ease))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [value])
  return <span style={{ color, fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{displayed}</span>
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circ * (1 - pct / 100))
    }, 100)
    return () => clearTimeout(timer)
  }, [pct, circ])

  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg4)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>
          {Math.round(pct)}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>complete</span>
      </div>
    </div>
  )
}

export function StatisticsTab() {
  const { assignments } = useAssignmentStore()
  const { courses } = useCourseStore()
  const { snowEnabled, toggleSnow } = useUIStore()

  const now = new Date()

  const nonEventAssignments = useMemo(() =>
    assignments.filter(a => a.category !== AssignmentCategory.EVENT),
    [assignments]
  )

  const total = nonEventAssignments.length
  const completed = nonEventAssignments.filter(a => a.status === 'completed').length
  const overdue = nonEventAssignments.filter(a => a.status !== 'completed' && new Date(a.deadline) < now).length
  const dueThisWeek = nonEventAssignments.filter(a => {
    if (a.status === 'completed') return false
    const d = new Date(a.deadline).getTime()
    return d >= now.getTime() && d <= now.getTime() + 7 * 86400000
  }).length
  const completionPct = total > 0 ? (completed / total) * 100 : 0

  // Streak calculation
  const streak = useMemo(() => {
    const sortedCompleted = nonEventAssignments
      .filter(a => a.status === 'completed' && a.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())

    if (sortedCompleted.length === 0) return 0
    let streak = 0
    let checkDate = startOfDay(now)

    while (true) {
      const hasCompletion = sortedCompleted.some(a => isSameDay(new Date(a.completedAt!), checkDate))
      if (hasCompletion) {
        streak++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }
    return streak
  }, [nonEventAssignments])

  // 7-day trend
  const trendData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i)
      const total = nonEventAssignments.filter(a => isSameDay(new Date(a.deadline), day)).length
      const done = nonEventAssignments.filter(a =>
        a.status === 'completed' && a.completedAt && isSameDay(new Date(a.completedAt), day)
      ).length
      return { day, label: format(day, 'EEE'), total, done, isToday: isSameDay(day, now) }
    })
  }, [nonEventAssignments, now])

  const maxBarVal = Math.max(...trendData.map(d => d.total), 1)

  // Course workload
  const courseWorkload = useMemo(() => {
    return courses.filter(c => c.active).map(course => {
      const ca = nonEventAssignments.filter(a => a.courseId === course.id)
      return { course, total: ca.length, done: ca.filter(a => a.status === 'completed').length }
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  }, [courses, nonEventAssignments])

  // Category breakdown
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    nonEventAssignments.forEach(a => {
      const cat = a.category || 'other'
      counts.set(cat, (counts.get(cat) || 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat, count }))
  }, [nonEventAssignments])

  const catColors = ['var(--accent)', 'var(--yellow)', 'var(--green)', 'var(--red)', 'oklch(0.7 0.18 310)', 'var(--text2)']

  const sectionLabel = {
    fontSize: 10,
    fontWeight: 600 as const,
    letterSpacing: '0.1em',
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  }

  const card = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px',
  }

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
        Statistics
      </h1>

      {/* Top row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Completion ring */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={sectionLabel}>Completion Rate</div>
          <CompletionRing pct={completionPct} />
        </div>

        {/* Quick stats */}
        <div style={{ ...card }}>
          <div style={sectionLabel}>Overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total', value: total, color: 'var(--text)' },
              { label: 'Completed', value: completed, color: 'var(--green)' },
              { label: 'Overdue', value: overdue, color: 'var(--red)' },
              { label: 'This week', value: dueThisWeek, color: 'var(--yellow)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px' }}>
                <AnimatedCount value={s.value} color={s.color} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={sectionLabel}>Streak</div>
          {streak > 0 && (
            <div style={{ fontSize: 36, animation: 'flamePulse 1.5s ease-in-out infinite', marginBottom: 6 }}>🔥</div>
          )}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 42, fontWeight: 700, color: streak > 0 ? 'var(--yellow)' : 'var(--text3)', lineHeight: 1 }}>
            {streak}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>day streak</div>
          {streak === 0 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Complete something today!</div>}
        </div>
      </div>

      {/* 7-Day Trend */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionLabel}>7-Day Trend</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 100 }}>
          {trendData.map((d, i) => {
            const barH = maxBarVal > 0 ? (d.total / maxBarVal) * 80 : 0
            const doneH = d.total > 0 ? (d.done / d.total) * barH : 0
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%',
                    height: Math.max(barH, 3),
                    background: d.isToday ? 'var(--accent)' : 'var(--bg4)',
                    borderRadius: '3px 3px 0 0',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: `height 0.6s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s`,
                  }}>
                    {doneH > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${(doneH / Math.max(barH, 1)) * 100}%`,
                        background: 'var(--green)',
                        opacity: 0.5,
                      }} />
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: d.isToday ? 'var(--accent)' : 'var(--text3)' }}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Course Workload */}
      {courseWorkload.length > 0 && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={sectionLabel}>Course Workload</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courseWorkload.map(({ course, total, done }, i) => {
              const pct = total > 0 ? (done / total) * 100 : 0
              return (
                <div key={course.id} style={{ animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: course.color }}>{course.code}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{done}/{total}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: course.color,
                      borderRadius: 99,
                      transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s`,
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div style={{ ...card }}>
          <div style={sectionLabel}>By Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map(({ cat, count }, i) => (
              <div key={cat} style={{
                background: 'var(--bg3)',
                border: `1px solid ${catColors[i % catColors.length]}30`,
                borderRadius: 8,
                padding: '8px 12px',
                minWidth: 80,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: catColors[i % catColors.length], fontFamily: 'var(--mono)' }}>
                  {count}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>{cat}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
