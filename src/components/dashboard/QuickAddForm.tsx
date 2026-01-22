'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { CourseSelect } from '@/components/courses/CourseSelect'
import { NLPInput } from '@/components/ai/NLPInput'
import { ParsedPreview } from '@/components/ai/ParsedPreview'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useAIStore } from '@/store/aiStore'
import { Priority } from '@/types/assignment'
import { NLPParseResult } from '@/types/ai'
import { DEFAULTS, LIMITS } from '@/config/constants'
import { MAX_FILE_SIZE } from '@/lib/appwrite/storage'

export function QuickAddForm() {
  const { isQuickAddOpen, closeQuickAdd, showToast } = useUIStore()
  const { addAssignment } = useAssignmentStore()
  const { getCourseByCode } = useCourseStore()
  const { isParsingEnabled, clearParseResult } = useAIStore()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    deadline: new Date(),
    priority: DEFAULTS.ASSIGNMENT_PRIORITY as Priority,
    estimatedHours: undefined as number | undefined,
    notes: '',
    file: undefined as File | undefined,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parsedResult, setParsedResult] = useState<NLPParseResult | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > LIMITS.ASSIGNMENT_TITLE_MAX) {
      newErrors.title = `Title must be ${LIMITS.ASSIGNMENT_TITLE_MAX} characters or less`
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Course is required'
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleParsed = useCallback((result: NLPParseResult) => {
    setParsedResult(result)
    // Pre-fill form with parsed data
    const parsed = result.parsed
    setFormData((prev) => ({
      ...prev,
      title: parsed.title || prev.title,
      deadline: parsed.deadline ? new Date(parsed.deadline) : prev.deadline,
      priority: (parsed.priority as Priority) || prev.priority,
      estimatedHours: parsed.estimatedHours || prev.estimatedHours,
      description: parsed.description || prev.description,
    }))
    
    // Try to match course by code
    if (parsed.courseCode) {
      const matchedCourse = getCourseByCode(parsed.courseCode)
      if (matchedCourse) {
        setFormData((prev) => ({ ...prev, courseId: matchedCourse.id }))
      }
    }
  }, [getCourseByCode])

  const handleAcceptParsed = async () => {
    if (!parsedResult) return
    
    // If course is still missing, show manual form
    if (!formData.courseId) {
      setShowManualForm(true)
      return
    }

    try {
      await addAssignment({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        courseId: formData.courseId,
        deadline: formData.deadline,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours,
        notes: formData.notes.trim() || undefined,
        aiParsed: true,
        aiConfidence: parsedResult.confidence,
      })

      showToast('Assignment added successfully', 'success')
      handleClose()
    } catch (error) {
      showToast('Failed to add assignment', 'error')
      console.error('Error adding assignment:', error)
    }
  }

  const handleEditParsed = () => {
    setShowManualForm(true)
  }

  const handleRejectParsed = () => {
    setParsedResult(null)
    clearParseResult()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await addAssignment({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        courseId: formData.courseId,
        deadline: formData.deadline,
        priority: formData.priority,
        estimatedHours: formData.estimatedHours,
        notes: formData.notes.trim() || undefined,
        file: formData.file,
        aiParsed: !!parsedResult,
        aiConfidence: parsedResult?.confidence,
      })

      showToast('Assignment added successfully', 'success')
      handleClose()
    } catch (error) {
      showToast('Failed to add assignment', 'error')
      console.error('Error adding assignment:', error)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      courseId: '',
      deadline: new Date(),
      priority: DEFAULTS.ASSIGNMENT_PRIORITY as Priority,
      estimatedHours: undefined,
      notes: '',
      file: undefined,
    })
    setErrors({})
    setParsedResult(null)
    setShowManualForm(false)
    clearParseResult()
    closeQuickAdd()
  }

  const priorityOptions = [
    { value: Priority.LOW, label: 'Low' },
    { value: Priority.MEDIUM, label: 'Medium' },
    { value: Priority.HIGH, label: 'High' },
  ]

  return (
    <Modal isOpen={isQuickAddOpen} onClose={handleClose} title="Add New Assignment" size="lg">
      {/* AI Parsing Input */}
      {isParsingEnabled && !parsedResult && !showManualForm && (
        <div className="mb-6 pb-6 border-b border-border">
          <p className="text-sm text-text-muted mb-3">
            ✨ Try AI parsing - describe your assignment naturally:
          </p>
          <NLPInput 
            onParsed={handleParsed}
            placeholder="e.g., ECE 306 lab due Friday 5pm, high priority"
          />
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="mt-3 text-xs text-text-muted hover:text-text-secondary"
          >
            Or enter manually →
          </button>
        </div>
      )}

      {/* Parsed Preview */}
      {parsedResult && !showManualForm && (
        <ParsedPreview
          result={parsedResult}
          onAccept={handleAcceptParsed}
          onEdit={handleEditParsed}
          onReject={handleRejectParsed}
        />
      )}

      {/* Manual Form */}
      {(showManualForm || !isParsingEnabled) && (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={errors.title}
          placeholder="e.g., Lab Report on Digital Circuits"
          required
          maxLength={LIMITS.ASSIGNMENT_TITLE_MAX}
        />

        {/* Course */}
        <CourseSelect
          label="Course"
          value={formData.courseId}
          onChange={(courseId) => setFormData({ ...formData, courseId })}
          error={errors.courseId}
          required
        />

        {/* Deadline */}
        <DatePicker
          label="Deadline"
          value={formData.deadline}
          onChange={(deadline) => setFormData({ ...formData, deadline })}
          error={errors.deadline}
          showTime
        />

        {/* Priority */}
        <Select
          label="Priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
          options={priorityOptions}
        />

        {/* Estimated Hours */}
        <Input
          label="Estimated Hours (optional)"
          type="number"
          min="0"
          step="0.5"
          value={formData.estimatedHours || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          placeholder="e.g., 3.5"
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details about the assignment..."
            maxLength={LIMITS.ASSIGNMENT_DESCRIPTION_MAX}
            rows={3}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-priority-medium resize-none"
          />
          <p className="mt-1 text-xs text-text-muted">
            {formData.description.length} / {LIMITS.ASSIGNMENT_DESCRIPTION_MAX}
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Attachment (max 10MB)
          </label>
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && file.size > MAX_FILE_SIZE) {
                setErrors({ ...errors, file: 'File too large (max 10MB)' })
                return
              }
              setErrors({ ...errors, file: '' })
              setFormData({ ...formData, file: file })
            }}
            error={errors.file}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="primary" fullWidth>
            Add Assignment
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </Modal>
  )
}
