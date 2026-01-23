'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Course } from '@/types/course'

interface CourseDetailModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
}

export function CourseDetailModal({ course, isOpen, onClose, onEdit }: CourseDetailModalProps) {
    if (!course) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={course.code}>
          <div className="space-y-6">
             {/* Header with Color and Name */}
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: course.color }} />
                <h3 className="text-xl font-bold text-text-primary">{course.name}</h3>
             </div>

             {/* Instructor Info */}
             <div className="space-y-2">
                <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Instructor</h4>
                <p className="text-text-primary">{course.instructor || 'Not specified'}</p>
                {course.professorEmail && (
                    <p className="text-sm text-primary hover:underline">
                        <a href={`mailto:${course.professorEmail}`}>{course.professorEmail}</a>
                    </p>
                )}
             </div>

             {/* Office Hours */}
             {course.officeHours && course.officeHours.length > 0 && (
                 <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Office Hours</h4>
                    <div className="grid gap-2">
                        {course.officeHours.map((oh, i) => (
                            <div key={i} className="bg-surface-hover p-3 rounded-md text-sm border border-border">
                                <div className="font-medium text-text-primary">{oh.day}</div>
                                <div className="text-text-secondary">{oh.startTime} - {oh.endTime}</div>
                                <div className="text-text-muted text-xs mt-1">{oh.location}</div>
                            </div>
                        ))}
                    </div>
                 </div>
             )}

             {/* Grade Breakdown */}
             {course.gradeWeights && course.gradeWeights.length > 0 && (
                 <div className="space-y-2">
                     <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Grade Breakdown</h4>
                     <ul className="space-y-1 bg-surface-hover p-4 rounded-md border border-border">
                        {course.gradeWeights.map((gw, i) => (
                            <li key={i} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                                <span className="text-text-secondary">{gw.category}</span>
                                <span className="font-mono font-medium text-text-primary">{gw.weight}%</span>
                            </li>
                        ))}
                     </ul>
                 </div>
             )}
             
             {/* Description */}
             {course.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Description</h4>
                    <p className="text-sm text-text-secondary">{course.description}</p>
                  </div>
             )}

             <div className="pt-4 flex justify-end gap-2 border-t border-border mt-4">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                {onEdit && <Button onClick={onEdit}>Edit Course</Button>}
             </div>
          </div>
        </Modal>
    )
}
