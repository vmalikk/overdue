import { Course } from '@/types/course'

interface CourseBadgeProps {
  course: Course
  size?: 'sm' | 'md'
}

export function CourseBadge({ course, size = 'md' }: CourseBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${course.color}20`,
        color: course.color,
        borderColor: course.color,
        borderWidth: '1px',
      }}
    >
      {course.code}
    </span>
  )
}
