'use client'

import { ProductivityInsight } from '@/lib/utils/statisticsCalculator'

interface ProductivityCardsProps {
  insights: ProductivityInsight[]
}

export function ProductivityCards({ insights }: ProductivityCardsProps) {
  if (insights.length === 0) {
    return null
  }

  const getIcon = (type: ProductivityInsight['type']) => {
    switch (type) {
      case 'positive':
        return '✨'
      case 'warning':
        return '⚠️'
      default:
        return '📊'
    }
  }

  const getBorderColor = (type: ProductivityInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'border-l-status-green'
      case 'warning':
        return 'border-l-status-red'
      default:
        return 'border-l-priority-low'
    }
  }

  const getValueColor = (type: ProductivityInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'text-status-green'
      case 'warning':
        return 'text-status-red'
      default:
        return 'text-priority-low'
    }
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Insights</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`bg-background border border-border border-l-4 ${getBorderColor(insight.type)} rounded-lg p-4`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{getIcon(insight.type)}</span>
              {insight.value && (
                <span className={`text-xl font-bold ${getValueColor(insight.type)}`}>
                  {insight.value}
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-text-primary mb-1">
              {insight.title}
            </h4>
            <p className="text-xs text-text-muted">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
