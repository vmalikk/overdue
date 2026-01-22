'use client'

import { useState } from 'react'
import { Header } from '@/components/dashboard/Header'
import { Navigation, TabType } from '@/components/layout/Navigation'
import { AssignmentTable } from '@/components/dashboard/AssignmentTable'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { DailyCalendar } from '@/components/dashboard/DailyCalendar'
import { QuickAddForm } from '@/components/dashboard/QuickAddForm'
import { QuickAddButton } from '@/components/dashboard/QuickAddButton'
import { CourseManager } from '@/components/courses/CourseManager'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { CalendarSyncPage } from '@/components/pages/CalendarSyncPage'
import { StatisticsPage } from '@/components/pages/StatisticsPage'
import { FullCalendarPage } from '@/components/pages/FullCalendarPage'
import { ToastContainer } from '@/components/ui/Toast'

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard')

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Dashboard Tab */}
          {currentTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              {/* Main content - Assignment Table */}
              <div className="w-full">
                <AssignmentTable />
              </div>

              {/* Sidebar - Calendars */}
              <aside className="w-full flex flex-col gap-6">
                {/* Mini Calendar */}
                <MiniCalendar />

                {/* Daily Calendar */}
                <DailyCalendar />
              </aside>
            </div>
          )}

          {/* Statistics Tab */}
          {currentTab === 'statistics' && <StatisticsPage />}

          {/* Full Calendar Tab */}
          {currentTab === 'fullcalendar' && <FullCalendarPage />}

          {/* Courses Tab */}
          {currentTab === 'courses' && <CourseManager />}

          {/* Calendar Sync Tab */}
          {currentTab === 'calendar' && <CalendarSyncPage />}

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
