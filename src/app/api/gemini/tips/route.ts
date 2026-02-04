import { NextRequest, NextResponse } from 'next/server'
import { generateStudyTips, generateDeadlineSuggestion, checkRateLimit } from '@/lib/ai/geminiClient'

/**
 * POST /api/gemini/tips
 * Generate study tips for an assignment
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
    const {
      title,
      description,
      courseCode,
      deadline,
      type = 'tips' // 'tips' or 'deadline'
    } = body as {
      title: string
      description?: string
      courseCode?: string
      deadline: string
      type?: 'tips' | 'deadline'
      existingAssignments?: { title: string; deadline: Date; courseCode?: string }[]
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Assignment title is required' },
        { status: 400 }
      )
    }

    if (!deadline) {
      return NextResponse.json(
        { error: 'Deadline is required' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    const apiKey = request.headers.get('x-gemini-api-key') || undefined

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Gemini API is not configured',
          fallback: true,
          tips: {
            tips: [
              'Break the assignment into smaller, manageable tasks',
              'Set intermediate deadlines for each task',
              'Review course materials before starting',
            ],
            suggestedSchedule: [],
            resourceSuggestions: ['Review lecture notes', 'Consult course textbook'],
            warningLevel: 'medium',
            generatedAt: new Date(),
          }
        },
        { status: 503 }
      )
    }

    const deadlineDate = new Date(deadline)

    if (type === 'deadline') {
      const existingAssignments = body.existingAssignments || []
      const suggestion = await generateDeadlineSuggestion(
        title,
        courseCode,
        deadlineDate,
        existingAssignments,
        apiKey
      )

      return NextResponse.json({
        success: true,
        suggestion,
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
    }

    const tips = await generateStudyTips(
      title,
      description,
      courseCode,
      deadlineDate,
      apiKey
    )

    return NextResponse.json({
      success: true,
      tips,
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
    console.error('Error in tips endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to generate tips', details: String(error) },
      { status: 500 }
    )
  }
}
