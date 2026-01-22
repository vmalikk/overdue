import { NextRequest, NextResponse } from 'next/server'
import { parseNaturalLanguage, checkRateLimit } from '@/lib/ai/geminiClient'

/**
 * POST /api/gemini/parse
 * Parse natural language input into structured assignment data
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

    const body = await request.json()
    const { input } = body as { input: string }

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input text is required' },
        { status: 400 }
      )
    }

    if (input.length > 500) {
      return NextResponse.json(
        { error: 'Input text must be less than 500 characters' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Gemini API is not configured',
          fallback: true,
          parsed: {
            title: input,
            confidence: 0,
            warnings: ['AI parsing is not available. Using input as title.']
          }
        },
        { status: 503 }
      )
    }

    const result = await parseNaturalLanguage(input)

    return NextResponse.json({
      ...result,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        resetIn: Math.ceil(rateLimitResult.resetIn / 1000),
      }
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + Math.ceil(rateLimitResult.resetIn / 1000)),
      }
    })
  } catch (error) {
    console.error('Error in parse endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to parse input', details: String(error) },
      { status: 500 }
    )
  }
}
