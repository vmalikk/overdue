'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { PriorityDistribution } from '@/lib/utils/statisticsCalculator'

interface PriorityChartProps {
  distribution: PriorityDistribution
}

const COLORS = {
  low: '#3b82f6',      // blue
  medium: '#f59e0b',   // amber
  high: '#ef4444',     // red
}

export function PriorityChart({ distribution }: PriorityChartProps) {
  const data = [
    { name: 'Low', value: distribution.low, color: COLORS.low },
    { name: 'Medium', value: distribution.medium, color: COLORS.medium },
    { name: 'High', value: distribution.high, color: COLORS.high },
  ]

  const total = distribution.low + distribution.medium + distribution.high

  if (total === 0) {
    return (
      <div className="bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Priority Distribution</h3>
        <div className="h-64 flex items-center justify-center text-text-muted">
          No assignments yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Priority Distribution</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
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
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#e4e4e7',
              }}
              formatter={(value) => [`${value} assignments`, 'Count']}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-text-muted">
              {item.name}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
