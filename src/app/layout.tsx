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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: 'var(--bg)', color: 'var(--text)', height: '100%', overflow: 'hidden' }}>
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
