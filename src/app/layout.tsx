import type { Metadata } from 'next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { AppwriteAuthProvider } from '@/components/providers/AppwriteAuthProvider'
import { GlobalModals } from '@/components/providers/GlobalModals'
import './globals.css'

export const metadata: Metadata = {
  title: 'Overdue - Assignment Tracker',
  description: 'Track your academic assignments with intelligent color-coding and AI-powered features',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary min-h-screen">
        <AppwriteAuthProvider>
          <SessionProvider>
            {children}
            <GlobalModals />
          </SessionProvider>
        </AppwriteAuthProvider>
      </body>
    </html>
  )
}
