import { forwardRef, useState, useEffect } from 'react'
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
    // Initialize with formatted value
    const [dateInputValue, setDateInputValue] = useState(value ? format(value, 'yyyy-MM-dd') : '')

    // Only update local state if the prop value represents a DIFFERENT date than what we have locally.
    // This prevents the "typing year -> 0002 -> re-render -> 0002 -> typing interrupted" loop.
    useEffect(() => {
      if (value) {
        const valueString = format(value, 'yyyy-MM-dd')
        // Only overwrite if it's actually different.
        // This is crucial for "controlled" inputs that self-update.
        if (valueString !== dateInputValue) {
          setDateInputValue(valueString)
        }
      } else if (!value && dateInputValue) {
        // If value becomes null but we have text, we might want to clear it or keep it?
        // Usually clear it.
        setDateInputValue('')
      }
    }, [value]) // dateInputValue dependency removed intentionally to avoid loop? No, it's needed for comparison but we can use functional updates or ref validness.
    // Actually, easier: just check logic inside effect.

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateString = e.target.value
      setDateInputValue(dateString) // Update local immediately so UI is responsive

      // Manual parsing
      const [year, month, day] = dateString.split('-').map(Number)

      // Only commit change if fully valid
      if (year && month && day) {
        // Validation for "reasonable" year length to avoid "0002" being treated as final if user is typing "2..."
        // But date input returns "0002" immediately.
        // The issue is likely that `onChange` causes global state update -> prop update -> useEffect -> reset.
        // By checking `valueString !== dateInputValue` above, we avoid resetting if it matches.

        const newDate = new Date(year, month - 1, day)
        newDate.setFullYear(year) // Explicitly set the year to handle 2-digit years correctly (avoid 19xx mapping)

        if (!isNaN(newDate.getTime())) {
          if (value && showTime) {
            newDate.setHours(value.getHours())
            newDate.setMinutes(value.getMinutes())
          } else if (!value && showTime) {
            newDate.setHours(23, 59)
          }
          onChange(newDate)
        }
      }
    }

    const handleTimeChange = (timeString: string) => {
      const [hours, minutes] = timeString.split(':').map(Number)
      const newDate = value ? new Date(value) : new Date()
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onChange(newDate)
    }


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
            value={dateInputValue}
            onChange={handleDateChange}
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
