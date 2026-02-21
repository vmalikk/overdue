import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/ai/encryption'
import { createClient } from 'webdav'

export async function DELETE(request: NextRequest) {
  try {
    const { path } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    const { account } = await createSessionClient(request)
    const user = await account.get()

    const { nextcloudUrl, nextcloudUsername, nextcloudPassword } = user.prefs
    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      return NextResponse.json({ error: 'Nextcloud not configured' }, { status: 401 })
    }

    const password = decryptToken(nextcloudPassword)
    const webdavUrl = `${nextcloudUrl}/remote.php/dav/files/${nextcloudUsername}`

    const client = createClient(webdavUrl, {
      username: nextcloudUsername,
      password: password,
    })

    await client.deleteFile(path)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Nextcloud delete error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete file' }, { status: 500 })
  }
}
