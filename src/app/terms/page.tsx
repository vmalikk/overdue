'use client'

import React from 'react'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-text-primary p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-priority-high">Terms of Service</h1>
            <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-6 text-text-secondary">
                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">1. Acceptance of Terms</h2>
                    <p>By accessing and using Overdue ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">2. Use of License</h2>
                    <p>Overdue grants you a personal, non-exclusive, non-transferable license to use the Service for personal productivity and academic tracking purposes.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">3. User Responsibilities</h2>
                    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">4. Termination</h2>
                    <p>We reserve the right to terminate or suspend access to our Service immediately, without prior notice, for any reason, including without limitation if you breach the Terms.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">5. Limitation of Liability</h2>
                    <p>In no event shall Overdue be liable for any indirect, incidental, special, consequential or punitive damages arising out of or related to your use of the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">6. Contact</h2>
                    <p>For any questions regarding these Terms, please contact us at support@overdueonline.com.</p>
                </section>
            </div>
        </div>
    )
}
