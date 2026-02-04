'use client'

import { useState } from 'react'
import { Assignment, AssignmentStatus } from '@/types/assignment'
import { StatusIndicator } from './StatusIndicator'
import { CourseBadge } from '@/components/courses/CourseBadge'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { formatDeadline } from '@/lib/utils/dateUtils'
import clsx from 'clsx'

interface AssignmentRowProps {
  assignment: Assignment
  isMobile?: boolean
  onClick?: () => void
}

export function AssignmentRow({ assignment, isMobile = false, onClick }: AssignmentRowProps) {
  const { updateAssignment, deleteAssignment, completeAssignment, uncompleteAssignment } =
    useAssignmentStore()
  const { getCourseById } = useCourseStore()
  const { showToast } = useUIStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(assignment.title)

  const course = getCourseById(assignment.courseId)
  const isCompleted = assignment.status === 'completed'
  
  const isGradescope = assignment.source === 'gradescope' && assignment.gradescopeId && assignment.gradescopeCourseId
  const gradescopeUrl = isGradescope 
    ? `https://www.gradescope.com/courses/${assignment.gradescopeCourseId}/assignments/${assignment.gradescopeId}` 
    : null

  const handleTitleEdit = async () => {
    if (editedTitle.trim() && editedTitle !== assignment.title) {
      try {
        await updateAssignment(assignment.id, { title: editedTitle.trim() })
        showToast('Assignment updated', 'success')
      } catch (error) {
        showToast('Failed to update assignment', 'error')
      }
    }
    setIsEditing(false)
  }

  const handleRowClick = (e: React.MouseEvent) => {
    if (onClick && !isEditing) {
      onClick()
    }
  }

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (isCompleted) {
        await uncompleteAssignment(assignment.id)
        showToast('Assignment marked as incomplete', 'info')
      } else {
        await completeAssignment(assignment.id)
        showToast('Assignment completed!', 'success')
      }
    } catch (error) {
      showToast('Failed to update assignment', 'error')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete "${assignment.title}"?`)) {
      try {
        await deleteAssignment(assignment.id)
        showToast('Assignment deleted', 'success')
      } catch (error) {
        showToast('Failed to delete assignment', 'error')
      }
    }
  }

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const newStatus = e.target.value as AssignmentStatus
    try {
      await updateAssignment(assignment.id, {
        status: newStatus,
        completedAt: newStatus === AssignmentStatus.COMPLETED ? new Date() : undefined
      })
      showToast(`Status changed to ${statusLabels[newStatus]}`, 'success')
    } catch (error) {
      showToast('Failed to update status', 'error')
    }
  }

  const statusLabels: Record<AssignmentStatus, string> = {
    [AssignmentStatus.NOT_STARTED]: 'Not Started',
    [AssignmentStatus.IN_PROGRESS]: 'In Progress',
    [AssignmentStatus.COMPLETED]: 'Completed',
  }

  const categoryIcons: Record<string, string> = {
    'exam': '📝',
    'quiz': '✍️',
    'project': '🚀',
    'lab': '🧪',
    'discussion': '💬',
    'homework': '📚',
    'assignment': '📄',
    'event': '📅',
    'other': '📦'
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div
        className={clsx(
          'bg-secondary border border-border rounded-lg p-4 cursor-pointer transition-colors hover:bg-background-secondary',
          isCompleted && 'opacity-60'
        )}
        onClick={handleRowClick}
      >
        <div className="flex items-start gap-3">
          {/* Status & Complete */}
          <button
            onClick={handleComplete}
            className={clsx(
              'mt-1 p-1 rounded-full border-2 transition-colors flex-shrink-0',
              isCompleted
                ? 'border-status-green bg-status-green text-white'
                : 'border-text-muted hover:border-status-green'
            )}
          >
            {isCompleted && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {!isCompleted && <div className="w-3 h-3" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {gradescopeUrl ? (
                <a
                  href={gradescopeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={clsx(
                    'font-medium text-text-primary hover:text-blue-500 hover:underline',
                    isCompleted && 'line-through'
                  )}
                >
                  {assignment.title} <span className="text-xs opacity-50">↗</span>
                </a>
              ) : (
                <h3 className={clsx(
                  'font-medium text-text-primary',
                  isCompleted && 'line-through'
                )}>
                  {assignment.title}
                </h3>
              )}
              <span className="text-xs text-text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border flex-shrink-0">
                {categoryIcons[assignment.category] || '📄'} {assignment.category}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {course && <CourseBadge course={course} size="sm" />}
              <span className="text-xs text-text-muted">
                {formatDeadline(assignment.deadline)}
              </span>
              {/* Status dropdown for mobile */}
              <select
                value={assignment.status}
                onChange={handleStatusChange}
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-1 rounded border border-border bg-secondary text-text-primary"
              >
                <option value={AssignmentStatus.NOT_STARTED}>Not Started</option>
                <option value={AssignmentStatus.IN_PROGRESS}>In Progress</option>
                <option value={AssignmentStatus.COMPLETED}>Completed</option>
              </select>
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-2 rounded hover:bg-accent text-text-muted hover:text-status-red transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Desktop Table Row
  return (
    <tr
      className={clsx(
        'border-b border-border hover:bg-accent/30 transition-colors cursor-pointer',
        isCompleted && 'opacity-60'
      )}
      onClick={handleRowClick}
    >
      {/* Status Indicator */}
      <td className="px-4 py-3">
        <StatusIndicator assignment={assignment} />
      </td>

      {/* Title - 50% width */}
      <td className="px-4 py-3" style={{ width: '50%' }}>
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={handleTitleEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleEdit()
              if (e.key === 'Escape') {
                setEditedTitle(assignment.title)
                setIsEditing(false)
              }
            }}
            className="w-full px-2 py-1 bg-secondary border border-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium"
            autoFocus
          />
        ) : gradescopeUrl ? (
          <a
            href={gradescopeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              'text-left text-text-primary font-medium block hover:text-blue-500 group',
              isCompleted && 'line-through'
            )}
            title="Open in Gradescope"
          >
            <span className="group-hover:underline">{assignment.title}</span>
            <span className="text-xs text-text-muted mt-1 inline-block ml-2 bg-secondary px-1.5 py-0.5 rounded border border-border">
              {categoryIcons[assignment.category] || '📄'} {assignment.category}
            </span>
            <span className="ml-1 text-xs opacity-50 group-hover:opacity-100">↗</span>
          </a>
        ) : (
          <span
            className={clsx(
              'text-left text-text-primary font-medium block',
              isCompleted && 'line-through'
            )}
          >
            {assignment.title}
            <span className="text-xs text-text-muted mt-1 inline-block ml-2 bg-secondary px-1.5 py-0.5 rounded border border-border">
              {categoryIcons[assignment.category] || '📄'} {assignment.category}
            </span>
          </span>
        )}
      </td>

      {/* Course - 20% width */}
      <td className="px-4 py-3" style={{ width: '20%' }}>
        {course ? (
          <CourseBadge course={course} />
        ) : (
          <span className="text-text-muted text-sm">Unknown</span>
        )}
      </td>

      {/* Deadline - 20% width */}
      <td className="px-4 py-3 text-text-primary text-sm" style={{ width: '20%' }}>
        {formatDeadline(assignment.deadline)}
      </td>

      {/* Actions - 10% width */}
      <td className="px-4 py-3" style={{ width: '10%' }}>
        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <select
            value={assignment.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              'text-xs px-2 py-1 rounded border border-border bg-secondary text-text-primary cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-priority-medium'
            )}
            title="Change status"
          >
            <option value={AssignmentStatus.NOT_STARTED}>Not Started</option>
            <option value={AssignmentStatus.IN_PROGRESS}>In Progress</option>
            <option value={AssignmentStatus.COMPLETED}>Completed</option>
          </select>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-secondary text-text-muted hover:text-status-red transition-colors"
            title="Delete assignment"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
}
