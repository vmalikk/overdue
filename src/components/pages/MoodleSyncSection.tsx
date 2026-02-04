'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useMoodleStore, MoodleStatus } from '@/store/moodleStore'
import { useUIStore } from '@/store/uiStore'
import { format } from 'date-fns'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { account } from '@/lib/appwrite/client'

export function MoodleSyncSection() {
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
    clearError,
    setLastSync
  } = useMoodleStore()
  const { showToast } = useUIStore()

  const [url, setUrl] = useState('https://moodle-courses2527.wolfware.ncsu.edu')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('') // Manual token support
  const [useToken, setUseToken] = useState(true) // Default to token for robustness
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Check connection status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { jwt } = await account.createJWT()
      
      const response = await fetch('/api/moodle/sync', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${jwt}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setLastSync(new Date())
        showToast(`Synced assignments: ${data.created} new, ${data.updated} updated`, 'success')
      } else {
        showToast(data.error || 'Failed to sync with Moodle', 'error')
      }
    } catch (err) {
      showToast('An error occurred while syncing', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleConnect = async () => {
    if (!url || !username || (!useToken && !password) || (useToken && !token)) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    startConnecting()
    clearError()

    try {
      const { jwt } = await account.createJWT()
      
      const payload: any = { url, username }
      if (useToken) {
          payload.token = token
      } else {
          payload.password = password
      }
      
      const response = await fetch('/api/moodle/connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        connectSuccess(data.url, data.username)
        showToast('Successfully connected to Moodle!', 'success')
        setPassword('') 
        setToken('')
      } else {
        connectError(data.error || 'Connection failed')
        showToast(data.error || 'Connection failed', 'error')
      }
    } catch (err) {
      connectError('Failed to connect to server')
      showToast('Failed to connect to server', 'error')
    }
  }

  const handleDisconnect = async () => {
    disconnect()
    // Optional: Call API to remove token from DB
    // await fetch('/api/moodle/disconnect', ...)
    showToast('Disconnected from Moodle', 'info')
  }

  if (status === MoodleStatus.CONNECTED || config.connected) {
    return (
      <div className="bg-secondary rounded-lg border border-border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <h3 className="text-lg font-medium text-text-primary">Moodle Connected</h3>
              <p className="text-sm text-text-muted">
                Connected as {config.username} @ {config.url}
              </p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-status-green/10 text-status-green text-sm font-medium border border-status-green/20">
            Active
          </div>
        </div>

        <div className="bg-surface p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">Last synced</p>
            <p className="text-text-primary font-medium">
              {config.lastSync ? format(new Date(config.lastSync), 'PPp') : 'Never'}
            </p>
          </div>
          <Button 
            variant="primary" 
            isLoading={isSyncing}
            onClick={handleSync}
          >
            Sync Now
          </Button>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button 
            variant="danger" 
            onClick={handleDisconnect}
          >
            Disconnect Account
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
          <span className="text-xl">🎓</span>
        </div>
        <div>
          <h3 className="text-lg font-medium text-text-primary">Connect Moodle</h3>
          <p className="text-sm text-text-muted">
            Sync assignments from your Moodle LMS
          </p>
        </div>
      </div>

      <div className="space-y-4 max-w-md">
        {error && (
          <div className="bg-status-red/10 border border-status-red/20 text-status-red px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
           <label className="block text-sm font-medium text-text-muted mb-1">Moodle URL</label>
           <input
             type="url"
             value={url}
             onChange={(e) => setUrl(e.target.value)}
             placeholder="https://moodle.yourschool.edu"
             className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium"
           />
           <p className="text-xs text-text-muted mt-1">Base URL of your Moodle site</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium"
          />
        </div>

        {/* Auth Method Switcher */}
        <div className="flex items-center gap-4 py-2">
            <label className="inline-flex items-center cursor-pointer">
                <input 
                    type="radio" 
                    checked={useToken} 
                    onChange={() => setUseToken(true)}
                    className="form-radio text-priority-medium"
                    name="authMethod"
                />
                <span className="ml-2 text-sm text-text-primary">Manual Token (SSO / NCSU)</span>
            </label>
            <label className="inline-flex items-center cursor-pointer">
                <input 
                    type="radio" 
                    checked={!useToken} 
                    onChange={() => setUseToken(false)}
                    className="form-radio text-priority-medium"
                    name="authMethod"
                />
                <span className="ml-2 text-sm text-text-primary">Password (Standard)</span>
            </label>
        </div>

        {useToken ? (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Security Key (Token)</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste key here..."
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium font-mono"
              />
              <p className="text-xs text-text-muted mt-2">
                1. Go to <a href={`${url.replace(/\/$/, '')}/user/managetoken.php`} target="_blank" rel="noopener noreferrer" className="text-priority-medium hover:underline">Security Keys</a> in Moodle (under Preferences).
                <br/>
                2. Copy the key for <strong>Moodle Mobile web service</strong>.
                <br/>
                (If missing, click "Generate" or contact support).
              </p>
            </div>
        ) : (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-priority-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
        )}

        <Button
          variant="primary"
          className="w-full mt-4"
          onClick={handleConnect}
          isLoading={isLoading}
        >
          Connect Moodle
        </Button>
      </div>
    </div>
  )
}
