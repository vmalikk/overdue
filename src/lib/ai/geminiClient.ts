import { GoogleGenAI } from '@google/genai'
import { NLPParseResult, StudyTipsResponse, DeadlineSuggestion, ParsedSyllabus } from '@/types/ai'

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 minute
}

// Simple in-memory rate limiter for server-side
const requestCounts: Map<string, { count: number; resetTime: number }> = new Map()

/**
 * Check if request is rate limited
 */
export function checkRateLimit(clientId: string = 'default'): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = requestCounts.get(clientId)

  if (!record || now >= record.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    })
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxRequests - 1,
      resetIn: RATE_LIMIT.windowMs,
    }
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: RATE_LIMIT.maxRequests - record.count,
    resetIn: record.resetTime - now,
  }
}

// Create the AI client instance
let aiClient: GoogleGenAI | null = null

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey })
  }
  return aiClient
}

/**
 * Parse natural language input into structured assignment data
 */
export async function parseNaturalLanguage(input: string): Promise<NLPParseResult> {
  const ai = getAIClient()

  const prompt = `You are an assignment parser. Parse the following natural language input into structured assignment data.

Input: "${input}"

Return a JSON object with these fields:
- title: string (the assignment title, max 100 characters)
- courseCode: string | null (course code like "ECE 306", "CS 101", etc.)
- deadline: string | null (ISO 8601 date string, interpret relative dates like "Friday" or "next week" based on today being ${new Date().toISOString().split('T')[0]})
- priority: "low" | "medium" | "high" | null (infer from urgency words)
- estimatedHours: number | null (if mentioned)
- description: string | null (any additional details)
- confidence: number (0-1, how confident you are in the parsing)
- warnings: string[] (any ambiguities or assumptions made)

IMPORTANT: 
- For relative dates, assume the user means the NEXT occurrence (e.g., "Friday" means this coming Friday)
- If time is mentioned (like "5pm"), include it in the deadline
- Return ONLY valid JSON, no markdown or explanation

Example for "ECE 306 lab due Friday 5pm":
{
  "title": "ECE 306 Lab",
  "courseCode": "ECE 306",
  "deadline": "2024-01-26T17:00:00.000Z",
  "priority": null,
  "estimatedHours": null,
  "description": null,
  "confidence": 0.95,
  "warnings": []
}`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
    const responseText = response.text || ''
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    // Clean up the JSON string
    jsonStr = jsonStr.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const parsed = JSON.parse(jsonStr)
    
    return {
      success: true,
      parsed: {
        title: parsed.title || input,
        courseCode: parsed.courseCode || undefined,
        deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
        priority: parsed.priority || undefined,
        estimatedHours: parsed.estimatedHours || undefined,
        description: parsed.description || undefined,
      },
      confidence: parsed.confidence || 0.5,
      warnings: parsed.warnings || [],
      originalInput: input,
    }
  } catch (error) {
    console.error('Error parsing with Gemini:', error)
    return {
      success: false,
      parsed: { title: input },
      confidence: 0,
      warnings: [`Failed to parse: ${String(error)}`],
      originalInput: input,
    }
  }
}

/**
 * Generate study tips for an assignment
 */
