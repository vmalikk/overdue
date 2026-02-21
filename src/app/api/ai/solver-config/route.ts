import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient, createAdminClient } from '@/lib/appwrite/server'
import { encryptToken, decryptToken } from '@/lib/ai/encryption'

// GET — check solver config status
export async function GET(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    return NextResponse.json({
      solverEnabled: !!user.prefs?.solverEnabled,
      hasClaudeSession: !!user.prefs?.claudeSessionKey,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST — update solver settings (toggle + session key)
export async function POST(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()
    const body = await request.json()

    const { users } = createAdminClient()
    const updatedPrefs: Record<string, any> = { ...user.prefs }

    if (typeof body.solverEnabled === 'boolean') {
      updatedPrefs.solverEnabled = body.solverEnabled
    }

    if (body.claudeSessionKey) {
      updatedPrefs.claudeSessionKey = encryptToken(body.claudeSessionKey)
    }

    await users.updatePrefs(user.$id, updatedPrefs)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update solver config' }, { status: 500 })
  }
}

// DELETE — remove Claude session key
export async function DELETE(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    const { users } = createAdminClient()
    const updatedPrefs: Record<string, any> = { ...user.prefs }
    delete updatedPrefs.claudeSessionKey
    updatedPrefs.solverEnabled = false

    await users.updatePrefs(user.$id, updatedPrefs)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
