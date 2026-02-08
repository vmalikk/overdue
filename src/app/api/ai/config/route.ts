import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { createAdminClient } from '@/lib/appwrite/admin'
import { encryptToken } from '@/lib/ai/encryption'

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 })
    }

    // Use session client to verify user
    const { account } = await createSessionClient()
    const user = await account.get()

    // Encrypt the API key
    const encryptedKey = encryptToken(apiKey)

    // Store in user preferences using Admin SDK (to update prefs)
    const { users } = createAdminClient()
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      geminiApiKey: encryptedKey,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving API Key:', error)
    return NextResponse.json({ error: 'Failed to save API Key' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { account } = await createSessionClient()
    const user = await account.get()

    const { users } = createAdminClient()
    
    // Remove the key from prefs
    const newPrefs = { ...user.prefs }
    delete newPrefs.geminiApiKey
    
    // Check if there is a proper way to delete a key in Appwrite prefs (usually just nulling it doesn't remove the key completely, but setting to null or undefined works? Appwrite prefs is a free-form JSON object).
    // Actually, Appwrite updatePrefs replaces the whole object? No, it merges?
    // "Update the user preferences by merging the new preferences with the existing preferences."
    // So to delete, I might need to set it to null? Or just keep it as null.
    
    // Let's set it to null explicitly to "clear" it.
    await users.updatePrefs(user.$id, {
      ...user.prefs,
      geminiApiKey: null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing API Key:', error)
    return NextResponse.json({ error: 'Failed to remove API Key' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { account } = await createSessionClient()
    const user = await account.get()

    const hasKey = !!user.prefs.geminiApiKey

    return NextResponse.json({ hasKey })
  } catch (error) {
    // If not authenticated, return false
    return NextResponse.json({ hasKey: false })
  }
}
