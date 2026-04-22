'use client'

import { useState, useRef } from 'react'
import { Assignment } from '@/types/assignment'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { getDeadlineInfo } from '@/lib/utils/deadlineUtils'
import clsx from 'clsx'

interface NewAssignmentRowProps {
  assignment: Assignment
  index?: number
  onClick?: () => void
}

export function NewAssignmentRow({ assignment, index = 0, onClick }: NewAssignmentRowProps) {
  const { completeAssignment, uncompleteAssignment, deleteAssignment } = useAssignmentStore()
  const { getCourseById } = useCourseStore()
  const { showToast } = useUIStore()
  const [completing, setCompleting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const course = getCourseById(assignment.courseId)
  const isCompleted = assignment.status === 'completed'
  const deadline = new Date(assignment.deadline)
  const info = getDeadlineInfo(deadline, isCompleted)

  const isGradescope = assignment.source === 'gradescope' && assignment.gradescopeId && assignment.gradescopeCourseId
  let gradescopeUrl: string | null = null
  if (isGradescope) {
    if (assignment.gradescopeId!.startsWith('manual-')) {
      gradescopeUrl = `https://www.gradescope.com/courses/${assignment.gradescopeCourseId}`
    } else {
      gradescopeUrl = `https://www.gradescope.com/courses/${assignment.gradescopeCourseId}/assignments/${assignment.gradescopeId}`
    }
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (completing) return
    setCompleting(true)
    try {
      if (isCompleted) {
        await uncompleteAssignment(assignment.id)
      } else {
        await completeAssignment(assignment.id)
        showToast('Completed!', 'success')
      }
    } catch {
      showToast('Failed to update', 'error')
    } finally {
      setCompleting(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${assignment.title}"?`)) return
    setRemoving(true)
    try {
      await deleteAssignment(assignment.id)
    } catch {
      showToast('Failed to delete', 'error')
      setRemoving(false)
    }
  }

  const statusColor = info.color
  const borderColor = isCompleted ? 'var(--border)' : statusColor

  const categoryLabel = assignment.category
    ? assignment.category.charAt(0).toUpperCase() + assignment.category.slice(1)
    : ''

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderLeft: `3px solid ${borderColor}`,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        animation: `rowEnter 0.4s ease ${index * 0.04}s both`,
        opacity: removing ? 0 : 1,
        maxHeight: removing ? 0 : undefined,
        overflow: removing ? 'hidden' : undefined,
        transition: removing ? 'opacity 0.3s, max-height 0.3s' : undefined,
      }}
      className="assignment-row group"
      onClick={onClick}
    >
      <style>{`
        .assignment-row:hover {
          background: var(--bg3) !important;
        }
        .assignment-row .delete-btn {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .assignment-row:hover .delete-btn {
          opacity: 1;
        }
      `}</style>

      {/* Status dot */}
      <div style={{
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: isCompleted ? 'var(--text3)' : statusColor,
        flexShrink: 0,
        boxShadow: !isCompleted && (info.color === 'var(--red)' || info.color === 'var(--yellow)')
          ? `0 0 6px ${statusColor}`
          : undefined,
      }} />

      {/* Title + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5,
          fontWeight: 500,
          color: isCompleted ? 'var(--text3)' : 'var(--text)',
          textDecoration: isCompleted ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {gradescopeUrl ? (
            <a
              href={gradescopeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ color: 'inherit', textDecoration: 'inherit' }}
            >
              {assignment.title}
              <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 4 }}>↗</span>
            </a>
          ) : (
            assignment.title
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {course && (
            <span style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: course.color,
              background: course.color + '18',
              border: `1px solid ${course.color}30`,
              padding: '1px 7px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {course.code}
            </span>
          )}
          {categoryLabel && (
            <span style={{
              fontSize: 10.5,
              color: 'var(--text3)',
              background: 'var(--bg4)',
              border: '1px solid var(--border)',
              padding: '1px 7px',
              borderRadius: 99,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {categoryLabel}
            </span>
          )}
        </div>
      </div>

      {/* Deadline */}
      <div style={{
        flexShrink: 0,
        minWidth: 96,
        textAlign: 'right',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: isCompleted ? 'var(--text3)' : statusColor,
          fontFamily: 'var(--mono)',
        }}>
          {info.primary}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text3)',
          marginTop: 1,
        }}>
          {info.secondary}
        </div>
      </div>

      {/* Delete button (hidden, shows on hover) */}
      <button
        className="delete-btn"
        onClick={handleDelete}
        style={{
          padding: '4px 6px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--text3)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Delete"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: isCompleted ? 'none' : '2px solid var(--border2)',
          background: isCompleted ? 'var(--green)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.2s, border-color 0.2s',
        }}
        title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {isCompleted && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 16,
                strokeDashoffset: 0,
                animation: 'checkDraw 0.2s ease forwards',
              }}
            />
          </svg>
        )}
      </button>
    </div>
  )
}
