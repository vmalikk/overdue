'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [msg, setMsg] = useState('')
    const { resetPassword } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setMsg('')

        try {
            await resetPassword(email)
            setStatus('success')
            setMsg('If an account exists with this email, you will receive a password reset link shortly.')
        } catch (error: any) {
            setStatus('error')
            setMsg(error.message || 'Failed to send reset email')
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-secondary border border-border rounded-lg p-8">
                    <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
                        Reset Password
                    </h1>
                    <p className="text-text-muted text-center mb-8">
                        Enter your email to receive recovery instructions
                    </p>

                    {status === 'success' ? (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 text-center">
                            {msg}
                            <div className="mt-4">
                                <Link href="/login" className="text-primary hover:underline font-medium">
                                    Return to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {status === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {msg}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center mt-4 text-sm">
                                <Link href="/login" className="text-text-muted hover:text-text-primary transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
