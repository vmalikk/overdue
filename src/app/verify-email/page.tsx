'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

function VerifyEmailContent() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [msg, setMsg] = useState('Verifying your email...')

    const searchParams = useSearchParams()
    const { verifyEmail } = useAuth()
    const router = useRouter()

    const userId = searchParams.get('userId')
    const secret = searchParams.get('secret')

    useEffect(() => {
        if (!userId || !secret) {
            setStatus('error')
            setMsg('Invalid verification link.')
            return
        }

        const verify = async () => {
            try {
                await verifyEmail(userId, secret)
                setStatus('success')
                setMsg('Email verified successfully! Redirecting to dashboard...')
                setTimeout(() => {
                    router.push('/dashboard')
                }, 3000)
            } catch (error: any) {
                setStatus('error')
                setMsg(error.message || 'Failed to verify email.')
            }
        }

        verify()
    }, [userId, secret, verifyEmail, router])

    return (
        <div className="w-full max-w-md bg-secondary border border-border rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">Email Verification</h1>

            {status === 'loading' && (
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-text-muted">{msg}</p>
                </div>
            )}

            {status === 'success' && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
                    <p className="font-medium mb-2">Success!</p>
                    <p>{msg}</p>
                </div>
            )}

            {status === 'error' && (
                <div className="space-y-4">
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                        <p className="font-medium mb-2">Verification Failed</p>
                        <p>{msg}</p>
                    </div>
                    <Link href="/dashboard" className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        Go to Dashboard
                    </Link>
                </div>
            )}
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    )
}
