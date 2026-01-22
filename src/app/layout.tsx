import type { Metadata } from 'next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { AppwriteAuthProvider } from '@/components/providers/AppwriteAuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Overdue - Assignment Tracker',
  description: 'Track your academic assignments with intelligent color-coding and AI-powered features',
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
          </SessionProvider>
        </AppwriteAuthProvider>
      </body>
    </html>
  )
}
