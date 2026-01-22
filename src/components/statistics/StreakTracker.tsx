'use client'

import { StreakData } from '@/lib/utils/statisticsCalculator'
import { format } from 'date-fns'

interface StreakTrackerProps {
  streak: StreakData
}

export function StreakTracker({ streak }: StreakTrackerProps) {
  const { current, longest, lastCompletedDate } = streak

  // Flame color intensity based on streak
  const getFlameColor = () => {
    if (current >= 7) return 'text-orange-500'
    if (current >= 3) return 'text-amber-500'
    if (current >= 1) return 'text-yellow-500'
    return 'text-text-muted'
  }

  const getMessage = () => {
    if (current >= 14) return "You're on fire! Incredible streak!"
    if (current >= 7) return 'Amazing week-long streak!'
    if (current >= 3) return 'Great momentum, keep it up!'
    if (current >= 1) return 'Good start, stay consistent!'
    return 'Complete a task to start your streak!'
  }

  return (
    <div className="bg-secondary border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Streak Tracker</h3>

      <div className="flex flex-col items-center">
        {/* Flame icon and current streak */}
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-5xl ${getFlameColor()}`}>
            {current > 0 ? '🔥' : '💤'}
          </span>
          <div>
            <div className="text-4xl font-bold text-text-primary">{current}</div>
            <div className="text-sm text-text-muted">day{current !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Motivational message */}
        <p className="text-sm text-text-secondary text-center mt-2 mb-4">
          {getMessage()}
        </p>

        {/* Stats */}
        <div className="w-full border-t border-border pt-4 mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-muted">Longest Streak</span>
            <span className="text-sm font-medium text-text-primary">{longest} days</span>
          </div>
          {lastCompletedDate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">Last Completed</span>
              <span className="text-sm font-medium text-text-primary">
                {format(lastCompletedDate, 'MMM d, h:mm a')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
