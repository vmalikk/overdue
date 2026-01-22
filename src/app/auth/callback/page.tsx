'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

export default function AuthCallback() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Wait for auth to finish loading
    if (!loading) {
      if (user) {
        // Successfully authenticated, go to dashboard
        router.replace('/')
      } else {
        // Auth failed, go back to login
        router.replace('/login?error=auth')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-text-muted">Completing sign in...</p>
      </div>
    </div>
  )
}
