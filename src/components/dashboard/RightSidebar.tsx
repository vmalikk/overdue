'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { getDeadlineInfo, getStatusColor } from '@/lib/utils/deadlineUtils'
import { differenceInSeconds, differenceInHours, differenceInDays } from 'date-fns'

export function RightSidebar() {
  const { assignments } = useAssignmentStore()
  const { courses } = useCourseStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const incomplete = assignments.filter(a => a.status !== 'completed')
  const nextDeadline = useMemo(() => {
    return incomplete
      .filter(a => new Date(a.deadline) > now)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]
      || incomplete.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]
  }, [incomplete, now])

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const daysWithAssignments = useMemo(() => {
    const map = new Map<string, boolean>()
    assignments.forEach(a => {
      if (a.status !== 'completed') {
        const key = format(new Date(a.deadline), 'yyyy-MM-dd')
        map.set(key, true)
      }
    })
    return map
  }, [assignments])

  // Countdown display
  const renderCountdown = () => {
    if (!nextDeadline) return null
    const deadline = new Date(nextDeadline.deadline)
    const diffSecs = differenceInSeconds(deadline, now)
    const diffHours = differenceInHours(deadline, now)
    const diffDays = differenceInDays(deadline, now)
    const course = courses.find(c => c.id === nextDeadline.courseId)
    const color = getStatusColor(deadline, false)

    let countdownDisplay: React.ReactNode
    let urgencyPct = 0

    if (diffSecs < 0) {
      countdownDisplay = (
        <div style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700 }}>
          OVERDUE
        </div>
      )
      urgencyPct = 100
    } else if (diffDays >= 2) {
      countdownDisplay = (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>
            {diffDays}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>days remaining</span>
        </div>
      )
      urgencyPct = Math.min(100, Math.max(0, (7 - diffDays) / 7 * 100))
    } else if (diffDays >= 1) {
      const remainHours = diffHours % 24
      const remainMins = Math.floor((diffSecs % 3600) / 60)
      countdownDisplay = (
        <div style={{ fontSize: 14, color, fontFamily: 'var(--mono)' }}>
          1 day · {remainHours}h {remainMins}m left
        </div>
      )
      urgencyPct = 85
    } else {
      const h = Math.floor(diffSecs / 3600)
      const m = Math.floor((diffSecs % 3600) / 60)
      const s = diffSecs % 60
      const isUnder1h = diffHours < 1
      countdownDisplay = (
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 28,
          fontWeight: 700,
          color,
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}>
          <span>{String(h).padStart(2,'0')}</span>
          <span style={{ opacity: 0.5 }}>:</span>
          <span>{String(m).padStart(2,'0')}</span>
          <span style={{ opacity: 0.5 }}>:</span>
          <span style={{ animation: isUnder1h ? 'dotPulse 1s ease-in-out infinite' : undefined }}>
            {String(s).padStart(2,'0')}
          </span>
        </div>
      )
      urgencyPct = isUnder1h ? 98 : 90
    }

    return (
      <div style={{
        background: 'var(--bg3)',
        border: `1px solid ${color}30`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: urgencyPct > 90 ? `0 0 16px ${color}18` : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 4,
        }}>
          {nextDeadline.title}
        </div>
        {course && (
          <span style={{
            fontSize: 10.5,
            color: course.color,
            background: course.color + '18',
            border: `1px solid ${course.color}30`,
            padding: '1px 7px',
            borderRadius: 99,
            display: 'inline-block',
            marginBottom: 10,
          }}>
            {course.code}
          </span>
        )}
        {countdownDisplay}

        {/* Urgency bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--bg4)',
        }}>
          <div style={{
            height: '100%',
            width: `${urgencyPct}%`,
            background: color,
            transition: 'width 1s linear',
          }} />
        </div>
      </div>
    )
  }

  // Course load
  const courseLoad = useMemo(() => {
    return courses.filter(c => c.active).map(course => {
      const courseAssignments = assignments.filter(a => a.courseId === course.id)
      const done = courseAssignments.filter(a => a.status === 'completed').length
      const total = courseAssignments.length
      const overdue = courseAssignments.filter(a => {
        if (a.status === 'completed') return false
        return new Date(a.deadline) < now
      }).length
      return { course, done, total, overdue }
    }).filter(cl => cl.total > 0)
  }, [courses, assignments, now])

  const sectionLabel = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  }

  return (
    <aside style={{
      width: 252,
      minWidth: 252,
      height: '100vh',
      background: 'var(--bg2)',
      borderLeft: '1px solid var(--border)',
      overflowY: 'auto',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      flexShrink: 0,
    }}>
      {/* Mini Calendar */}
      <section>
        <div style={sectionLabel}>Calendar</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['←','→'] as const).map((dir, i) => (
              <button
                key={dir}
                onClick={() => {
                  const d = new Date(currentMonth)
                  d.setMonth(d.getMonth() + (i === 0 ? -1 : 1))
                  setCurrentMonth(d)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
              >
                {dir}
              </button>
            ))}
          </div>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', padding: '2px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 0' }}>
          {calDays.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const hasItems = daysWithAssignments.has(dateKey)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const isCurrent = isToday(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date(0)) ? null : day)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '3px 2px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--accent-glow)' : 'transparent',
                  outline: isSelected ? '1px solid var(--accent-border)' : 'none',
                }}
              >
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  background: isCurrent ? 'var(--accent)' : 'transparent',
                  color: isCurrent ? '#fff' : isCurrentMonth ? 'var(--text)' : 'var(--text3)',
                  fontWeight: isCurrent ? 700 : 400,
                }}>
                  {format(day, 'd')}
                </span>
                {hasItems && (
                  <div style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    marginTop: 1,
                  }} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Next Deadline */}
      {nextDeadline && (
        <section>
          <div style={sectionLabel}>Next Deadline</div>
          {renderCountdown()}
        </section>
      )}

      {/* Course Load */}
      {courseLoad.length > 0 && (
        <section>
          <div style={sectionLabel}>Course Load</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courseLoad.map(({ course, done, total, overdue }) => {
              const pct = total > 0 ? (done / total) * 100 : 0
              return (
                <div key={course.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: course.color }}>
                      {course.code}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {overdue > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--red)' }}>
                          {overdue} overdue
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                        {done}/{total}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    height: 4,
                    background: 'var(--bg4)',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: course.color,
                      borderRadius: 99,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </aside>
  )
}
