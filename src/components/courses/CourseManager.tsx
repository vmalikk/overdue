'use client'

import { useState, useEffect } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CourseBadge } from './CourseBadge'
import { DEFAULT_COURSE_COLORS } from '@/types/course'
import { LIMITS } from '@/config/constants'
import clsx from 'clsx'

export function CourseManager() {
  const { courses, loadCourses, addCourse, updateCourse, deleteCourse } = useCourseStore()
  const { showToast } = useUIStore()

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    color: DEFAULT_COURSE_COLORS[0],
    instructor: '',
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
    })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code.trim() || !formData.name.trim()) {
      showToast('Course code and name are required', 'error')
      return
    }

    try {
      if (editingId) {
        await updateCourse(editingId, formData)
        showToast('Course updated successfully', 'success')
      } else {
        await addCourse(formData)
        showToast('Course added successfully', 'success')
      }
      resetForm()
    } catch (error) {
      showToast('Failed to save course', 'error')
    }
  }

  const handleEdit = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    if (course) {
      setFormData({
        code: course.code,
        name: course.name,
        color: course.color,
        instructor: course.instructor || '',
      })
      setEditingId(courseId)
      setIsAdding(true)
    }
  }

  const handleDelete = async (courseId: string) => {
    if (confirm('Delete this course? This will not delete assignments.')) {
      try {
        await deleteCourse(courseId)
        showToast('Course deleted', 'success')
      } catch (error) {
        showToast('Failed to delete course', 'error')
      }
    }
  }

  return (
    <div className="space-y-6">
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
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {editingId ? 'Edit Course' : 'Add New Course'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Code */}
              <Input
                label="Course Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., ECE 306"
                maxLength={LIMITS.COURSE_CODE_MAX}
                required
              />

              {/* Course Name */}
              <Input
                label="Course Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Embedded Systems"
                maxLength={LIMITS.COURSE_NAME_MAX}
                required
              />
            </div>

            {/* Instructor */}
            <Input
              label="Instructor (Optional)"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              placeholder="e.g., Mr. Carlson"
            />

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
                className="bg-secondary border border-border rounded-lg p-4 hover:border-text-muted transition-colors"
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
                    onClick={() => handleEdit(course.id)}
                    className="text-sm text-text-secondary hover:text-priority-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
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
