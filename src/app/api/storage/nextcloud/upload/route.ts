import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/ai/encryption'
import { createClient } from 'webdav'

function getNextcloudClient(user: any) {
  const { nextcloudUrl, nextcloudUsername, nextcloudPassword } = user.prefs

  if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
    throw new Error('Nextcloud not configured. Go to Settings to connect.')
  }

  const password = decryptToken(nextcloudPassword)
  const webdavUrl = `${nextcloudUrl}/remote.php/dav/files/${nextcloudUsername}`

  return createClient(webdavUrl, {
    username: nextcloudUsername,
    password: password,
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const courseName = (formData.get('courseName') as string) || 'General'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const { account } = await createSessionClient(request)
    const user = await account.get()

    const client = getNextcloudClient(user)

    // Organize files: /Overdue/CourseName/FileBaseName/filename
    const safeCourse = courseName.replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || 'General'
    const fileName = file.name
    // Strip extension to get the base name for the subfolder
    const baseName = fileName.replace(/\.[^.]+$/, '').trim() || fileName
    const coursePath = `/Overdue/${safeCourse}`
    const folderPath = `${coursePath}/${baseName}`

    // Ensure directories exist
    try {
      if (!(await client.exists('/Overdue'))) {
        await client.createDirectory('/Overdue')
      }
    } catch { /* may already exist */ }

    try {
      if (!(await client.exists(coursePath))) {
        await client.createDirectory(coursePath)
      }
    } catch { /* may already exist */ }

    try {
      if (!(await client.exists(folderPath))) {
        await client.createDirectory(folderPath)
      }
    } catch { /* may already exist */ }

    // Upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fullPath = `${folderPath}/${fileName}`

    await client.putFileContents(fullPath, buffer, { overwrite: true })

    return NextResponse.json({
      success: true,
      path: fullPath,
      fileName: fileName,
    })
  } catch (error: any) {
    console.error('Nextcloud upload error:', error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
