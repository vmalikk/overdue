'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/components/providers/SupabaseAuthProvider'

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user, signOut, loading } = useAuth()

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
              Overdue
            </h1>
            <p className="text-sm text-text-muted">
              Stay organized, stay ahead
            </p>
          </div>

          {/* Right Section - User & Time */}
          <div className="flex items-center gap-8">
            {/* User Section */}
            {!loading && user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    user.email?.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="ml-2 p-2 text-text-muted hover:text-text-primary hover:bg-accent rounded-lg transition-colors"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}

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
      </div>
    </header>
  )
}
