'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Assignment, Priority } from '@/types/assignment'
import { useCourseStore } from '@/store/courseStore'
import { CourseBadge } from '@/components/courses/CourseBadge'
import { getFileDownloadUrl } from '@/lib/appwrite/storage'
import { format } from 'date-fns'

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
  const [fileUrl, setFileUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchFileUrl = async () => {
      if (assignment?.attachmentFileId) {
        try {
            // Check if we already have the full URL (if storage returns valid URL directly) or need to fetch it
            // The getFileDownloadUrl we implemented returns a URL object, but we need string
            // Let's assume the previous fix returns a URL object or string href
            const urlResult = await getFileDownloadUrl(assignment.attachmentFileId)
            // Just in case it returns an object with href (standard URL object)
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

  if (!assignment) return null

  const course = getCourseById(assignment.courseId)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignment.title}
      size="lg" // You might need to add 'lg' support to your Modal component or check existing sizes
    >
      <div className="space-y-6">
        {/* Header Details */}
        <div className="flex flex-col gap-2 border-b border-border pb-4">
            <div className="flex justify-between items-start">
               {course && <CourseBadge course={course} />}
               <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase
                 ${assignment.priority === Priority.HIGH ? 'bg-priority-high/10 text-priority-high' : 
                   assignment.priority === Priority.MEDIUM ? 'bg-priority-medium/10 text-priority-medium' : 
                   'bg-priority-low/10 text-priority-low'}`}>
                 {assignment.priority} Priority
               </span>
            </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Status</h3>
                    <p className="text-text-primary capitalize">{assignment.status.replace('_', ' ')}</p>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Due Date</h3>
                    <p className="text-text-primary">
                      {format(new Date(assignment.deadline), 'EEEE, MMMM d, yyyy')}
                      <span className="text-text-muted ml-2">
                        at {format(new Date(assignment.deadline), 'h:mm a')}
                      </span>
                    </p>
                </div>

                {assignment.estimatedHours && (
                  <div>
                      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Estimated Effort</h3>
                      <p className="text-text-primary">{assignment.estimatedHours} hours</p>
                  </div>
                )}
            </div>

            <div className="space-y-4">
                 <div>
                    <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Description</h3>
                    <p className="text-text-primary whitespace-pre-wrap">
                        {assignment.description || <span className="text-text-muted italic">No description provided</span>}
                    </p>
                 </div>

                 {assignment.notes && (
                   <div>
                      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-1">Notes</h3>
                      <div className="bg-secondary p-3 rounded-md text-sm text-text-primary whitespace-pre-wrap">
                          {assignment.notes}
                      </div>
                   </div>
                 )}
            </div>
        </div>

        {/* Attachments Section */}
        {assignment.attachmentFileId && (
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
                            {assignment.attachmentFileName || 'Attached Document'}
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

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button variant="primary" onClick={onEdit}>
                Edit Assignment
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
