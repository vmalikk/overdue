'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

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
    <header className="w-full py-4 md:py-8 border-b border-border bg-gradient-to-b from-secondary to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center justify-between md:block">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-text-primary mb-0 md:mb-1 tracking-tight">
                Overdue
              </h1>
              <p className="text-xs md:text-sm text-text-muted hidden md:block">
                Stay organized, stay ahead
              </p>
            </div>
            {/* Mobile user avatar & sign out */}
            <div className="flex md:hidden items-center gap-2">
              {!loading && user && (
                <>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                    {(user.prefs as Record<string, string>)?.avatar ? (
                      <img 
                        src={(user.prefs as Record<string, string>).avatar} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      user.email?.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Settings Button Mobile */}
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-accent rounded-lg transition-colors"
                  >
                    <span className="text-xl">⚙️</span>
                  </button>
                  <button
                    onClick={signOut}
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-accent rounded-lg transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Section - User & Time (Desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {/* User Section */}
            {!loading && user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">
                    {user.name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                  {(user.prefs as Record<string, string>)?.avatar ? (
                    <img 
                      src={(user.prefs as Record<string, string>).avatar} 
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
            <div className="text-right flex items-center gap-4">
              <div>
                <div className="text-2xl font-semibold text-text-primary mb-1 font-mono tracking-wide">
                  {time}
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-medium">{dayOfWeek}</span>
                  <span className="mx-2">•</span>
                  <span>{date}</span>
                </div>
              </div>
              
              {/* Settings Button */}
              <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                  className="p-2 rounded-full hover:bg-secondary text-text-muted hover:text-text-primary transition-colors"
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
              </button>
            </div>
          </div>

          {/* Mobile Time Display */}
          <div className="md:hidden text-center">
            <div className="text-lg font-semibold text-text-primary font-mono">
              {time}
            </div>
            <div className="text-xs text-text-secondary">
              <span className="font-medium">{dayOfWeek}</span>
              <span className="mx-1">•</span>
              <span>{date}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
