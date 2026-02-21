import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server'
import { encryptToken, decryptToken } from '@/lib/ai/encryption'

export async function POST(request: NextRequest) {
  try {
    const { url, username, password } = await request.json()

    if (!url || !username || !password) {
      return NextResponse.json({ error: 'URL, username, and app password are all required' }, { status: 400 })
    }

    const { account } = await createSessionClient(request)
    const user = await account.get()

    // Encrypt the app password
    const encryptedPassword = encryptToken(password)

    // Store in user preferences
    const { users } = createAdminClient()
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      nextcloudUrl: url.replace(/\/$/, ''), // strip trailing slash
      nextcloudUsername: username,
      nextcloudPassword: encryptedPassword,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving Nextcloud config:', error)
    return NextResponse.json({
      error: error.message || 'Failed to save Nextcloud configuration',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    const { users } = createAdminClient()
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      nextcloudUrl: null,
      nextcloudUsername: null,
      nextcloudPassword: null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing Nextcloud config:', error)
    return NextResponse.json({ error: 'Failed to remove Nextcloud configuration' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    const isConnected = !!(user.prefs.nextcloudUrl && user.prefs.nextcloudUsername && user.prefs.nextcloudPassword)

    return NextResponse.json({
      isConnected,
      url: user.prefs.nextcloudUrl || '',
      username: user.prefs.nextcloudUsername || '',
    })
  } catch (error) {
    return NextResponse.json({ isConnected: false, url: '', username: '' })
  }
}
