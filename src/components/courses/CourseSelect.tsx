'use client'

import { useEffect } from 'react'
import { useCourseStore } from '@/store/courseStore'
import { Select } from '@/components/ui/Select'

interface CourseSelectProps {
  value: string
  onChange: (courseId: string) => void
  label?: string
  error?: string
  required?: boolean
}

export function CourseSelect({ value, onChange, label, error, required }: CourseSelectProps) {
  const { activeCourses, loadCourses } = useCourseStore()

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const options = [
    { value: '', label: 'Select a course...' },
    ...activeCourses.map((course) => ({
      value: course.id,
      label: `${course.code} - ${course.name}`,
    })),
  ]

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      error={error}
      required={required}
    />
  )
}
