'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

function LoginContent() {
  const [error, setError] = useState<string | null>(null)
  const [buttonLoading, setButtonLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()

  // Check for error in URL params
  const urlError = searchParams.get('error')

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleGoogleLogin = () => {
    setButtonLoading(true)
    setError(null)
    signInWithGoogle()
  }

  // Show loading while checking auth
  if (loading) {
    return <div className="text-text-muted">Loading...</div>
  }

  // Don't show login form if user is logged in (will redirect)
  if (user) {
    return <div className="text-text-muted">Redirecting...</div>
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-secondary border border-border rounded-lg p-8">
        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          Welcome Back
        </h1>
        <p className="text-text-muted text-center mb-8">
          Sign in to your account
        </p>

        {(error || urlError) && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error || 'Authentication failed. Please try again.'}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={buttonLoading}
          className="w-full py-3 px-4 bg-background hover:bg-accent border border-border text-text-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {buttonLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  )
}
