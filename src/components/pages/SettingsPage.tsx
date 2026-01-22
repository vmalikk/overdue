'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'

export function SettingsPage() {
  const { showToast } = useUIStore()
  const [isExporting, setIsExporting] = useState(false)
  const [activeSection, setActiveSection] = useState<'general' | 'sync'>('general')

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
        'Are you sure you want to delete ALL data? This cannot be undone!\n\nThis will delete all assignments, courses, and settings.'
      )
    ) {
      try {
        // Clear from Appwrite would go here
        showToast('Clear feature coming soon', 'info')
      } catch (error) {
        showToast('Failed to clear data', 'error')
      }
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
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveSection('general')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeSection === 'general' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          General
          {activeSection === 'general' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-priority-medium" />
          )}
        </button>
        <button
          onClick={() => setActiveSection('sync')}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeSection === 'sync' ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Calendar Sync
          {activeSection === 'sync' && (
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
                    Permanently delete all assignments, courses, and settings
                  </p>
                </div>
                <Button onClick={handleClearAll} variant="danger">
                  Clear All
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
                <span className="px-2 py-1 bg-status-green/20 text-status-green text-xs rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-primary">Google Calendar Sync</span>
                <span className="px-2 py-1 bg-status-yellow/20 text-status-yellow text-xs rounded">Coming Soon</span>
              </div>
            </div>
          </section>
        </>
      )}

      {activeSection === 'sync' && (
        <section className="bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Google Calendar Sync</h3>
          
          <div className="space-y-4">
            <p className="text-text-muted">
              Connect your Google Calendar to automatically sync assignments as calendar events.
            </p>

            <div className="p-4 bg-status-yellow/10 border border-status-yellow/30 rounded-lg">
              <p className="text-sm text-status-yellow font-medium">Coming Soon</p>
              <p className="text-sm text-text-muted mt-1">
                Google Calendar integration is currently in development. You'll be able to:
              </p>
              <ul className="list-disc list-inside text-sm text-text-muted mt-2 space-y-1">
                <li>Import events from Google Calendar as assignments</li>
                <li>Export assignments to Google Calendar</li>
                <li>Two-way sync to keep everything in sync</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-text-primary mb-3">Setup Instructions (For Developers)</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-text-muted">
                <li>Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the Google Calendar API</li>
                <li>Create OAuth 2.0 credentials (Web application type)</li>
                <li>Add authorized redirect URI</li>
                <li>Configure environment variables</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
