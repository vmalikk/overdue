'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

function ResetPasswordContent() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [msg, setMsg] = useState('')

    const router = useRouter()
    const searchParams = useSearchParams()
    const { updatePassword } = useAuth()

    const userId = searchParams.get('userId')
    const secret = searchParams.get('secret')

    useEffect(() => {
        if (!userId || !secret) {
            setStatus('error')
            setMsg('Invalid or missing recovery link.')
        }
    }, [userId, secret])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            setMsg('Passwords do not match')
            setStatus('error')
            return
        }

        if (password.length < 8) {
            setMsg('Password must be at least 8 characters')
            setStatus('error')
            return
        }

        if (!userId || !secret) return

        setStatus('loading')
        setMsg('')

        try {
            await updatePassword(password, secret, userId, confirmPassword)
            setStatus('success')
            setMsg('Password updated successfully! Redirecting to login...')
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (error: any) {
            setStatus('error')
            setMsg(error.message || 'Failed to update password')
        }
    }

    if (status === 'error' && !msg) {
        // Initial invalid state
        return (
            <div className="text-center">
                <h1 className="text-xl font-bold text-red-500 mb-4">Invalid Link</h1>
                <p className="text-text-muted mb-4">This password reset link is invalid or expired.</p>
                <Link href="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md">
            <div className="bg-secondary border border-border rounded-lg p-8">
                <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
                    Set New Password
                </h1>

                {status === 'success' ? (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-center">
                        {msg}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {status === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                                {msg}
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                                New Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <Suspense fallback={<div className="text-text-muted">Loading...</div>}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    )
}
