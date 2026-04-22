'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendDataPoint } from '@/lib/utils/statisticsCalculator'

interface DeadlineTrendsProps {
  weekData: TrendDataPoint[]
  monthData: TrendDataPoint[]
}

export function DeadlineTrends({ weekData, monthData }: DeadlineTrendsProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const data = period === 'week' ? weekData : monthData
  const hasData = data.some(d => d.due > 0 || d.completed > 0)

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Deadline Trends</h3>
        <div className="flex bg-background rounded-lg p-1">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              period === 'week'
                ? 'bg-accent text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              period === 'month'
                ? 'bg-accent text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-text-muted">
          No activity data for this period
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={{ stroke: '#27272a' }}
                interval={period === 'month' ? 4 : 0}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#27272a' }}
                tickLine={{ stroke: '#27272a' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#e4e4e7',
                }}
                formatter={(value, name) => [
                  value,
                  name === 'due' ? 'Due' : 'Completed',
                ]}
                labelFormatter={(label) => `${label}`}
              />
              <Area
                type="monotone"
                dataKey="due"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#dueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b' }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#completedGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-text-muted">Due</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-status-green" />
          <span className="text-xs text-text-muted">Completed</span>
        </div>
      </div>
    </div>
  )
}
