import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'
import { decryptToken } from '@/lib/ai/encryption'

const SOLVER_URL = 'https://solver.malikv.com/solve'
const SOLVER_SECRET = process.env.SOLVER_SECRET

// POST /api/ai/solve — proxy to external solver server
export async function POST(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    const user = await account.get()

    // Verify solver is enabled in prefs
    if (!user.prefs?.solverEnabled) {
      return NextResponse.json({ error: 'Solver is not enabled' }, { status: 400 })
    }

    if (!SOLVER_SECRET) {
      return NextResponse.json({ error: 'Solver not configured on server' }, { status: 500 })
    }

    const body = await request.json()
    const { nextcloudFilePath, assignmentTitle } = body

    if (!nextcloudFilePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 })
    }

    // Get Nextcloud credentials from user prefs
    const { nextcloudUrl, nextcloudUsername, nextcloudPassword } = user.prefs
    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
      return NextResponse.json({ error: 'Nextcloud not configured' }, { status: 400 })
    }

    // Get Claude session key
    const claudeSessionKey = user.prefs?.claudeSessionKey
      ? decryptToken(user.prefs.claudeSessionKey)
      : null

    if (!claudeSessionKey) {
      return NextResponse.json({
        error: 'Claude session key not configured. Add your sessionKey cookie from claude.ai in Settings > AI Solver.',
      }, { status: 400 })
    }

    // Forward to the external solver server with decrypted credentials
    const solverRes = await fetch(SOLVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SOLVER_SECRET}`,
      },
      body: JSON.stringify({
        nextcloudUrl,
        nextcloudUsername,
        nextcloudPassword: decryptToken(nextcloudPassword),
        nextcloudFilePath,
        claudeSessionKey,
        assignmentTitle: assignmentTitle || 'Assignment',
      }),
    })

    const data = await solverRes.json()

    if (!solverRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Solver failed' },
        { status: solverRes.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Solver proxy error:', error)
    return NextResponse.json({ error: error.message || 'Solver failed' }, { status: 500 })
  }
}
