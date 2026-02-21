import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/ai/encryption'
import { createClient, FileStat } from 'webdav'

export async function GET(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    const { nextcloudUrl, nextcloudUsername, nextcloudPassword } = user.prefs

    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      return NextResponse.json({ error: 'Nextcloud not configured' }, { status: 400 })
    }

    const password = decryptToken(nextcloudPassword)
    const webdavUrl = `${nextcloudUrl}/remote.php/dav/files/${nextcloudUsername}`

    const client = createClient(webdavUrl, {
      username: nextcloudUsername,
      password,
    })

    const path = request.nextUrl.searchParams.get('path') || '/Overdue'

    // Safety: only allow listing within /Overdue
    if (!path.startsWith('/Overdue')) {
      return NextResponse.json({ error: 'Can only list within /Overdue' }, { status: 400 })
    }

    const exists = await client.exists(path)
    if (!exists) {
      return NextResponse.json({ items: [] })
    }

    const items = await client.getDirectoryContents(path) as FileStat[]

    const result = items.map((item) => ({
      name: item.basename,
      path: item.filename,
      type: item.type, // 'file' or 'directory'
      size: item.size,
      lastmod: item.lastmod,
    }))

    return NextResponse.json({ items: result, path })
  } catch (error: any) {
    console.error('Nextcloud list error:', error)
    return NextResponse.json({ error: error.message || 'Failed to list files' }, { status: 500 })
  }
}
