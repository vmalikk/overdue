'use client'

import { QuickStats as QuickStatsType } from '@/lib/utils/statisticsCalculator'

interface QuickStatsProps {
  stats: QuickStatsType
}

export function QuickStats({ stats }: QuickStatsProps) {
  const { total, completed, overdue, dueSoon, inProgress } = stats

  const items = [
    { label: 'Total', value: total, color: 'text-text-primary' },
    { label: 'In Progress', value: inProgress, color: 'text-status-yellow' },
    { label: 'Due Soon', value: dueSoon, color: 'text-amber-400', sublabel: '48h' },
    { label: 'Overdue', value: overdue, color: 'text-status-red' },
  ]

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center p-3 bg-background rounded-lg">
            <div className={`text-3xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-text-muted mt-1">
              {item.label}
              {item.sublabel && (
                <span className="text-text-muted/60"> ({item.sublabel})</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Progress</span>
          <span>{completed}/{total} completed</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-status-green rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}
