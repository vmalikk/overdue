'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { exportData, clearAllData } from '@/lib/db/indexedDB'

export function SettingsPage() {
  const { showToast } = useUIStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `assignments-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Data exported successfully', 'success')
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
        await clearAllData()
        showToast('All data cleared', 'success')
        window.location.reload()
      } catch (error) {
        showToast('Failed to clear data', 'error')
      }
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
        <p className="text-sm text-text-muted mt-1">
          Manage your app preferences and data
        </p>
      </div>

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
            <span className="text-text-primary font-medium">IndexedDB (Local)</span>
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
            <span className="text-text-primary">Google Calendar Sync</span>
            <span className="px-2 py-1 bg-status-yellow/20 text-status-yellow text-xs rounded">Coming Soon</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-primary">AI-Powered Features</span>
            <span className="px-2 py-1 bg-status-yellow/20 text-status-yellow text-xs rounded">Coming Soon</span>
          </div>
        </div>
      </section>
    </div>
  )
}
