'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useGradescopeStore, GradescopeStatus } from '@/store/gradescopeStore'
import { useUIStore } from '@/store/uiStore'
import { format } from 'date-fns'
import Link from 'next/link'
import { getUnresolvedConflictCount } from '@/lib/appwrite/conflicts'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

export function GradescopeSyncSection() {
  const { user } = useAuth()
  const {
    config,
    status,
    error,
    isLoading,
    startConnecting,
    connectSuccess,
    connectError,
    disconnect,
    checkStatus,
    clearError
  } = useGradescopeStore()
  const { showToast } = useUIStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [conflictCount, setConflictCount] = useState(0)

  // Check connection status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Load conflict count when connected
  useEffect(() => {
    if (config.connected && user) {
      getUnresolvedConflictCount(user.$id)
        .then(setConflictCount)
        .catch(console.error)
    }
  }, [config.connected, user])

  const handleConnect = async () => {
    if (!email || !password) {
      showToast('Please enter your Gradescope email and password', 'error')
      return
    }

    startConnecting()
    clearError()

    try {
      const response = await fetch('/api/gradescope/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        connectSuccess(data.email)
        showToast('Successfully connected to Gradescope!', 'success')
        setEmail('')
        setPassword('')
      } else {
        connectError(data.error || 'Failed to connect')
        showToast(data.error || 'Failed to connect to Gradescope', 'error')
      }
    } catch (err) {
      const message = 'An error occurred while connecting'
      connectError(message)
      showToast(message, 'error')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Gradescope? Your synced assignments will remain.')) {
      return
    }

    try {
      const response = await fetch('/api/gradescope/disconnect', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        disconnect()
        showToast('Disconnected from Gradescope', 'info')
      } else {
        showToast(data.error || 'Failed to disconnect', 'error')
      }
    } catch (err) {
      showToast('An error occurred while disconnecting', 'error')
    }
  }

  const getStatusDisplay = () => {
    switch (status) {
      case GradescopeStatus.CONNECTING:
        return { text: 'Connecting...', color: 'text-status-yellow', icon: '...' }
      case GradescopeStatus.CONNECTED:
        return { text: 'Connected', color: 'text-status-green', icon: '✓' }
      case GradescopeStatus.ERROR:
        return { text: 'Error', color: 'text-status-red', icon: '✕' }
      default:
        return { text: 'Not Connected', color: 'text-text-muted', icon: '○' }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Gradescope Sync</h3>
          <p className="text-sm text-text-muted mt-1">
            Connect your Gradescope account to automatically sync assignments
          </p>
        </div>
        <div className={`flex items-center gap-2 text-sm ${statusDisplay.color}`}>
          <span>{statusDisplay.icon}</span>
          <span>{statusDisplay.text}</span>
          {config.lastSync && (
            <span className="text-text-muted text-xs">
              (Last: {format(new Date(config.lastSync), 'MMM d, h:mm a')})
            </span>
          )}
        </div>
      </div>

      {/* Conflict Banner */}
      {conflictCount > 0 && (
        <div className="bg-status-yellow/10 border border-status-yellow/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-status-yellow">
                You have {conflictCount} assignment conflict{conflictCount > 1 ? 's' : ''} to resolve
              </p>
              <p className="text-sm text-text-muted mt-1">
                Some Gradescope assignments match existing assignments
              </p>
            </div>
            <Link href="/conflicts">
              <Button variant="secondary" size="sm">
                Resolve Conflicts
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Connection Section */}
      <section className="bg-secondary border border-border rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-4">Connection</h4>

        {isLoading ? (
          <div className="flex items-center gap-2 text-text-muted">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Checking connection...
          </div>
        ) : config.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-status-green/20 rounded-full flex items-center justify-center">
                <span className="text-status-green text-lg">✓</span>
              </div>
              <div>
                <p className="font-medium text-text-primary">Connected to Gradescope</p>
                <p className="text-sm text-text-muted">{config.email}</p>
              </div>
              <Button onClick={handleDisconnect} variant="ghost" size="sm" className="ml-auto">
                Disconnect
              </Button>
            </div>

            {/* Sync Info */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Automatic Sync</span>
                <span className="text-text-primary">Daily at 3:00 AM EST</span>
              </div>
              {config.tokenExpiry && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-text-muted">Session Expires</span>
                  <span className="text-text-primary">
                    {format(new Date(config.tokenExpiry), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-text-muted">
              Connect your Gradescope account to automatically import assignments.
              Your credentials are encrypted and stored securely.
            </p>

            {/* Login Form */}
            <div className="space-y-4 max-w-md">
              <div>
                <label htmlFor="gs-email" className="block text-sm font-medium text-text-primary mb-1">
                  Gradescope Email
                </label>
                <input
                  id="gs-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium"
                  disabled={status === GradescopeStatus.CONNECTING}
                />
              </div>

              <div>
                <label htmlFor="gs-password" className="block text-sm font-medium text-text-primary mb-1">
                  Gradescope Password
                </label>
                <div className="relative">
                  <input
                    id="gs-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your Gradescope password"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium pr-16"
                    disabled={status === GradescopeStatus.CONNECTING}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-text-muted">
                <p className="font-semibold text-blue-400 mb-1">
                  Using School Credentials?
                </p>
                <p>
                  If you log in via a school portal, you need to set a specific password for your Gradescope account:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 ml-1 text-xs">
                  <li>Go to <a href="https://www.gradescope.com/reset_password" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">gradescope.com/reset_password</a></li>
                  <li>Enter your school email address.</li>
                  <li>Check your email to set a new password.</li>
                  <li>Use that password here (school login will still work!).</li>
                </ol>
              </div>

              <Button
                onClick={handleConnect}
                variant="primary"
                disabled={status === GradescopeStatus.CONNECTING || !email || !password}
                className="w-full"
              >
                {status === GradescopeStatus.CONNECTING ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Connect to Gradescope'
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-3">
                <p className="text-sm text-status-red">{error}</p>
              </div>
            )}

            {/* Security Note */}
            <p className="text-xs text-text-muted">
              Your password is only used once to obtain a session token. We never store your password.
              The session token is encrypted with AES-256 before storage.
            </p>
          </div>
        )}
      </section>

      {/* How it Works */}
      <section className="bg-secondary border border-border rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-4">How Gradescope Sync Works</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-text-muted">
          <li>Connect your Gradescope account using your email and password</li>
          <li>We securely store an encrypted session token (not your password)</li>
          <li>Every day at 3:00 AM EST, we check for new assignments</li>
          <li>New assignments are automatically added to your tracker</li>
          <li>If we find potential duplicates, we create conflicts for you to resolve</li>
        </ol>
      </section>

      {/* FAQ */}
      <section className="bg-secondary border border-border rounded-lg p-6">
        <h4 className="font-medium text-text-primary mb-4">Frequently Asked Questions</h4>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-text-primary">What if my session expires?</p>
            <p className="text-text-muted mt-1">
              Sessions typically last 30 days. If your session expires, you&apos;ll see a notification
              to reconnect when you next log in.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Are my credentials safe?</p>
            <p className="text-text-muted mt-1">
              Yes! We only store an encrypted session token, never your password.
              The token is encrypted with AES-256-GCM encryption.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">I use School Credentials (SSO) to log in. What should I do?</p>
            <p className="text-text-muted mt-1">
              You can still connect! Go to the Gradescope login page, click &quot;Forgot your password?&quot;, and enter your school email.
              This will let you set a password for your account without affecting your school login. Use that password here.
            </p>
          </div>
          <div>
            <p className="font-medium text-text-primary">Can I trigger a manual sync?</p>
            <p className="text-text-muted mt-1">
              Currently, syncing happens automatically once per day.
              Manual sync may be added in a future update.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
