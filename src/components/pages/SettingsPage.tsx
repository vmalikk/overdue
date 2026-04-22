'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { useNextcloudStore } from '@/store/nextcloudStore'
import { useSolverStore } from '@/store/solverStore'
import { account } from '@/lib/appwrite/client'
import { CalendarSyncSection } from './CalendarSyncSection'
import { GradescopeSyncSection } from './GradescopeSyncSection'
import { MoodleSyncSection } from './MoodleSyncSection'

export function SettingsPage() {
  const { showToast, apiKey, setApiKey, snowEnabled, toggleSnow, devUnlocked, setDevUnlocked } = useUIStore()
  const { deleteAllAssignments, assignments } = useAssignmentStore()
  const { deleteAllCourses, courses } = useCourseStore()
  const nextcloud = useNextcloudStore()
  const solver = useSolverStore()
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'sync' | 'gradescope' | 'moodle' | 'ai' | 'nextcloud' | 'solver'>('general')
  const [inputKey, setInputKey] = useState('')
  const [isKeyVisible, setIsKeyVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Nextcloud form state
  const [ncUrl, setNcUrl] = useState('')
  const [ncUsername, setNcUsername] = useState('')
  const [ncPassword, setNcPassword] = useState('')
  const [ncPasswordVisible, setNcPasswordVisible] = useState(false)

  // Solver form state
  const [sessionKeyInput, setSessionKeyInput] = useState('')
  const [sessionKeyVisible, setSessionKeyVisible] = useState(false)

  // Dev password gate for Nextcloud + Solver
  const [devPasswordInput, setDevPasswordInput] = useState('')
  const DEV_PASSWORD = 'HelloBye123'

  const handleDevUnlock = async () => {
    if (devPasswordInput === DEV_PASSWORD) {
      setDevUnlocked(true)
      setDevPasswordInput('')
      // Persist to Appwrite user prefs so it syncs across devices
      try {
        const user = await account.get()
        await account.updatePrefs({ ...user.prefs, devUnlocked: true })
      } catch (e) {
        console.error('Failed to save dev unlock to prefs:', e)
      }
      showToast('Developer features unlocked!', 'success')
    } else {
      showToast('Incorrect password', 'error')
    }
  }

  const handleDevLock = async () => {
    setDevUnlocked(false)
    try {
      const user = await account.get()
      await account.updatePrefs({ ...user.prefs, devUnlocked: false })
    } catch (e) {
      console.error('Failed to save dev lock to prefs:', e)
    }
    showToast('Developer features locked', 'info')
  }

  // Sync apiKey to input when it changes or when section changes
  useEffect(() => {
    if (activeSection === 'ai') {
      setInputKey(apiKey || '')
    }
  }, [activeSection, apiKey])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Export from Appwrite would go here
      showToast('Export feature coming soon', 'info')
    } catch (error) {
      showToast('Failed to export data', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearAll = async () => {
    if (
      confirm(
        `Are you sure you want to delete ALL data? This cannot be undone!\n\nThis will delete:\n- ${assignments.length} assignments\n- ${courses.length} courses`
      )
    ) {
      setIsClearing(true)
      try {
        await deleteAllAssignments()
        await deleteAllCourses()
        showToast('All data has been deleted', 'success')
      } catch (error) {
        console.error('Failed to clear data:', error)
        showToast('Failed to clear data', 'error')
      } finally {
        setIsClearing(false)
      }
    }
  }

  const handleSaveKey = async () => {
    if (!inputKey.trim()) {
      showToast('Please enter a valid API key', 'error')
      return
    }

    if (!inputKey.startsWith('AIza')) {
      showToast('That doesn\'t look like a valid Gemini API key', 'warning')
    }

    setIsLoading(true)
    try {
      // Save to Local (Client features)
      setApiKey(inputKey)

      // Save to Backend (Server Sync)
      const { jwt } = await account.createJWT()
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify({ apiKey: inputKey }),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to sync key to server')

      showToast('API Key saved and synced!', 'success')
    } catch (err: any) {
      console.error(err)
      showToast(`Saved locally, but server sync failed: ${err.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearKey = async () => {
    if (confirm('Are you sure you want to remove your API key? AI features will be disabled.')) {
      setIsLoading(true)
      try {
        setApiKey(null)
        setInputKey('')

        const { jwt } = await account.createJWT()
        await fetch('/api/ai/config', { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        })

        showToast('API Key removed', 'info')
      } catch (err) {
        showToast('Key removed locally', 'info')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="max-w-[90rem] mx-auto space-y-6 w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
        <p className="text-sm text-text-muted mt-1">
          Manage your app preferences and integrations
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveSection('general')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'general' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          General
          {activeSection === 'general' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('sync')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'sync' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          Calendar Sync
          {activeSection === 'sync' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('gradescope')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'gradescope' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          Gradescope
          {activeSection === 'gradescope' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('moodle')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'moodle' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          Moodle
          {activeSection === 'moodle' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('ai')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'ai' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          AI Configuration
          {activeSection === 'ai' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection(devUnlocked ? 'nextcloud' : 'general')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
            !devUnlocked ? 'hidden' : activeSection === 'nextcloud' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Nextcloud
          {activeSection === 'nextcloud' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection(devUnlocked ? 'solver' : 'general')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
            !devUnlocked ? 'hidden' : activeSection === 'solver' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          AI Solver
          {activeSection === 'solver' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
      </div>

      {activeSection === 'general' && (
        <>
          {/* Top row: Data Management + Visual Effects side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Data Management</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="min-w-0 mr-3">
                    <h4 className="font-medium text-text-primary text-sm">Export Data</h4>
                    <p className="text-xs text-text-muted">Download assignments &amp; courses as JSON</p>
                  </div>
                  <Button onClick={handleExport} disabled={isExporting} variant="secondary">
                    {isExporting ? '...' : 'Export'}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-status-red/20">
                  <div className="min-w-0 mr-3">
                    <h4 className="font-medium text-status-red text-sm">Clear All Data</h4>
                    <p className="text-xs text-text-muted">{assignments.length} assignments, {courses.length} courses</p>
                  </div>
                  <Button onClick={handleClearAll} variant="danger" disabled={isClearing}>
                    {isClearing ? '...' : 'Clear'}
                  </Button>
                </div>
              </div>
            </section>

            <section className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Preferences</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Let it Snow</h4>
                    <p className="text-xs text-text-muted">Festive snowfall animation</p>
                  </div>
                  <button
                    onClick={toggleSnow}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      snowEnabled ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      snowEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Theme</h4>
                    <p className="text-xs text-text-muted">Visual appearance</p>
                  </div>
                  <span className="text-sm text-text-primary font-medium">Dark</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Storage</h4>
                    <p className="text-xs text-text-muted">Where your data lives</p>
                  </div>
                  <span className="text-sm text-text-primary font-medium">
                    {nextcloud.isConnected ? 'Nextcloud' : 'Appwrite'}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Features Status — full width grid */}
          <section className="bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Features Status</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[
                { name: 'Assignments', active: true },
                { name: 'Course Management', active: true },
                { name: 'Cloud Sync', active: true },
                { name: 'AI Parsing', active: !!apiKey, label: apiKey ? 'BYOK' : 'Pending Key' },
                { name: 'Calendar Sync', active: true },
                ...(devUnlocked ? [
                  { name: 'Nextcloud', active: nextcloud.isConnected, label: nextcloud.isConnected ? 'Connected' : 'Not Connected' },
                  { name: 'AI Solver', active: solver.isEnabled, label: solver.isEnabled ? 'Enabled' : 'Disabled' },
                ] : []),
              ].map((feat) => (
                <div key={feat.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <span className="text-sm text-text-primary">{feat.name}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                    feat.active ? 'bg-status-green/20 text-status-green' : 'bg-secondary text-text-muted'
                  }`}>
                    {feat.label || (feat.active ? 'Active' : 'Off')}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Developer Features */}
          <section className="bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Developer Features</h3>
              {devUnlocked && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-status-green" />
                  <span className="text-xs font-medium text-status-green">Unlocked</span>
                </div>
              )}
            </div>
            {devUnlocked ? (
              <div className="mt-3 flex items-center justify-between p-3 bg-background rounded-lg">
                <p className="text-sm text-text-muted">Nextcloud and AI Solver tabs are available.</p>
                <Button variant="danger" onClick={handleDevLock}>Lock</Button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="password"
                  value={devPasswordInput}
                  onChange={(e) => setDevPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDevUnlock()}
                  placeholder="Developer password"
                  className="flex-1 max-w-xs px-3 py-2 bg-background border border-border rounded-md text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button variant="primary" onClick={handleDevUnlock}>Unlock</Button>
              </div>
            )}
          </section>

          {/* Version */}
          <p className="text-xs text-text-muted text-center">Overdue v1.0.0</p>
        </>
      )}

      {activeSection === 'sync' && (
        <CalendarSyncSection />
      )}

      {activeSection === 'gradescope' && (
        <GradescopeSyncSection />
      )}

      {activeSection === 'moodle' && (
        <MoodleSyncSection />
      )}

      {activeSection === 'ai' && (
        <section className="bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Gemini API Configuration</h3>
          <p className="text-sm text-text-muted mb-6">
            To enable AI features like parsing natural language and generating study tips, you need to provide your own Google Gemini API Key.
            <br />
            The key is stored locally on your device and is never saved to our servers.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-text-primary mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={isKeyVisible ? "text" : "password"}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setIsKeyVisible(!isKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                >
                  {isKeyVisible ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 font-medium underline transition-colors">Get one from Google AI Studio</a> (it's free).
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="primary" onClick={handleSaveKey} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save API Key'}
              </Button>
              {apiKey && (
                <Button variant="danger" onClick={handleClearKey} disabled={isLoading}>
                  {isLoading ? 'Removing...' : 'Remove Key'}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {activeSection === 'nextcloud' && devUnlocked && (
        <section className="bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Nextcloud Storage</h3>
          <p className="text-sm text-text-muted mb-6">
            Connect your self-hosted Nextcloud instance to store assignment files, solutions, and other documents in an <strong>/Overdue</strong> folder.
            <br />
            Use an App Password for security — you can create one at <em>Settings → Security → Devices &amp; sessions</em> in Nextcloud.
          </p>

          {nextcloud.isConnected ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-status-green/10 border border-status-green/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-status-green" />
                  <span className="text-sm font-medium text-status-green">Connected</span>
                </div>
                <p className="text-sm text-text-muted">
                  <strong>URL:</strong> {nextcloud.url}<br />
                  <strong>Username:</strong> {nextcloud.username}<br />
                  <strong>Files stored in:</strong> /Overdue/
                </p>
              </div>
              <div className="flex items-center">
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (confirm('Disconnect Nextcloud? Your files on Nextcloud will not be deleted.')) {
                      try {
                        await nextcloud.disconnect()
                        showToast('Nextcloud disconnected', 'info')
                      } catch {
                        showToast('Failed to disconnect', 'error')
                      }
                    }
                  }}
                  disabled={nextcloud.isLoading}
                >
                  {nextcloud.isLoading ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Nextcloud URL</label>
                <input
                  type="url"
                  value={ncUrl}
                  onChange={(e) => setNcUrl(e.target.value)}
                  placeholder="https://cloud.example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Username</label>
                <input
                  type="text"
                  value={ncUsername}
                  onChange={(e) => setNcUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">App Password</label>
                <div className="relative">
                  <input
                    type={ncPasswordVisible ? 'text' : 'password'}
                    value={ncPassword}
                    onChange={(e) => setNcPassword(e.target.value)}
                    placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setNcPasswordVisible(!ncPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                  >
                    {ncPasswordVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Generate an App Password in Nextcloud: Settings → Security → Devices &amp; sessions
                </p>
              </div>
              <div className="lg:col-span-3 flex gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!ncUrl || !ncUsername || !ncPassword) {
                      showToast('Please fill in all fields', 'error')
                      return
                    }
                    try {
                      await nextcloud.connect(ncUrl.replace(/\/+$/, ''), ncUsername, ncPassword)
                      showToast('Nextcloud connected!', 'success')
                      setNcPassword('')
                    } catch (err: any) {
                      showToast(err.message || 'Connection failed', 'error')
                    }
                  }}
                  disabled={nextcloud.isLoading}
                >
                  {nextcloud.isLoading ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'solver' && devUnlocked && (
        <section className="bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">AI Solver (Claude)</h3>
          <p className="text-sm text-text-muted mb-6">
            Automatically solve PDF assignments using Claude AI. The solver downloads your assignment PDF from Nextcloud,
            sends it to Claude via browser automation, and saves the LaTeX solution back to your Nextcloud.
            <br /><br />
            <strong>Requirements:</strong> Nextcloud must be connected, Chrome/Chromium must be installed on the server,
            and you need a valid Claude.ai session key.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-background rounded-lg">
              <div>
                <h4 className="font-medium text-text-primary mb-1">Enable AI Solver</h4>
                <p className="text-sm text-text-muted">
                  {!nextcloud.isConnected && '⚠️ Requires Nextcloud connection'}
                </p>
              </div>
              <button
                onClick={() => solver.setEnabled(!solver.isEnabled)}
                disabled={!nextcloud.isConnected}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  solver.isEnabled ? 'bg-blue-500' : 'bg-gray-600'
                } ${!nextcloud.isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    solver.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Claude Session Key */}
            {solver.claudeSessionKey ? (
              <div className="p-4 bg-status-green/10 border border-status-green/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-status-green" />
                  <span className="text-sm font-medium text-status-green">Claude Session Key Saved</span>
                </div>
                <p className="text-xs text-text-muted">Your session key is encrypted and stored on the server.</p>
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {solver.claudeSessionKey ? 'Update Claude Session Key' : 'Claude Session Key'}
              </label>
              <div className="relative">
                <input
                  type={sessionKeyVisible ? 'text' : 'password'}
                  value={sessionKeyInput}
                  onChange={(e) => setSessionKeyInput(e.target.value)}
                  placeholder={solver.claudeSessionKey ? '••••••••' : 'sk-ant-...'}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setSessionKeyVisible(!sessionKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary"
                >
                  {sessionKeyVisible ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-2">
                Get your session key: Open <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline">claude.ai</a> → DevTools (F12) → Application → Cookies → copy the <code className="text-xs bg-background px-1 rounded">sessionKey</code> value.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={async () => {
                  if (!sessionKeyInput.trim()) {
                    showToast('Please enter a session key', 'error')
                    return
                  }
                  try {
                    await solver.saveSessionKey(sessionKeyInput.trim())
                    setSessionKeyInput('')
                    showToast('Session key saved!', 'success')
                  } catch (err: any) {
                    showToast(err.message || 'Failed to save', 'error')
                  }
                }}
                disabled={isLoading}
              >
                Save Session Key
              </Button>
              {solver.claudeSessionKey && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (confirm('Remove Claude session key?')) {
                      await solver.clearSessionKey()
                      setSessionKeyInput('')
                      showToast('Session key removed', 'info')
                    }
                  }}
                >
                  Remove Key
                </Button>
              )}
            </div>

            {/* How it works */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-medium text-text-primary mb-2">How it works</h4>
              <ol className="text-sm text-text-muted space-y-1 list-decimal list-inside">
                <li>Upload a PDF assignment to an assignment via Nextcloud</li>
                <li>Click "Solve with Claude" on the assignment detail modal</li>
                <li>The server downloads the PDF, opens Claude.ai with Puppeteer, uploads the PDF, and asks Claude to solve it</li>
                <li>The LaTeX solution is saved back to your Nextcloud /Overdue/ folder</li>
                <li>Download the .tex file and compile it locally</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
