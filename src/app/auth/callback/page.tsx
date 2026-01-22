'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { account } from '@/lib/appwrite/client'

export default function AuthCallback() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState('Completing sign in...')
  const maxAttempts = 10

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setStatus(`Checking session (attempt ${attempts + 1})...`)
        // Try to get the current user
        const user = await account.get()
        if (user) {
          setStatus('Success! Redirecting...')
          // Successfully authenticated, go to dashboard
          // Force a full page reload to ensure cookies are picked up
          window.location.href = '/'
          return
        }
      } catch (error: any) {
        // Session not ready yet
        console.log('Auth check attempt', attempts + 1, 'error:', error?.message || error)
      }

      // Retry after a delay
      if (attempts < maxAttempts) {
        setTimeout(() => {
          setAttempts(prev => prev + 1)
        }, 500)
      } else {
        // Max attempts reached, redirect to login with error
        router.replace('/login?error=auth')
      }
    }

    checkAuth()
  }, [attempts, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-text-muted">{status}</p>
      </div>
    </div>
  )
}