export async function generateStudyTips(
  title: string,
  description: string | undefined,
  courseCode: string | undefined,
  deadline: Date,
  estimatedHours: number | undefined
): Promise<StudyTipsResponse> {
  const ai = getAIClient()

  const daysUntilDue = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  
  const prompt = `You are a helpful study advisor. Generate concise, actionable study tips for the following assignment:

Title: ${title}
${description ? `Description: ${description}` : ''}
${courseCode ? `Course: ${courseCode}` : ''}
Days until due: ${daysUntilDue}
${estimatedHours ? `Estimated hours: ${estimatedHours}` : ''}

Return a JSON object with:
- tips: string[] (3-5 specific, actionable tips)
- suggestedSchedule: { date: string, task: string }[] (breakdown of tasks over the remaining days, max 5 items)
- resourceSuggestions: string[] (2-3 general study resources or approaches)
- warningLevel: "low" | "medium" | "high" (based on time remaining vs typical workload)

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
    const responseText = response.text || ''
    
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    jsonStr = jsonStr.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const parsed = JSON.parse(jsonStr)
    
    return {
      tips: parsed.tips || [],
      suggestedSchedule: (parsed.suggestedSchedule || []).map((s: { date: string; task: string }) => ({
        date: new Date(s.date),
        task: s.task,
      })),
      resourceSuggestions: parsed.resourceSuggestions || [],
      warningLevel: parsed.warningLevel || 'medium',
      generatedAt: new Date(),
    }
  } catch (error) {
    console.error('Error generating study tips:', error)
    return {
      tips: [
        'Break the assignment into smaller tasks',
        'Start with the most challenging part when your energy is highest',
        'Set a timer for focused work sessions (25-minute Pomodoro technique)',
      ],
      suggestedSchedule: [],
      resourceSuggestions: ['Review course materials', 'Consult with classmates or TAs'],
      warningLevel: daysUntilDue <= 2 ? 'high' : daysUntilDue <= 5 ? 'medium' : 'low',
      generatedAt: new Date(),
    }
  }
}

/**
 * Generate deadline suggestions based on workload
 */
export async function generateDeadlineSuggestion(
  title: string,
  courseCode: string | undefined,
  currentDeadline: Date,
  existingAssignments: { title: string; deadline: Date; courseCode?: string }[]
): Promise<DeadlineSuggestion> {
  const ai = getAIClient()

  const upcomingAssignments = existingAssignments
    .filter((a) => new Date(a.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
    .map((a) => `- ${a.title} (${a.courseCode || 'No course'}) - Due: ${new Date(a.deadline).toLocaleDateString()}`)
    .join('\n')

  const prompt = `You are a scheduling advisor. Suggest an optimal internal deadline for starting work on this assignment.

New Assignment:
- Title: ${title}
${courseCode ? `- Course: ${courseCode}` : ''}
- Official Deadline: ${currentDeadline.toLocaleDateString()}

Current Workload (upcoming assignments):
${upcomingAssignments || 'No other assignments'}

Return a JSON object with:
- suggestedStartDate: string (ISO date for when to start working)
- suggestedInternalDeadline: string (ISO date to aim to finish, before official deadline)
- reasoning: string (brief explanation)
- workloadLevel: "light" | "moderate" | "heavy"
- conflictingAssignments: string[] (titles of assignments that might conflict)

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
    const responseText = response.text || ''
    
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    jsonStr = jsonStr.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const parsed = JSON.parse(jsonStr)
    
    return {
      suggestedStartDate: new Date(parsed.suggestedStartDate),
      suggestedInternalDeadline: new Date(parsed.suggestedInternalDeadline),
      reasoning: parsed.reasoning || '',
      workloadLevel: parsed.workloadLevel || 'moderate',
      conflictingAssignments: parsed.conflictingAssignments || [],
    }
  } catch (error) {
    console.error('Error generating deadline suggestion:', error)
    
    // Fallback suggestion
    const daysUntilDue = Math.ceil((currentDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const startDaysAhead = Math.max(1, Math.floor(daysUntilDue * 0.7))
    const internalDeadlineDaysAhead = Math.max(1, Math.floor(daysUntilDue * 0.9))
    
    return {
      suggestedStartDate: new Date(Date.now() + (daysUntilDue - startDaysAhead) * 24 * 60 * 60 * 1000),
      suggestedInternalDeadline: new Date(currentDeadline.getTime() - 24 * 60 * 60 * 1000), // 1 day before
      reasoning: 'Suggested based on deadline proximity',
      workloadLevel: 'moderate',
      conflictingAssignments: [],
    }
  }
}

/**
 * Parse syllabus PDF/text to extract course details
 */
export async function parseSyllabus(fileBase64: string, mimeType: string = 'application/pdf'): Promise<ParsedSyllabus> {
  const ai = getAIClient()

  const prompt = `You are a syllabus parser. Extract the following information from the syllabus document provided.

Return a JSON object with:
- courseCode: string | null (e.g. "ECE 306")
- courseName: string | null (e.g. "Embedded Systems")
- instructor: string | null (Name of the professor/instructor)
- professorEmail: string | null
- officeHours: { day: string, startTime: string, endTime: string, location: string }[] | null
  - normalize days to full names like "Monday", "Tuesday"
  - normalize times to 24hr format "HH:MM"
  - if location is unknown, use "TBD" or infer from context if confident
- gradeWeights: { category: string, weight: number }[] | null
  - weight should be a number representing percentage (e.g. 20 for 20%)
- description: string | null (brief course description)

IMPORTANT: Return ONLY valid JSON, no markdown.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: fileBase64
              }
            }
          ]
        }
      ]
    })
    
    const responseText = response.text || ''
    
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    jsonStr = jsonStr.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }

    const parsed = JSON.parse(jsonStr)
    
    return {
      courseCode: parsed.courseCode,
      courseName: parsed.courseName,
      instructor: parsed.instructor,
      professorEmail: parsed.professorEmail,
      officeHours: parsed.officeHours,
      gradeWeights: parsed.gradeWeights,
      description: parsed.description,
    }
  } catch (error) {
    console.error('Error parsing syllabus:', error)
    throw new Error('Failed to parse syllabus')
  }
}

