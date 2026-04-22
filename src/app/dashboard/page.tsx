'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar, TabType } from '@/components/layout/Sidebar'
import { DashboardTab } from '@/components/dashboard/DashboardTab'
import { RightSidebar } from '@/components/dashboard/RightSidebar'
import { AssignmentsTab } from '@/components/pages/AssignmentsTab'
import { CoursesTab } from '@/components/pages/CoursesTab'
import { StatisticsTab } from '@/components/pages/StatisticsTab'
import { FullCalendarPage } from '@/components/pages/FullCalendarPage'
import { SettingsModal } from '@/components/pages/SettingsModal'
import { QuickAddForm } from '@/components/dashboard/QuickAddForm'
import { ToastContainer } from '@/components/ui/Toast'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { SnowCanvas } from '@/components/ui/SnowCanvas'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { useUIStore } from '@/store/uiStore'

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading } = useAuth()
  const { openQuickAdd, snowEnabled, openSettings, isSettingsOpen, closeSettings, theme, accentHue } = useUIStore()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--ah', String(accentHue))
  }, [accentHue])

  const initialTab = (searchParams?.get('tab') as TabType) || 'dashboard'
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab)

  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab)
    if (tab === 'settings') {
      openSettings()
      return
    }
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.metaKey || e.ctrlKey) {
        if (e.key === ',') {
          e.preventDefault()
          openSettings()
        }
        return
      }
      if (e.altKey) return
      switch (e.key.toLowerCase()) {
        case 'd': handleTabChange('dashboard'); break
        case 'a': handleTabChange('assignments'); break
        case 'l': handleTabChange('calendar'); break
        case 'c': handleTabChange('courses'); break
        case 's': handleTabChange('statistics'); break
        case 'n': openQuickAdd(); break
        case 'escape': closeSettings(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Listen for open-settings event
  useEffect(() => {
    const h = () => openSettings()
    window.addEventListener('open-settings', h)
    return () => window.removeEventListener('open-settings', h)
  }, [])

  if (loading) return <LoadingSkeleton />

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Main scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {currentTab === 'dashboard' && <DashboardTab />}
          {currentTab === 'assignments' && <AssignmentsTab />}
          {currentTab === 'calendar' && <FullCalendarPage />}
          {currentTab === 'courses' && <CoursesTab />}
          {currentTab === 'statistics' && <StatisticsTab />}
        </div>

        {/* Right sidebar — dashboard only */}
        {currentTab === 'dashboard' && <RightSidebar />}
      </div>

      {/* Modals */}
      <QuickAddForm />
      {isSettingsOpen && <SettingsModal onClose={closeSettings} />}

      {/* Toasts */}
      <ToastContainer />

      {/* Snow */}
      {snowEnabled && <SnowCanvas />}
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
