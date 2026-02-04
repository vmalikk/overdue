import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/appwrite/server'
import { StatusResponse, GradescopeUserPrefs } from '@/types/gradescope'

export async function GET(): Promise<NextResponse<StatusResponse>> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { connected: false },
        { status: 401 }
      )
    }

    const prefs = user.prefs as GradescopeUserPrefs

    // Check if connected
    const connected = prefs.gradescopeConnected === true && !!prefs.gradescopeSessionToken

    // Check if token is expired
    let tokenValid = false
    if (connected && prefs.gradescopeTokenExpiry) {
      const expiry = new Date(prefs.gradescopeTokenExpiry)
      tokenValid = expiry > new Date()
    }

    return NextResponse.json({
      connected: connected && tokenValid,
      email: connected ? prefs.gradescopeEmail : undefined,
      lastSync: prefs.gradescopeLastSync || undefined,
      tokenExpiry: prefs.gradescopeTokenExpiry || undefined
    })

  } catch (error) {
    console.error('Error getting Gradescope status:', error)
    return NextResponse.json(
      { connected: false },
      { status: 500 }
    )
  }
}
