import type { Metadata } from 'next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { AppwriteAuthProvider } from '@/components/providers/AppwriteAuthProvider'
import { GlobalModals } from '@/components/providers/GlobalModals'
import './globals.css'

export const metadata: Metadata = {
  title: 'Overdue - Assignment Tracker',
  description: 'Track your academic assignments with intelligent color-coding and AI-powered features',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
