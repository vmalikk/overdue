'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { CourseWorkloadItem } from '@/lib/utils/statisticsCalculator'

interface CourseWorkloadProps {
  workload: CourseWorkloadItem[]
}

export function CourseWorkload({ workload }: CourseWorkloadProps) {
  if (workload.length === 0) {
    return (
      <div className="bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Course Workload</h3>
        <div className="h-48 flex items-center justify-center text-text-muted">
          No course data available
        </div>
      </div>
    )
  }

  const data = workload.slice(0, 6).map(item => ({
    name: item.courseCode,
    completed: item.completed,
    pending: item.pending,
    color: item.courseColor,
  }))

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Course Workload</h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
            <XAxis
              type="number"
              tick={{ fill: '#71717a', fontSize: 12 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={{ stroke: '#27272a' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#e4e4e7',
              }}
              formatter={(value, name) => [
                `${value} assignments`,
                name === 'completed' ? 'Completed' : 'Pending',
              ]}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span style={{ color: '#a1a1aa', fontSize: '12px' }}>
                  {value === 'completed' ? 'Completed' : 'Pending'}
                </span>
              )}
            />
            <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} barSize={24} />
            <Bar dataKey="pending" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Course color legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
        {workload.slice(0, 6).map((item) => (
          <div key={item.courseId} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.courseColor }}
            />
            <span className="text-xs text-text-muted">
              {item.courseCode}: {item.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
