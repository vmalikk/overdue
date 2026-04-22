import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/ai/encryption'
import { createClient } from 'webdav'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
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

    const fileBuffer = await client.getFileContents(filePath) as Buffer
    const fileName = filePath.split('/').pop() || 'file'

    // Content type detection
    const ext = fileName.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      tex: 'application/x-latex',
      zip: 'application/zip',
    }
    const contentType = contentTypes[ext || ''] || 'application/octet-stream'

    const buf = fileBuffer instanceof Buffer ? fileBuffer : Buffer.from(fileBuffer as any)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Nextcloud download error:', error)
    return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 })
  }
}
