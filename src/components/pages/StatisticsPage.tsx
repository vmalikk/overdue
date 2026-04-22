'use client'

import { useMemo } from 'react'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import {
  calculateCompletionRate,
  calculateStreak,
  getStatusDistribution,
  getCourseWorkload,
  getDeadlineTrends,
  getProductivityInsights,
  getQuickStats,
} from '@/lib/utils/statisticsCalculator'
import { CompletionRate } from '@/components/statistics/CompletionRate'
import { StreakTracker } from '@/components/statistics/StreakTracker'
import { QuickStats } from '@/components/statistics/QuickStats'
import { StatusChart } from '@/components/statistics/StatusChart'
import { CourseWorkload } from '@/components/statistics/CourseWorkload'
import { DeadlineTrends } from '@/components/statistics/DeadlineTrends'
import { ProductivityCards } from '@/components/statistics/ProductivityCard'

export function StatisticsPage() {
  const { assignments } = useAssignmentStore()
  const { courses } = useCourseStore()

  // Compute all statistics
  const stats = useMemo(() => {
    return {
      completionRate: calculateCompletionRate(assignments),
      streak: calculateStreak(assignments),
      quickStats: getQuickStats(assignments),
      statusDistribution: getStatusDistribution(assignments),
      courseWorkload: getCourseWorkload(assignments, courses),
      weekTrends: getDeadlineTrends(assignments, 'week'),
      monthTrends: getDeadlineTrends(assignments, 'month'),
      insights: getProductivityInsights(assignments),
    }
  }, [assignments, courses])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Statistics & Insights</h2>
          <p className="text-sm text-text-muted mt-1">
            Track your progress and productivity
          </p>
        </div>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CompletionRate metrics={stats.completionRate} />
        <StreakTracker streak={stats.streak} />
        <QuickStats stats={stats.quickStats} />
      </div>

      {/* Middle Row: Distribution Charts */}
      <div className="grid grid-cols-1 gap-6">
        <StatusChart distribution={stats.statusDistribution} />
      </div>

      {/* Course Workload - Full Width */}
      <CourseWorkload workload={stats.courseWorkload} />

      {/* Deadline Trends - Full Width */}
      <DeadlineTrends weekData={stats.weekTrends} monthData={stats.monthTrends} />

      {/* Productivity Insights */}
      <ProductivityCards insights={stats.insights} />
    </div>
  )
}
