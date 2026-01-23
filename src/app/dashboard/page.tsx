'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { EmailVerificationBanner } from '@/components/dashboard/EmailVerificationBanner'
import { Navigation, TabType } from '@/components/layout/Navigation'
import { AssignmentTable } from '@/components/dashboard/AssignmentTable'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'
import { StorageUsage } from '@/components/dashboard/StorageUsage'
import { QuickAddForm } from '@/components/dashboard/QuickAddForm'
import { QuickAddButton } from '@/components/dashboard/QuickAddButton'
import { CourseManager } from '@/components/courses/CourseManager'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { StatisticsPage } from '@/components/pages/StatisticsPage'
import { FullCalendarPage } from '@/components/pages/FullCalendarPage'
import { ToastContainer } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { useUIStore } from '@/store/uiStore'

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Initialize from URL or default to 'dashboard'
  const initialTab = (searchParams?.get('tab') as TabType) || 'dashboard'
  const [currentTab, setCurrentTab] = useState<TabType>(initialTab)

  const { user, loading } = useAuth()
  const { openQuickAdd } = useUIStore()

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  // Listen for open-settings event
  useEffect(() => {
    const handleOpenSettings = () => handleTabChange('settings')
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

  // Redirect to login if not authenticated
  if (!loading && !user) {
    router.push('/login')
    return null
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <EmailVerificationBanner />
        <Header />
        <Navigation currentTab={currentTab} onTabChange={handleTabChange} />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
          {/* Dashboard Tab */}
          {currentTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-8">
              {/* Main content - Assignment Table */}
              <div className="w-full order-2 lg:order-1">
                <AssignmentTable filterStatus="incomplete" filterTime="week" />
              </div>

              {/* Sidebar - Calendars */}
              <aside className="w-full flex flex-col gap-4 md:gap-6 order-1 lg:order-2">
                {/* Mini Calendar */}
                <MiniCalendar />

                {/* Daily Calendar - hide on mobile */}
                <div className="hidden md:block">
                  <DailyCalendar />
                </div>

                {/* Storage Usage */}
                <StorageUsage />
              </aside>
            </div>
          )}

          {/* Assignments Tab */}
          {currentTab === 'assignments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-text-primary">All Assignments</h2>
                <Button variant="primary" onClick={openQuickAdd}>
                  Add Assignment
                </Button>
              </div>
              <AssignmentTable filterStatus="incomplete" filterTime="all" />

              <div className="pt-8 relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-start">
                  <span className="pr-3 bg-background text-lg font-medium text-text-muted">
                    Completed
                  </span>
                </div>
              </div>

              <div className="opacity-75">
                <AssignmentTable filterStatus="completed" filterTime="all" />
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {currentTab === 'statistics' && <StatisticsPage />}

          {/* Full Calendar Tab */}
          {currentTab === 'calendar' && <FullCalendarPage />}

          {/* Courses Tab */}
          {currentTab === 'courses' && <CourseManager />}

          {/* Settings Overlay - handled via Header event */}
          {/* We'll handle settings visibility via local state if needed, or simply render it conditionally 
              based on a new state variable if we want it to overlay everything. 
              However, the simplest approach for now is to keep it renderable if switched to, 
              but since we removed the tab, we need a way to show it. 
              Let's add a state for valid 'settings' viewing. 
          */}
        </main>

        {/* Floating Add Button (only on dashboard) */}
        {currentTab === 'dashboard' && <QuickAddButton />}

        {/* Modals */}
        <QuickAddForm />

        {/* Settings Modal/Overlay */}
        <Modal
          isOpen={currentTab === 'settings'}
          onClose={() => handleTabChange('dashboard')}
          title="Settings"
          size="lg"
        >
          <SettingsPage />
        </Modal>
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-muted">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
