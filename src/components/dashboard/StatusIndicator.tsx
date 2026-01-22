import { Assignment } from '@/types/assignment'
import { calculateStatus, getStatusColorClass } from '@/lib/utils/statusCalculator'
import clsx from 'clsx'

interface StatusIndicatorProps {
  assignment: Assignment
  showTooltip?: boolean
}

export function StatusIndicator({ assignment, showTooltip = true }: StatusIndicatorProps) {
  const status = calculateStatus(assignment)
  const colorClass = getStatusColorClass(status.color)

  return (
    <div className="relative group">
      {/* Colored dot - 20px as per spec */}
      <div
        className={clsx(
          'w-5 h-5 rounded-full',
          colorClass,
          'transition-transform group-hover:scale-110'
        )}
        aria-label={status.message}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden group-hover:block z-10">
          <div className="bg-accent border border-border rounded-md px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="text-sm text-text-primary font-medium">
              {status.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
