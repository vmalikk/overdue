'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/dashboard/Header'
import { Navigation, TabType } from '@/components/layout/Navigation'
import { AssignmentTable } from '@/components/dashboard/AssignmentTable'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'
import { QuickAddForm } from '@/components/dashboard/QuickAddForm'
import { QuickAddButton } from '@/components/dashboard/QuickAddButton'
import { CourseManager } from '@/components/courses/CourseManager'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { StatisticsPage } from '@/components/pages/StatisticsPage'
import { FullCalendarPage } from '@/components/pages/FullCalendarPage'
import { ToastContainer } from '@/components/ui/Toast'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard')
  const { user, loading } = useAuth()
  const router = useRouter()

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
        <Header />
        <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
          {/* Dashboard Tab */}
          {currentTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-8">
              {/* Main content - Assignment Table */}
              <div className="w-full order-2 lg:order-1">
                <AssignmentTable />
              </div>

              {/* Sidebar - Calendars */}
              <aside className="w-full flex flex-col gap-4 md:gap-6 order-1 lg:order-2">
                {/* Mini Calendar */}
                <MiniCalendar />

                {/* Daily Calendar - hide on mobile */}
                <div className="hidden md:block">
                  <DailyCalendar />
                </div>
              </aside>
            </div>
          )}

          {/* Statistics Tab */}
          {currentTab === 'statistics' && <StatisticsPage />}

          {/* Full Calendar Tab */}
          {currentTab === 'fullcalendar' && <FullCalendarPage />}

          {/* Courses Tab */}
          {currentTab === 'courses' && <CourseManager />}

          {/* Settings Tab */}
          {currentTab === 'settings' && <SettingsPage />}
        </main>

        {/* Floating Add Button (only on dashboard) */}
        {currentTab === 'dashboard' && <QuickAddButton />}

        {/* Modals */}
        <QuickAddForm />
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </>
  )
}
