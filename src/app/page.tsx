'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/providers/AppwriteAuthProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
    const { user, loading } = useAuth()
    const router = useRouter()

    // Redirect to dashboard if logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/dashboard')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-text-primary overflow-hidden">
            {/* Navigation */}
            <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
                <div className="text-2xl font-bold tracking-tight">Overdue</div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                    >
                        Sign up
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                            Never miss an assignment again.
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <p className="text-xl md:text-2xl text-text-muted mb-12 leading-relaxed">
                            Track your coursework, sync with your calendar, and get AI-powered study tips.
                            The intelligent assignment tracker tailored for students.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href="/signup"
                            className="px-8 py-4 bg-primary text-white text-lg font-semibold rounded-full hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
                        >
                            Get Started for Free
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-secondary text-text-primary text-lg font-semibold rounded-full hover:bg-secondary/80 transition-all"
                        >
                            Log In
                        </Link>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-8 mt-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="p-8 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm"
                    >
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 mb-6 font-bold text-2xl">
                            📅
                        </div>
                        <h3 className="text-xl font-bold mb-3">Smart Sync</h3>
                        <p className="text-text-muted">
                            Automatically syncs your assignments with Google Calendar so you never double-book yourself.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="p-8 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm"
                    >
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 mb-6 font-bold text-2xl">
                            🤖
                        </div>
                        <h3 className="text-xl font-bold mb-3">AI Powered</h3>
                        <p className="text-text-muted">
                            Paste your syllabus or type naturally. Our AI parses dates, details, and generates study plans instantly.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="p-8 rounded-2xl bg-secondary/50 border border-border backdrop-blur-sm"
                    >
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500 mb-6 font-bold text-2xl">
                            🔒
                        </div>
                        <h3 className="text-xl font-bold mb-3">Private & Secure</h3>
                        <p className="text-text-muted">
                            Your data belongs to you. Bring your own API keys for AI features and keep full control.
                        </p>
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-12 text-center text-text-muted text-sm">
                <p>© {new Date().getFullYear()} Overdue. All rights reserved.</p>
            </footer>
        </div>
    )
}
