import { forwardRef } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date) => void
  label?: string
  error?: string
  showTime?: boolean
  min?: string
  max?: string
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ value, onChange, label, error, showTime = false, min, max }, ref) => {
    const handleDateChange = (dateString: string) => {
      // Manual parsing to avoid UTC conversion
      const [year, month, day] = dateString.split('-').map(Number)

      // If incomplete date (e.g. typing), ignore
      if (!year || !month || !day) return

      const newDate = new Date(year, month - 1, day)

      if (!isNaN(newDate.getTime())) {
        // Preserve time if it exists
        if (value && showTime) {
          newDate.setHours(value.getHours())
          newDate.setMinutes(value.getMinutes())
        } else if (!value && showTime) {
          // Default to end of day if no previous value? 
          // Or just keep it 00:00? The user usually wants *some* time.
          // Current logic was preserving value time or defaulting.
          // Let's default to current time or 23:59? 
          // Implementation below defaults timeValue to 23:59 for display if null.
          newDate.setHours(23, 59)
        }
        onChange(newDate)
      }
    }

    const handleTimeChange = (timeString: string) => {
      const [hours, minutes] = timeString.split(':').map(Number)
      const newDate = value ? new Date(value) : new Date()
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onChange(newDate)
    }

    const dateValue = value ? format(value, 'yyyy-MM-dd') : ''
    const timeValue = value ? format(value, 'HH:mm') : '23:59'

    return (
      <div ref={ref} className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <div className={clsx('flex gap-2', !showTime && 'flex-col')}>
          {/* Date input */}
          <input
            type="date"
            value={dateValue}
            onChange={(e) => handleDateChange(e.target.value)}
            min={min}
            max={max}
            className={clsx(
              'flex-1 px-3 py-2 bg-secondary border rounded-md',
              'text-text-primary',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
              error
                ? 'border-status-red focus:ring-status-red'
                : 'border-border focus:ring-priority-medium'
            )}
          />

          {/* Time input */}
          {showTime && (
            <input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className={clsx(
                'w-32 px-3 py-2 bg-secondary border rounded-md',
                'text-text-primary',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
                error
                  ? 'border-status-red focus:ring-status-red'
                  : 'border-border focus:ring-priority-medium'
              )}
            />
          )}
        </div>
        {error && <p className="mt-1 text-sm text-status-red">{error}</p>}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
