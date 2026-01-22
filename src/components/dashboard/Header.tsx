'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(timer)
  }, [])

  const dayOfWeek = format(currentTime, 'EEEE')
  const date = format(currentTime, 'MMMM d, yyyy')
  const time = format(currentTime, 'h:mm:ss a')

  return (
    <header className="w-full py-8 border-b border-border bg-gradient-to-b from-secondary to-background">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between">
          {/* Title Section */}
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-1 tracking-tight">
              Assignment Tracker
            </h1>
            <p className="text-sm text-text-muted">
              Stay organized, stay ahead
            </p>
          </div>

          {/* Date & Time Section */}
          <div className="text-right">
            <div className="text-2xl font-semibold text-text-primary mb-1 font-mono tracking-wide">
              {time}
            </div>
            <div className="text-sm text-text-secondary">
              <span className="font-medium">{dayOfWeek}</span>
              <span className="mx-2">•</span>
              <span>{date}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
