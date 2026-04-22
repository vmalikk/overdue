'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { account } from '@/lib/appwrite/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Completing sign in...')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth token in URL params (from createOAuth2Token)
        const userId = searchParams.get('userId')
        const secret = searchParams.get('secret')

        if (userId && secret) {
          setStatus('Creating session...')
          // Exchange the token for a session
          await account.createSession(userId, secret)
          setStatus('Success! Redirecting...')
          window.location.href = '/'
          return
        }

        // Fallback: check if already authenticated (cookie-based flow)
        setStatus('Checking session...')
        const user = await account.get()
        if (user) {
          setStatus('Success! Redirecting...')
          window.location.href = '/'
          return
        }

        // No session found
        throw new Error('No session token received')
      } catch (error: any) {
        const msg = error?.message || error?.toString() || 'Unknown error'
        console.error('Auth callback error:', msg)
        setErrorMsg(msg)
        // Wait a moment before redirecting to show error
        setTimeout(() => {
          router.replace('/login?error=auth')
        }, 2000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-text-muted">{status}</p>
        {errorMsg && (
          <p className="text-red-400 text-sm mt-2 max-w-md px-4">
            Debug: {errorMsg}
          </p>
        )}
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
