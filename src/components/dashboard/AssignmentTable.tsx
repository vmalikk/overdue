'use client'

import { useEffect, useState } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { AssignmentRow } from './AssignmentRow'
import { AssignmentDetailModal } from './AssignmentDetailModal'
import { Assignment } from '@/types/assignment'
import { Input } from '@/components/ui/Input'
import clsx from 'clsx'

interface AssignmentTableProps {
  filterStatus?: 'incomplete' | 'all' | 'completed'
  filterTime?: 'week' | 'all'
}

export function AssignmentTable({ filterStatus = 'incomplete', filterTime = 'all' }: AssignmentTableProps) {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  const {
    filteredAssignments,
    loadAssignments,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
  } = useAssignmentStore()

  const { loadCourses } = useCourseStore()

  useEffect(() => {
    loadAssignments()
    loadCourses()
  }, [loadAssignments, loadCourses])
  // Apply props filters on top of store filters
  const displayedAssignments = filteredAssignments.filter(assignment => {
    // 1. Hide Calendar Events (keeping pure assignments only)
    if (assignment.category === 'event') return false;

    // 2. Status Filter
    if (filterStatus === 'incomplete') {
      // Show everything EXCEPT 'completed'. (Includes 'not_started', 'in_progress')
      if (assignment.status === 'completed') return false;
    } else if (filterStatus === 'completed') {
      // Show ONLY 'completed'
      if (assignment.status !== 'completed') return false;
    }

    // 3. Time Filter (Only for Dashboard / 'week' view)
    if (filterTime === 'week') {
      const now = new Date();
      // Ensure deadline is a valid Date object
      const deadline = new Date(assignment.deadline);
      if (isNaN(deadline.getTime())) return true; // Keep invalid dates to be safe (or log error)

      // "This Week" = Overdue items + Items due in next 7 days
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(now.getDate() + 7);

      // Hide if deadline is too far in future
      if (deadline > sevenDaysFromNow) return false;
    }

    return true;
  })



  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-priority-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-priority-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="w-full">
      {/* Search bar */}
      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search assignments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayedAssignments.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-text-muted mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-text-muted">
              {searchQuery
                ? 'No assignments match your search'
                : 'No assignments yet. Tap + to add one!'}
            </p>
          </div>
        ) : (
          displayedAssignments.map((assignment) => (
            <AssignmentRow key={assignment.id} assignment={assignment} isMobile />
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto border border-border rounded-lg">
        <table className="w-full">
          <thead className="bg-secondary sticky top-0">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left">
                <span className="text-sm font-semibold text-text-secondary">Status</span>
              </th>

              <th className="px-4 py-3 text-left" style={{ width: '40%' }}>
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Assignment
                  <SortIcon field="title" />
                </button>
              </th>

              <th className="px-4 py-3 text-left" style={{ width: '20%' }}>
                <span className="text-sm font-semibold text-text-secondary">Course</span>
              </th>

              <th className="px-4 py-3 text-left" style={{ width: '20%' }}>
                <button
                  onClick={() => handleSort('deadline')}
                  className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  Deadline
                  <SortIcon field="deadline" />
                </button>
              </th>

              <th className="px-4 py-3 text-center" style={{ width: '10%' }}>
                <button
                  onClick={() => handleSort('priority')}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors mx-auto"
                >
                  Priority
                  <SortIcon field="priority" />
                </button>
              </th>

              <th className="px-4 py-3 text-center" style={{ width: '10%' }}>
                <span className="text-sm font-semibold text-text-secondary">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {displayedAssignments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-12 h-12 text-text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-text-muted">
                      {searchQuery
                        ? 'No assignments match your search'
                        : 'No assignments found matching these filters.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedAssignments.map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} onClick={() => setSelectedAssignment(assignment)} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {displayedAssignments.length > 0 && (
        <div className="mt-4 text-sm text-text-muted text-center">
          Showing {displayedAssignments.length} assignment{displayedAssignments.length !== 1 ? 's' : ''}
        </div>
      )}

      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          isOpen={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  )
}
