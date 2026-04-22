'use client'

import React from 'react'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-text-primary p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-priority-high">Privacy Policy</h1>
            <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-6 text-text-secondary">
                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">1. Introduction</h2>
                    <p>Welcome to Overdue. We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our assignment tracking service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">2. Information We Collect</h2>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Account Information:</strong> Name, email address, and profile picture provided via Google Login or email signup.</li>
                        <li><strong>User Content:</strong> Assignments, course details, and calendar events you create or sync.</li>
                        <li><strong>Usage Data:</strong> Basic interaction data to improve app performance.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">3. How We Use Your Data</h2>
                    <p>We use your data solely to providing the Overdue service, including:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Managing your assignment dashboard and reminders.</li>
                        <li>Syncing with your Google Calendar (only with your explicit permission).</li>
                        <li>Sending account notifications (e.g., password resets).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">4. Data Sharing and Google User Data</h2>
                    <p>Overdue does <strong>not</strong> sell your data to third parties.</p>
                    <p className="mt-2"><strong>Google Calendar Integration:</strong></p>
                    <p>If you choose to connect Google Calendar, we access your calendar data only to display and sync events within Overdue. Overdue's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-500 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">5. Data Security</h2>
                    <p>We implement industry-standard security measures, including encryption and secure database storage, to protect your information.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2 text-text-primary">6. Contact Us</h2>
                    <p>If you have questions about this policy, please contact us at support@overdueonline.com.</p>
                </section>
            </div>
        </div>
    )
}
