import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/appwrite/server'
import { encryptToken, isEncryptionKeyConfigured } from '@/lib/gradescope/encryption'
import { ConnectRequest, ConnectResponse } from '@/types/gradescope'

const GRADESCOPE_LOGIN_URL = 'https://www.gradescope.com/api/v1/user_session'

export async function POST(request: NextRequest): Promise<NextResponse<ConnectResponse>> {
  try {
    // Check encryption key is configured
    if (!isEncryptionKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Gradescope integration is not configured. Contact admin.' },
        { status: 500 }
      )
    }

    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: ConnectRequest = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    // Attempt to login to Gradescope
    const loginResponse = await fetch(GRADESCOPE_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    })

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text()
      console.error('Gradescope login failed:', loginResponse.status, errorText)

      if (loginResponse.status === 401 || loginResponse.status === 422) {
        return NextResponse.json(
          { success: false, error: 'Invalid Gradescope credentials. Please check your email and password.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to connect to Gradescope. Please try again later.' },
        { status: 500 }
      )
    }

    // Extract session token from response cookies
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    if (!setCookieHeader) {
      return NextResponse.json(
        { success: false, error: 'Failed to get session from Gradescope.' },
        { status: 500 }
      )
    }

    // Parse the session token from cookies
    // Gradescope uses _gradescope_session cookie
    const sessionMatch = setCookieHeader.match(/_gradescope_session=([^;]+)/)
    const signedInUserMatch = setCookieHeader.match(/signed_in_user_id=([^;]+)/)

    if (!sessionMatch) {
      // Try getting token from response body as fallback
      const responseData = await loginResponse.json().catch(() => null)
      if (responseData?.token) {
        // API returned a token directly
        const encryptedToken = encryptToken(responseData.token)

        // Calculate token expiry (sessions typically last 30 days)
        const tokenExpiry = new Date()
        tokenExpiry.setDate(tokenExpiry.getDate() + 30)

        // Store in user preferences using Admin SDK
        const { users } = createAdminClient()
        await users.updatePrefs(user.$id, {
          ...user.prefs,
          gradescopeConnected: true,
          gradescopeEmail: email,
          gradescopeSessionToken: encryptedToken,
          gradescopeTokenExpiry: tokenExpiry.toISOString(),
          gradescopeLastSync: null
        })

        return NextResponse.json({
          success: true,
          email: email
        })
      }

      return NextResponse.json(
        { success: false, error: 'Failed to extract session token from Gradescope response.' },
        { status: 500 }
      )
    }

    // Encrypt the session token
    const sessionToken = sessionMatch[1]
    const encryptedToken = encryptToken(sessionToken)

    // Calculate token expiry (Gradescope sessions typically last 30 days)
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 30)

    // Store in user preferences using Admin SDK
    const { users } = createAdminClient()
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      gradescopeConnected: true,
      gradescopeEmail: email,
      gradescopeSessionToken: encryptedToken,
      gradescopeTokenExpiry: tokenExpiry.toISOString(),
      gradescopeLastSync: null
    })

    return NextResponse.json({
      success: true,
      email: email
    })

  } catch (error) {
    console.error('Error connecting to Gradescope:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
