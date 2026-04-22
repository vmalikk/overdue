'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useUIStore } from '@/store/uiStore'
import { DEFAULT_COURSE_COLORS, CourseFormData } from '@/types/course'
import { Course } from '@/types/course'
import { NewAssignmentRow } from '@/components/dashboard/NewAssignmentRow'
import { AssignmentDetailModal } from '@/components/dashboard/AssignmentDetailModal'
import { Assignment } from '@/types/assignment'

interface CourseCardProps {
  course: Course
  index: number
}

function CourseCard({ course, index }: CourseCardProps) {
  const { assignments } = useAssignmentStore()
  const { deleteCourse, updateCourse } = useCourseStore()
  const { showToast } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  const now = new Date()
  const courseAssignments = useMemo(() =>
    assignments.filter(a => a.courseId === course.id && a.category !== 'event'),
    [assignments, course.id]
  )
  const done = courseAssignments.filter(a => a.status === 'completed').length
  const total = courseAssignments.length
  const overdue = courseAssignments.filter(a => a.status !== 'completed' && new Date(a.deadline) < now).length
  const pending = total - done
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const upcoming = courseAssignments
    .filter(a => a.status !== 'completed')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      animation: `fadeUp 0.4s ease ${index * 0.07}s both`,
    }}>
      {/* Colored top bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${course.color}, ${course.color}b3)`,
      }} />

      <div style={{ padding: '16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: course.color,
                background: course.color + '18',
                border: `1px solid ${course.color}30`,
                padding: '2px 8px',
                borderRadius: 99,
              }}>
                {course.code}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
              {course.name}
            </div>
            {course.instructor && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{course.instructor}</div>
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: course.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>
            {pct}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: course.color,
            borderRadius: 99,
            transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${index * 0.07}s`,
          }} />
        </div>

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Total', value: total, color: 'var(--text2)' },
            { label: 'Done', value: done, color: 'var(--green)' },
            { label: 'Pending', value: pending, color: 'var(--yellow)' },
            { label: 'Overdue', value: overdue, color: overdue > 0 ? 'var(--red)' : 'var(--text3)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 7, padding: '6px 8px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: 'var(--mono)' }}>{s.value}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text3)', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Expand button */}
        {upcoming.length > 0 && (
          <button
            onClick={() => setExpanded(p => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text3)',
              fontSize: 11,
              padding: '4px 0',
            }}
          >
            <span>{expanded ? '▲' : '▼'}</span>
            <span>{expanded ? 'Hide' : `Show ${upcoming.length} upcoming`}</span>
          </button>
        )}
      </div>

      {/* Expanded assignment list */}
      {expanded && upcoming.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {upcoming.map((a, i) => (
            <div key={a.id} style={{ borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <NewAssignmentRow
                assignment={a}
                index={i}
                onClick={() => setSelectedAssignment(a)}
              />
            </div>
          ))}
        </div>
      )}

      <AssignmentDetailModal
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </div>
  )
}

export function CoursesTab() {
  const { courses, loadCourses, addCourse, deleteCourse } = useCourseStore()
  const { showToast } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<CourseFormData>({
    code: '',
    name: '',
    color: DEFAULT_COURSE_COLORS[0],
    instructor: '',
    active: true,
  })

  useEffect(() => { loadCourses() }, [loadCourses])

  const activeCourses = courses.filter(c => c.active)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      showToast('Course code and name are required', 'error')
      return
    }
    try {
      await addCourse(form)
      showToast('Course added!', 'success')
      setShowAdd(false)
      setForm({ code: '', name: '', color: DEFAULT_COURSE_COLORS[0], instructor: '', active: true })
    } catch {
      showToast('Failed to add course', 'error')
    }
  }

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Courses
        </h1>
        <button
          onClick={() => setShowAdd(p => !p)}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Add Course
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 20,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            animation: 'fadeUp 0.2s ease both',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)' }}>Code *</label>
            <input
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              placeholder="ECE 306"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)' }}>Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Embedded Systems"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)' }}>Instructor</label>
            <input
              value={form.instructor || ''}
              onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
              placeholder="Prof. Smith"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)' }}>Color</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {DEFAULT_COURSE_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: form.color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              Add
            </button>
            <button type="button" onClick={() => setShowAdd(false)} style={{
              background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Course grid */}
      {activeCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 14 }}>
          No courses yet. Add your first course!
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}>
          {activeCourses.map((course, i) => (
            <CourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 13,
  color: 'var(--text)',
  outline: 'none',
}
