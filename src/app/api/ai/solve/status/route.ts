import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'

const SOLVER_BASE = 'https://solver.malikv.com'
const SOLVER_SECRET = process.env.SOLVER_SECRET

// GET /api/ai/solve/status?jobId=xxx — proxy to solver status endpoint
export async function GET(request: NextRequest) {
  try {
    const { account } = await createSessionClient(request)
    await account.get() // verify auth

    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    if (!SOLVER_SECRET) {
      return NextResponse.json({ error: 'Solver not configured' }, { status: 500 })
    }

    const res = await fetch(`${SOLVER_BASE}/status/${jobId}`, {
      headers: { Authorization: `Bearer ${SOLVER_SECRET}` },
    })

    if (res.status === 404) {
      return NextResponse.json({ status: 'error', error: 'Job not found (server may have restarted)' }, { status: 200 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Solver status proxy error:', error)
    return NextResponse.json({ error: error.message || 'Failed to check status' }, { status: 500 })
  }
}
