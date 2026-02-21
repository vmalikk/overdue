'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Assignment } from '@/types/assignment'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useNextcloudStore } from '@/store/nextcloudStore'
import { useSolverStore } from '@/store/solverStore'
import { CourseBadge } from '@/components/courses/CourseBadge'
import { getFileDownloadUrl } from '@/lib/appwrite/storage'

import { format } from 'date-fns'
import { StudyTips } from '@/components/ai/StudyTips'

interface AssignmentDetailModalProps {
  assignment: Assignment | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

export function AssignmentDetailModal({
  assignment,
  isOpen,
  onClose,
  onEdit
}: AssignmentDetailModalProps) {
  const { getCourseById } = useCourseStore()
  const { openEditModal } = useUIStore()
  const { updateAssignment, assignments } = useAssignmentStore()
  const nextcloud = useNextcloudStore()
  const solver = useSolverStore()
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Use live data from the store so uploads reflect immediately
  const liveAssignment = assignment
    ? assignments.find(a => a.id === assignment.id) || assignment
    : null

  const solveJob = liveAssignment ? solver.jobs[liveAssignment.id] : undefined

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    } else if (assignment) {
      onClose()
      // Small timeout to ensure modal closes before next opens (avoid z-index fight)
      setTimeout(() => openEditModal(assignment.id), 100)
    }
  }

  useEffect(() => {
    const fetchFileUrl = async () => {
      if (assignment?.attachmentFileId) {
        try {
          const urlResult = await getFileDownloadUrl(assignment.attachmentFileId)
          const url = typeof urlResult === 'object' && 'href' in (urlResult as any)
            ? (urlResult as any).href
            : String(urlResult)

          setFileUrl(url)
        } catch (error) {
          console.error('Failed to get file URL:', error)
          setFileUrl(null)
        }
      } else {
        setFileUrl(null)
      }
    }

    if (isOpen && assignment) {
      fetchFileUrl()
    }
  }, [assignment, isOpen])

  if (!liveAssignment) return null

  const course = getCourseById(liveAssignment.courseId)

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={liveAssignment.title}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Details */}
        <div className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="flex justify-between items-start">
            {course && <CourseBadge course={course} />}
            <span className="px-2 py-1 bg-secondary text-text-primary text-xs rounded font-medium">
              {categoryIcons[liveAssignment.category] || '📄'} {liveAssignment.category}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Status</h3>
              <p className="text-text-primary capitalize">{liveAssignment.status.replace('_', ' ')}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Due Date</h3>
              <p className="text-text-primary">
                {format(new Date(liveAssignment.deadline), 'EEEE, MMMM d, yyyy')}
                <span className="text-text-muted ml-2">
                  at {format(new Date(liveAssignment.deadline), 'h:mm a')}
                </span>
              </p>
            </div>

            {liveAssignment.source === 'gradescope' && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Source</h3>
                <p className="text-text-primary flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Gradescope</span>
                  {liveAssignment.gradescopeCourseName}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {liveAssignment.notes && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Notes</h3>
                <div className="bg-secondary p-3 rounded-md text-sm text-text-primary whitespace-pre-wrap">
                  {liveAssignment.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Study Tips */}
        <div className="border-t border-border pt-4 mt-2">
          <StudyTips
            assignmentId={liveAssignment.id}
            title={liveAssignment.title}
            courseCode={course?.code}
            deadline={new Date(liveAssignment.deadline)}
          />
        </div>

        {/* Attachments Section */}
        {liveAssignment.attachmentFileId && (
          <div className="border-t border-border pt-4 mt-2">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              Attachments
            </h3>

            <div className="flex items-center p-3 bg-secondary rounded-lg border border-border group hover:border-primary/50 transition-colors">
              <div className="p-2 bg-background rounded-md mr-3 text-text-muted">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {liveAssignment.attachmentFileName || 'Attached Document'}
                </p>
                <p className="text-xs text-text-muted">
                  Document
                </p>
              </div>
              <div className="ml-4">
                {fileUrl ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                  >
                    View / Download
                  </a>
                ) : (
                  <span className="text-xs text-text-muted">Loading...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nextcloud Files Section */}
        {nextcloud.isConnected && (
          <div className="border-t border-border pt-4 mt-2">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Nextcloud Files
            </h3>

            {/* Existing Nextcloud files */}
            {liveAssignment.nextcloudFiles && liveAssignment.nextcloudFiles.length > 0 && (
              <div className="space-y-2 mb-3">
                {liveAssignment.nextcloudFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center p-3 bg-secondary rounded-lg border border-border group hover:border-primary/50 transition-colors">
                    <div className="p-2 bg-background rounded-md mr-3 text-text-muted">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                      <p className="text-xs text-text-muted truncate">{file.path}</p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <a
                        href={nextcloud.downloadFileUrl(file.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                      >
                        Download
                      </a>
                      <button
                        onClick={async () => {
                          await nextcloud.deleteFile(file.path)
                          // Would need to update assignment, but for now just reload
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-status-red/20 text-status-red rounded-md hover:bg-status-red/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !course) return
                setIsUploading(true)
                try {
                  const result = await nextcloud.uploadFile(file, course.name || course.code)
                  if (result) {
                    const existing = liveAssignment.nextcloudFiles || []
                    await updateAssignment(liveAssignment.id, {
                      nextcloudFiles: [...existing, result],
                    })
                  }
                } finally {
                  setIsUploading(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : '+ Upload to Nextcloud'}
            </Button>

            {/* Solve with Claude button */}
            {solver.isEnabled && liveAssignment.nextcloudFiles?.some(f => f.name.toLowerCase().endsWith('.pdf')) && (
              <div className="mt-3">
                {solveJob?.status === 'running' ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-sm text-blue-400">Solving with Claude... This may take a few minutes.</span>
                  </div>
                ) : solveJob?.status === 'completed' ? (
                  <div className="p-3 bg-status-green/10 border border-status-green/30 rounded-lg">
                    <p className="text-sm text-status-green mb-2">Solution ready!</p>
                    {solveJob.solutionPath && (
                      <a
                        href={nextcloud.downloadFileUrl(solveJob.solutionPath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium bg-status-green text-white rounded-md hover:opacity-90 transition-colors"
                      >
                        Download .tex Solution
                      </a>
                    )}
                  </div>
                ) : solveJob?.status === 'failed' ? (
                  <div className="p-3 bg-status-red/10 border border-status-red/30 rounded-lg">
                    <p className="text-sm text-status-red">Failed: {solveJob.error}</p>
                    <button
                      onClick={() => solver.clearJob(liveAssignment.id)}
                      className="text-xs text-text-muted hover:text-text-primary mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const pdfFile = liveAssignment.nextcloudFiles?.find(f => f.name.toLowerCase().endsWith('.pdf'))
                      if (pdfFile) {
                        solver.solveAssignment(liveAssignment.id, pdfFile.path, liveAssignment.title)
                      }
                    }}
                  >
                    🤖 Solve with Claude
                  </Button>
                )}
              </div>
            )}

            {/* Solution file if it exists */}
            {liveAssignment.solvedFilePath && (
              <div className="mt-3 flex items-center p-3 bg-status-green/10 border border-status-green/30 rounded-lg">
                <div className="p-2 bg-background rounded-md mr-3 text-status-green">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">Solution (LaTeX)</p>
                  <p className="text-xs text-text-muted truncate">{liveAssignment.solvedFilePath}</p>
                </div>
                <a
                  href={nextcloud.downloadFileUrl(liveAssignment.solvedFilePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium bg-status-green text-white rounded-md hover:opacity-90 transition-colors"
                >
                  Download
                </a>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="primary" onClick={handleEdit}>
            Edit Assignment
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
