'use client'

import { useState, useEffect, useRef } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CourseBadge } from './CourseBadge'
import { CourseDetailModal } from './CourseDetailModal'
import { DEFAULT_COURSE_COLORS, CourseFormData, OfficeHour, GradeWeight } from '@/types/course'
import { ParsedSyllabus } from '@/types/ai'
import { AssignmentCategory, AssignmentStatus, Priority } from '@/types/assignment'
import { LIMITS } from '@/config/constants'
import clsx from 'clsx'

export function CourseManager() {
  const { courses, loadCourses, addCourse, updateCourse, deleteCourse } = useCourseStore()
  const { addAssignment } = useAssignmentStore()
  const { showToast } = useUIStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isAdding, setIsAdding] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null)
  const [pendingAssignments, setPendingAssignments] = useState<ParsedSyllabus['assignments'] | null>(null)
  
  const [formData, setFormData] = useState<CourseFormData>({
    code: '',
    name: '',
    color: DEFAULT_COURSE_COLORS[0],
    instructor: '',
    professorEmail: '',
    description: '',
    officeHours: [],
    gradeWeights: []
  })

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      color: DEFAULT_COURSE_COLORS[0],
      instructor: '',
      professorEmail: '',
      description: '',
      officeHours: [],
      gradeWeights: []
    })
    setIsAdding(false)
    setEditingId(null)
    setPendingAssignments(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code.trim() || !formData.name.trim()) {
      showToast('Course code and name are required', 'error')
      return
    }

    try {
      let targetCourseId = editingId

      if (editingId) {
        await updateCourse(editingId, formData)
        showToast('Course updated successfully', 'success')
      } else {
        const newCourse = await addCourse(formData)
        targetCourseId = newCourse.id
        showToast('Course added successfully', 'success')
      }

      // Add pending assignments if any
      if (targetCourseId && pendingAssignments && pendingAssignments.length > 0) {
        let count = 0
        for (const pa of pendingAssignments) {
          try {
             let category = AssignmentCategory.ASSIGNMENT
             const typeLower = pa.type?.toLowerCase() || ''
             if (typeLower.includes('exam')) category = AssignmentCategory.EXAM
             else if (typeLower.includes('quiz')) category = AssignmentCategory.QUIZ
             else if (typeLower.includes('project')) category = AssignmentCategory.PROJECT
             
             await addAssignment({
               title: pa.title,
               courseId: targetCourseId,
               deadline: new Date(pa.date),
               priority: Priority.MEDIUM,
               status: AssignmentStatus.NOT_STARTED,
               category: category,
               aiParsed: true
             })
             count++
          } catch (err) {
            console.error('Failed to add parsed assignment', err)
          }
        }
        if (count > 0) {
           showToast(`Added ${count} assignments from syllabus`, 'success')
        }
      }

      resetForm()
    } catch (error) {
      showToast('Failed to save course', 'error')
    }
  }

  const handleEdit = (courseId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const course = courses.find((c) => c.id === courseId)
    if (course) {
      setFormData({
        code: course.code,
        name: course.name,
        color: course.color,
        instructor: course.instructor || '',
        professorEmail: course.professorEmail || '',
        description: course.description || '',
        officeHours: course.officeHours || [],
        gradeWeights: course.gradeWeights || []
      })
      setEditingId(courseId)
      setIsAdding(true)
      setViewingCourseId(null) // Close detailed view if open
    }
  }

  const handleDelete = async (courseId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (confirm('Delete this course? This will not delete assignments.')) {
      try {
        await deleteCourse(courseId)
        showToast('Course deleted', 'success')
      } catch (error) {
        showToast('Failed to delete course', 'error')
      }
    }
  }

  const handleSyllabusUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    const data = new FormData()
    data.append('file', file)

    try {
      const res = await fetch('/api/gemini/syllabus', {
        method: 'POST',
        body: data,
      })

      if (!res.ok) throw new Error('Failed to parse syllabus')

      const result: ParsedSyllabus = await res.json()
      
      setFormData(prev => ({
        ...prev,
        code: result.courseCode || prev.code,
        name: result.courseName || prev.name,
        instructor: result.instructor || prev.instructor,
        professorEmail: result.professorEmail || prev.professorEmail,
        description: result.description || prev.description,
        officeHours: result.officeHours || prev.officeHours,
        gradeWeights: result.gradeWeights || prev.gradeWeights
      }))

      if (result.assignments && result.assignments.length > 0) {
        setPendingAssignments(result.assignments)
        showToast(`Syllabus parsed: Found ${result.assignments.length} assignments`, 'success')
      } else {
        showToast('Syllabus parsed successfully', 'success')
      }
    } catch (error) {
      console.error(error)
      showToast('Failed to parse syllabus', 'error')
    } finally {
      setIsParsing(false)
    }
  }

  // Simplified manual list management for Office Hours and Grade Weights
  const addOfficeHour = () => {
    setFormData(prev => ({
      ...prev,
      officeHours: [...(prev.officeHours || []), { day: 'Monday', startTime: '12:00', endTime: '13:00', location: 'TBD' }]
    }))
  }

  const updateOfficeHour = (index: number, field: keyof OfficeHour, value: string) => {
      setFormData(prev => {
          const newHours = [...(prev.officeHours || [])]
          newHours[index] = { ...newHours[index], [field]: value }
          return { ...prev, officeHours: newHours }
      })
  }

  const removeOfficeHour = (index: number) => {
      setFormData(prev => ({
          ...prev,
          officeHours: (prev.officeHours || []).filter((_, i) => i !== index)
      }))
  }

  const addGradeWeight = () => {
      setFormData(prev => ({
          ...prev,
          gradeWeights: [...(prev.gradeWeights || []), { category: 'Exam', weight: 0 }]
      }))
  }
  
  const updateGradeWeight = (index: number, field: keyof GradeWeight, value: string | number) => {
    setFormData(prev => {
        const newWeights = [...(prev.gradeWeights || [])]
        newWeights[index] = { ...newWeights[index], [field]: value }
        return { ...prev, gradeWeights: newWeights }
    })
  }

  const removeGradeWeight = (index: number) => {
    setFormData(prev => ({
        ...prev,
        gradeWeights: (prev.gradeWeights || []).filter((_, i) => i !== index)
    }))
  }

  const viewedCourse = courses.find(c => c.id === viewingCourseId) || null

  return (
    <div className="space-y-6">
      <CourseDetailModal 
        course={viewedCourse} 
        isOpen={!!viewedCourse}
        onClose={() => setViewingCourseId(null)}
        onEdit={() => viewingCourseId && handleEdit(viewingCourseId)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Course Management</h2>
          <p className="text-sm text-text-muted mt-1">
            Add and manage your courses with custom colors
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            Add New Course
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <div className="bg-secondary border border-border rounded-lg p-6">
          <div className="flex justify-between mb-4">
             <h3 className="text-lg font-semibold text-text-primary">
               {editingId ? 'Edit Course' : 'Add New Course'}
             </h3>
             <div className="flex items-center gap-2">
                <input
                    type="file"
                    accept=".pdf,text/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleSyllabusUpload}
                />
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing}
                >
                    {isParsing ? 'Parsing...' : 'Auto-fill from Syllabus'}
                </Button>
             </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Course Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., ECE 306"
                maxLength={LIMITS.COURSE_CODE_MAX}
                required
              />

              <Input
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Embedded Systems"
                maxLength={LIMITS.COURSE_NAME_MAX}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                label="Instructor Name"
                value={formData.instructor || ''}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                placeholder="e.g., Mr. Carlson"
                />
                <Input
                label="Professor Email"
                value={formData.professorEmail || ''}
                onChange={(e) => setFormData({ ...formData, professorEmail: e.target.value })}
                placeholder="email@university.edu"
                type="email"
                />
            </div>

            {/* Office Hours Editor */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-text-primary">Office Hours</label>
                    <Button type="button" variant="ghost" size="sm" onClick={addOfficeHour}>+ Add</Button>
                </div>
                {formData.officeHours && formData.officeHours.map((oh, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <Input 
                            value={oh.day} 
                            onChange={e => updateOfficeHour(idx, 'day', e.target.value)} 
                            placeholder="Day"
                            className="w-24"
                        />
                        <Input 
                            value={oh.startTime} 
                            onChange={e => updateOfficeHour(idx, 'startTime', e.target.value)} 
                            placeholder="Start"
                            type="time"
                            className="w-24"
                        />
                         <Input 
                            value={oh.endTime} 
                            onChange={e => updateOfficeHour(idx, 'endTime', e.target.value)} 
                            placeholder="End"
                            type="time"
                            className="w-24"
                        />
                         <Input 
                            value={oh.location} 
                            onChange={e => updateOfficeHour(idx, 'location', e.target.value)} 
                            placeholder="Location"
                            className="flex-1"
                        />
                        <button type="button" onClick={() => removeOfficeHour(idx)} className="text-status-red">✕</button>
                    </div>
                ))}
            </div>

            {/* Grade Weights Editor */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-text-primary">Grade Breakdown</label>
                     <Button type="button" variant="ghost" size="sm" onClick={addGradeWeight}>+ Add</Button>
                </div>
                 {formData.gradeWeights && formData.gradeWeights.map((gw, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <Input 
                            value={gw.category} 
                            onChange={e => updateGradeWeight(idx, 'category', e.target.value)} 
                            placeholder="Category (e.g. Quizzes)"
                            className="flex-1"
                        />
                         <div className="flex items-center gap-1 w-24">
                            <Input 
                                value={gw.weight} 
                                onChange={e => updateGradeWeight(idx, 'weight', parseFloat(e.target.value) || 0)} 
                                type="number"
                                placeholder="%"
                            />
                            <span className="text-sm">%</span>
                         </div>
                        <button type="button" onClick={() => removeGradeWeight(idx)} className="text-status-red">✕</button>
                    </div>
                ))}
            </div>

             {/* Description */}
             <div className="space-y-1">
                <label className="text-sm font-medium text-text-primary">Description</label>
                <textarea 
                    className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary h-24"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
             </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Course Color
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COURSE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={clsx(
                      'w-10 h-10 rounded-full border-2 transition-transform hover:scale-110',
                      formData.color === color
                        ? 'border-text-primary scale-110'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                  />
                ))}
              </div>
              {/* Custom color input */}
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mt-2 w-32"
                label="Or pick custom color"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary">
                {editingId ? 'Update Course' : 'Add Course'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Course List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-text-primary">
          Your Courses ({courses.length})
        </h3>

        {courses.length === 0 ? (
          <div className="bg-secondary border border-border rounded-lg p-8 text-center">
            <p className="text-text-muted">
              No courses yet. Add your first course to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => setViewingCourseId(course.id)}
                className="bg-secondary border border-border rounded-lg p-4 hover:border-text-muted transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <CourseBadge course={course} size="md" />
                  {!course.active && (
                    <span className="text-xs text-text-muted bg-accent px-2 py-0.5 rounded">
                      Archived
                    </span>
                  )}
                </div>

                <h4 className="font-medium text-text-primary mb-1">{course.name}</h4>
                {course.instructor && (
                  <p className="text-sm text-text-muted mb-3">{course.instructor}</p>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={(e) => handleEdit(course.id, e)}
                    className="text-sm text-text-secondary hover:text-priority-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => handleDelete(course.id, e)}
                    className="text-sm text-text-secondary hover:text-status-red transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

