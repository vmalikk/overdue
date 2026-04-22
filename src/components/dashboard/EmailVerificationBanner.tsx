'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { Button } from '@/components/ui/Button'

export function EmailVerificationBanner() {
    const { user, sendVerificationEmail } = useAuth()
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    if (!user || user.emailVerification) {
        return null
    }

    const handleResend = async () => {
        setSending(true)
        setError('')
        try {
            await sendVerificationEmail()
            setSent(true)
        } catch (err: any) {
            setError(err.message || 'Failed to send verification email.')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-3">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-yellow-600 bg-yellow-500/20 p-1.5 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </span>
                    <p className="text-sm text-yellow-500">
                        Your email address is not verified. Please verify your email to access all features.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {error && <span className="text-xs text-red-400">{error}</span>}
                    {sent ? (
                        <span className="text-xs text-green-400 font-medium">Verification email sent!</span>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResend}
                            disabled={sending}
                            className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 h-8 text-xs"
                        >
                            {sending ? 'Sending...' : 'Resend Verification Email'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
