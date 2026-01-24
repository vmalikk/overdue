'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { useAssignmentStore } from '@/store/assignmentStore'
import { useCourseStore } from '@/store/courseStore'
import { CalendarSyncSection } from './CalendarSyncSection'

export function SettingsPage() {
  const { showToast, apiKey, setApiKey } = useUIStore()
  const { deleteAllAssignments, assignments } = useAssignmentStore()
  const { deleteAllCourses, courses } = useCourseStore()
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'sync' | 'ai'>('general')
  const [inputKey, setInputKey] = useState('')
  const [isKeyVisible, setIsKeyVisible] = useState(false)

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

  const handleSaveKey = () => {
    if (!inputKey.trim()) {
      showToast('Please enter a valid API key', 'error')
      return
    }

    if (!inputKey.startsWith('AIza')) {
      showToast('That doesn\'t look like a valid Gemini API key', 'warning')
    }

    setApiKey(inputKey)
    showToast('API Key saved successfully!', 'success')
  }

  const handleClearKey = () => {
    if (confirm('Are you sure you want to remove your API key? AI features will be disabled.')) {
      setApiKey(null)
      setInputKey('')
      showToast('API Key removed', 'info')
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
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
          onClick={() => setActiveSection('ai')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${activeSection === 'ai' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
        >
          AI Configuration
          {activeSection === 'ai' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
      </div>

      {activeSection === 'general' && (
        <>
          {/* Data Management Section */}
          <section className="bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Data Management</h3>

            <div className="space-y-4">
              {/* Export Data */}
              <div className="flex items-start justify-between p-4 bg-background rounded-lg">
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Export Data</h4>
                  <p className="text-sm text-text-muted">
                    Download all your assignments and courses as a JSON file
                  </p>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  variant="secondary"
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>

              {/* Clear All Data */}
              <div className="flex items-start justify-between p-4 bg-background rounded-lg border border-status-red/30">
                <div>
                  <h4 className="font-medium text-status-red mb-1">Clear All Data</h4>
                  <p className="text-sm text-text-muted">
                    Permanently delete all {assignments.length} assignments and {courses.length} courses
                  </p>
                </div>
                <Button onClick={handleClearAll} variant="danger" disabled={isClearing}>
                  {isClearing ? 'Deleting...' : 'Clear All'}
                </Button>
              </div>
            </div>
          </section>

          {/* App Information */}
          <section className="bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">About</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Version</span>
                <span className="text-text-primary font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Storage</span>
                <span className="text-text-primary font-medium">Appwrite Cloud</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Theme</span>
                <span className="text-text-primary font-medium">Dark Mode</span>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Features Status</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-primary">Assignment Tracking</span>
                <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary">Course Management</span>
                <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary">Cloud Sync</span>
                <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary">AI-Powered Parsing</span>
                {apiKey ? (
                  <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active (BYOK)</span>
                ) : (
                  <span className="px-2 py-1 bg-secondary text-text-muted text-xs rounded">Pending Key</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary">Google Calendar Sync</span>
                <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active</span>
              </div>
            </div>
          </section>
        </>
      )}

      {activeSection === 'sync' && (
        <CalendarSyncSection />
      )}

      {activeSection === 'ai' && (
        <section className="bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Gemini API Configuration</h3>
          <p className="text-sm text-text-muted mb-6">
            To enable AI features like parsing natural language and generating study tips, you need to provide your own Google Gemini API Key.
            <br />
            The key is stored locally on your device and is never saved to our servers.
          </p>

          <div className="space-y-4 max-w-xl">
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
              <Button variant="primary" onClick={handleSaveKey}>
                Save API Key
              </Button>
              {apiKey && (
                <Button variant="danger" onClick={handleClearKey}>
                  Remove Key
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
