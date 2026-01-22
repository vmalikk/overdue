'use client'

import { CompletionMetrics } from '@/lib/utils/statisticsCalculator'

interface CompletionRateProps {
  metrics: CompletionMetrics
}

export function CompletionRate({ metrics }: CompletionRateProps) {
  const { total, completed, rate, onTime, late } = metrics

  // SVG circle parameters
  const size = 160
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (rate / 100) * circumference
  const offset = circumference - progress

  // Color based on rate
  const getColor = () => {
    if (rate >= 70) return 'text-status-green'
    if (rate >= 40) return 'text-status-yellow'
    return 'text-status-red'
  }

  const getStrokeColor = () => {
    if (rate >= 70) return '#22c55e'
    if (rate >= 40) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Completion Rate</h3>

      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getColor()}`}>{rate}%</span>
            <span className="text-sm text-text-muted">completed</span>
          </div>
        </div>
      </div>

      {/* Stats below */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-text-primary">{completed}</div>
          <div className="text-xs text-text-muted">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-status-green">{onTime}</div>
          <div className="text-xs text-text-muted">On Time</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-status-red">{late}</div>
          <div className="text-xs text-text-muted">Late</div>
        </div>
      </div>
    </div>
  )
}
