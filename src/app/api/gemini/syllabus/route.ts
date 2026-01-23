import { NextRequest, NextResponse } from 'next/server'
import { parseSyllabus, checkRateLimit } from '@/lib/ai/geminiClient'

/**
 * POST /api/gemini/syllabus
 * Parse syllabus PDF/text to extract course details
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientId = request.headers.get('x-forwarded-for') || 'default'
    const rateLimitResult = checkRateLimit(clientId)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetIn: Math.ceil(rateLimitResult.resetIn / 1000),
          message: `Please wait ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds before making another request`
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + Math.ceil(rateLimitResult.resetIn / 1000)),
          }
        }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
       return NextResponse.json(
        { error: 'Only PDF or text files are supported' },
        { status: 400 }
      )
    }

    // Validate file size (e.g. 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    
    const result = await parseSyllabus(base64, file.type)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in syllabus parsing route:', error)
    return NextResponse.json(
      { error: 'Failed to process syllabus' },
      { status: 500 }
    )
  }
}
