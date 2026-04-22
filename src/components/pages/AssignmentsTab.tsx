'use client'

import { useState, useMemo } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useUIStore } from '@/store/uiStore'
import { NewAssignmentRow } from '@/components/dashboard/NewAssignmentRow'
import { AssignmentDetailModal } from '@/components/dashboard/AssignmentDetailModal'
import { Assignment, AssignmentCategory } from '@/types/assignment'

type FilterType = 'active' | 'week' | 'overdue' | 'completed'

export function AssignmentsTab() {
  const { assignments } = useAssignmentStore()
  const { openQuickAdd } = useUIStore()
  const [filter, setFilter] = useState<FilterType>('active')
  const [search, setSearch] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)

  const now = new Date()

  const filtered = useMemo(() => {
    let list = assignments.filter(a => a.category !== AssignmentCategory.EVENT)

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(q))
    }

    switch (filter) {
      case 'active':
        list = list.filter(a => a.status !== 'completed')
        break
      case 'week':
        list = list.filter(a => {
          if (a.status === 'completed') return false
          const d = new Date(a.deadline).getTime()
          return d < now.getTime() || d <= now.getTime() + 7 * 86400000
        })
        break
      case 'overdue':
        list = list.filter(a => a.status !== 'completed' && new Date(a.deadline) < now)
        break
      case 'completed':
        list = list.filter(a => a.status === 'completed')
        break
    }

    return list.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [assignments, filter, search, now])

  const activeCount = assignments.filter(a => a.status !== 'completed' && a.category !== AssignmentCategory.EVENT).length
  const completedCount = assignments.filter(a => a.status === 'completed' && a.category !== AssignmentCategory.EVENT).length

  const filterOptions: { id: FilterType; label: string }[] = [
    { id: 'active', label: 'Active' },
    { id: 'week', label: 'This Week' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'completed', label: 'Completed' },
  ]

  return (
    <div style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Assignments
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>
            <span style={{ color: 'var(--text2)' }}>{activeCount}</span> active ·{' '}
            <span style={{ color: 'var(--green)' }}>{completedCount}</span> completed
          </p>
        </div>
        <button
          onClick={openQuickAdd}
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
          + New Assignment
        </button>
      </div>

      {/* Search + Filter */}
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
        <div style={{ display: 'flex', gap: 4 }}>
          {filterOptions.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${filter === f.id ? 'var(--accent-border)' : 'var(--border)'}`,
                borderRadius: 99,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: filter === f.id ? 500 : 400,
                background: filter === f.id ? 'var(--accent-glow)' : 'transparent',
                color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filter !== 'completed' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                  {search ? 'No assignments match your search' : 'No assignments here 🎉'}
                </div>
              ) : (
                filtered.map((a, i) => (
                  <div key={a.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
        )}

        {/* Completed list */}
        {filter === 'completed' && (
          <div style={{ opacity: 0.75 }}>
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>
                  No completed assignments yet
                </div>
              ) : (
                filtered.map((a, i) => (
                  <div key={a.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
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
        )}
      </div>

      <AssignmentDetailModal
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </div>
  )
}
