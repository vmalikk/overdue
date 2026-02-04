'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { getAllConflicts, resolveConflict as resolveConflictDB, getConflict } from '@/lib/appwrite/conflicts'
import { getAssignment, updateAssignment, addAssignment } from '@/lib/appwrite/database'
import { GradescopeConflict, ConflictResolution, GradescopeAssignment } from '@/types/gradescope'
import { format } from 'date-fns'
import Link from 'next/link'
import { ToastContainer } from '@/components/ui/Toast'
import { AssignmentStatus, AssignmentCategory } from '@/types/assignment'

export default function ConflictsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useUIStore()
  const { loadAssignments } = useAssignmentStore()

  const [conflicts, setConflicts] = useState<GradescopeConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [manualAssignments, setManualAssignments] = useState<Record<string, any>>({})

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Load conflicts
  useEffect(() => {
    if (user) {
      loadConflicts()
    }
  }, [user])

  const loadConflicts = async () => {
    if (!user) return

    setLoading(true)
    try {
      const conflictsList = await getAllConflicts(user.$id)
      setConflicts(conflictsList)

      // Load manual assignments for comparison
      const manualAssignmentsMap: Record<string, any> = {}
      for (const conflict of conflictsList) {
        const assignment = await getAssignment(conflict.manualAssignmentId)
        if (assignment) {
          manualAssignmentsMap[conflict.manualAssignmentId] = assignment
        }
      }
      setManualAssignments(manualAssignmentsMap)
    } catch (error) {
      console.error('Error loading conflicts:', error)
      showToast('Failed to load conflicts', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (conflict: GradescopeConflict, resolution: ConflictResolution) => {
    if (!user) return

    setResolving(conflict.id)
    try {
      const gradescopeData: GradescopeAssignment = JSON.parse(conflict.gradescopeData)

      switch (resolution) {
        case ConflictResolution.KEEP_MANUAL:
          // Just mark the conflict as resolved, keep the manual assignment as-is
          break

        case ConflictResolution.USE_GRADESCOPE:
          // Update the manual assignment with Gradescope data
          await updateAssignment(conflict.manualAssignmentId, {
            title: gradescopeData.title,
            deadline: new Date(gradescopeData.deadline),
            source: 'gradescope',
            gradescopeId: gradescopeData.id,
            gradescopeCourseId: gradescopeData.courseId,
            gradescopeCourseName: gradescopeData.courseName
          })
          break

        case ConflictResolution.KEEP_BOTH:
          // Create a new assignment from Gradescope data
          const manualAssignment = manualAssignments[conflict.manualAssignmentId]
          await addAssignment({
            title: gradescopeData.title,
            courseId: manualAssignment?.courseId || '',
            deadline: new Date(gradescopeData.deadline),
            status: AssignmentStatus.NOT_STARTED,
            category: AssignmentCategory.ASSIGNMENT,
            notes: `Imported from Gradescope (${gradescopeData.courseName})`,
            source: 'gradescope',
            gradescopeId: gradescopeData.id,
            gradescopeCourseId: gradescopeData.courseId,
            gradescopeCourseName: gradescopeData.courseName
          }, user.$id)
          break
      }

      // Mark conflict as resolved
      await resolveConflictDB(conflict.id, resolution)

      // Update local state
      setConflicts((prev) => prev.filter((c) => c.id !== conflict.id))

      // Reload assignments
      await loadAssignments()

      showToast('Conflict resolved successfully', 'success')
    } catch (error) {
      console.error('Error resolving conflict:', error)
      showToast('Failed to resolve conflict', 'error')
    } finally {
      setResolving(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-secondary">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">Assignment Conflicts</h1>
              <p className="text-sm text-text-muted">
                Resolve conflicts between your manual assignments and Gradescope imports
              </p>
            </div>
            <Link href="/dashboard?tab=settings">
              <Button variant="ghost" size="sm">
                Back to Settings
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {conflicts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                No Conflicts to Resolve
              </h2>
              <p className="text-text-muted mb-6">
                All your assignments are synced and up to date.
              </p>
              <Link href="/dashboard">
                <Button variant="primary">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-text-muted">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found.
                Review each one and choose how to resolve it.
              </p>

              {conflicts.map((conflict) => {
                const manualAssignment = manualAssignments[conflict.manualAssignmentId]
                const gradescopeData: GradescopeAssignment = JSON.parse(conflict.gradescopeData)
                const isResolving = resolving === conflict.id

                return (
                  <div
                    key={conflict.id}
                    className="bg-secondary border border-border rounded-lg overflow-hidden"
                  >
                    {/* Conflict Header */}
                    <div className="px-6 py-4 bg-accent border-b border-border">
                      <h3 className="font-semibold text-text-primary">
                        Potential Duplicate Assignment
                      </h3>
                      <p className="text-sm text-text-muted mt-1">
                        Found on {format(conflict.createdAt, 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      {/* Your Version */}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
                            Your Version
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-text-muted uppercase">Title</p>
                            <p className="text-text-primary font-medium">
                              {manualAssignment?.title || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase">Deadline</p>
                            <p className="text-text-primary">
                              {manualAssignment?.deadline
                                ? format(new Date(manualAssignment.deadline), 'PPp')
                                : 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase">Source</p>
                            <p className="text-text-secondary">Manually Created</p>
                          </div>
                        </div>
                      </div>

                      {/* Gradescope Version */}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-medium">
                            Gradescope Version
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-text-muted uppercase">Title</p>
                            <p className="text-text-primary font-medium">
                              {conflict.gradescopeTitle}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase">Deadline</p>
                            <p className="text-text-primary">
                              {format(new Date(conflict.gradescopeDeadline), 'PPp')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted uppercase">Course</p>
                            <p className="text-text-secondary">{conflict.gradescopeCourseName}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 bg-accent border-t border-border flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => handleResolve(conflict, ConflictResolution.KEEP_MANUAL)}
                      >
                        {isResolving ? 'Resolving...' : 'Keep Mine'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => handleResolve(conflict, ConflictResolution.USE_GRADESCOPE)}
                      >
                        {isResolving ? 'Resolving...' : 'Use Gradescope'}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isResolving}
                        onClick={() => handleResolve(conflict, ConflictResolution.KEEP_BOTH)}
                      >
                        {isResolving ? 'Resolving...' : 'Keep Both'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
      <ToastContainer />
    </>
  )
}
