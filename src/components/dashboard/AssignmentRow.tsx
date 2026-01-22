'use client'

import { useState } from 'react'
import { Assignment } from '@/types/assignment'
import { StatusIndicator } from './StatusIndicator'
import { CourseBadge } from '@/components/courses/CourseBadge'
import { Button } from '@/components/ui/Button'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { formatDeadline } from '@/lib/utils/dateUtils'
import clsx from 'clsx'

interface AssignmentRowProps {
  assignment: Assignment
  isMobile?: boolean
}

export function AssignmentRow({ assignment, isMobile = false }: AssignmentRowProps) {
  const { updateAssignment, deleteAssignment, completeAssignment, uncompleteAssignment } =
    useAssignmentStore()
  const { getCourseById } = useCourseStore()
  const { showToast } = useUIStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(assignment.title)

  const course = getCourseById(assignment.courseId)
  const isCompleted = assignment.status === 'completed'

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

  const handleComplete = async () => {
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

  const handleDelete = async () => {
    if (confirm(`Delete "${assignment.title}"?`)) {
      try {
        await deleteAssignment(assignment.id)
        showToast('Assignment deleted', 'success')
      } catch (error) {
        showToast('Failed to delete assignment', 'error')
      }
    }
  }

  const priorityIcons = {
    high: '⚡',
    medium: '➖',
    low: '⬇️',
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div
        className={clsx(
          'bg-secondary border border-border rounded-lg p-4',
          isCompleted && 'opacity-60'
        )}
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
              <h3 className={clsx(
                'font-medium text-text-primary',
                isCompleted && 'line-through'
              )}>
                {assignment.title}
              </h3>
              <span className="text-lg flex-shrink-0" title={`${assignment.priority} priority`}>
                {priorityIcons[assignment.priority]}
              </span>
            </div>
            
            {assignment.description && (
              <p className="text-sm text-text-muted mt-1 line-clamp-2">
                {assignment.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {course && <CourseBadge course={course} size="sm" />}
              <span className="text-xs text-text-muted">
                {formatDeadline(assignment.deadline)}
              </span>
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
        'border-b border-border hover:bg-accent/30 transition-colors',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Status Indicator */}
      <td className="px-4 py-3">
        <StatusIndicator assignment={assignment} />
      </td>

      {/* Title - 40% width */}
      <td className="px-4 py-3" style={{ width: '40%' }}>
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
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
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={clsx(
              'text-left text-text-primary hover:text-priority-medium transition-colors',
              isCompleted && 'line-through'
            )}
          >
            {assignment.title}
          </button>
        )}
        {assignment.description && (
          <p className="text-sm text-text-muted mt-1 line-clamp-1">
            {assignment.description}
          </p>
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

      {/* Priority - 10% width */}
      <td className="px-4 py-3 text-center" style={{ width: '10%' }}>
        <span className="text-xl" title={`${assignment.priority} priority`}>
          {priorityIcons[assignment.priority]}
        </span>
      </td>

      {/* Actions - 10% width */}
      <td className="px-4 py-3" style={{ width: '10%' }}>
        <div className="flex items-center gap-2">
          {/* Complete button */}
          <button
            onClick={handleComplete}
            className={clsx(
              'p-1 rounded hover:bg-secondary transition-colors',
              isCompleted ? 'text-status-green' : 'text-text-muted hover:text-status-green'
            )}
            title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
          >
            <svg
              className="w-5 h-5"
              fill={isCompleted ? 'currentColor' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>

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
