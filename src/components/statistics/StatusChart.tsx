'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { StatusDistribution } from '@/lib/utils/statisticsCalculator'

interface StatusChartProps {
  distribution: StatusDistribution
}

const COLORS = {
  notStarted: '#6b7280', // gray
  inProgress: '#eab308', // yellow
  completed: '#22c55e',  // green
}

export function StatusChart({ distribution }: StatusChartProps) {
  const data = [
    { name: 'Not Started', value: distribution.notStarted, color: COLORS.notStarted },
    { name: 'In Progress', value: distribution.inProgress, color: COLORS.inProgress },
    { name: 'Completed', value: distribution.completed, color: COLORS.completed },
  ].filter(d => d.value > 0)

  const total = distribution.notStarted + distribution.inProgress + distribution.completed

  if (total === 0) {
    return (
      <div className="bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Status Distribution</h3>
        <div className="h-64 flex items-center justify-center text-text-muted">
          No assignments yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Status Distribution</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#e4e4e7',
              }}
              formatter={(value, name) => [
                `${value} (${Math.round((Number(value) / total) * 100)}%)`,
                name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: '#a1a1aa', fontSize: '12px' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
