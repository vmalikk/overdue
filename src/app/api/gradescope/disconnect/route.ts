import { NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/appwrite/server'
import { DisconnectResponse } from '@/types/gradescope'

export async function POST(): Promise<NextResponse<DisconnectResponse>> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Clear Gradescope preferences using Admin SDK
    const { users } = createAdminClient()

    // Remove all Gradescope-related preferences
    const updatedPrefs = { ...user.prefs }
    delete updatedPrefs.gradescopeConnected
    delete updatedPrefs.gradescopeEmail
    delete updatedPrefs.gradescopeSessionToken
    delete updatedPrefs.gradescopeTokenExpiry
    delete updatedPrefs.gradescopeLastSync

    await users.updatePrefs(user.$id, updatedPrefs)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error disconnecting from Gradescope:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect. Please try again.' },
      { status: 500 }
    )
  }
}
