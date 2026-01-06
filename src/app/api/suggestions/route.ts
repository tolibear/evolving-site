import { NextResponse } from 'next/server'
import { getSuggestions, createSuggestion } from '@/lib/db'
import { getClientIP, checkRateLimit } from '@/lib/utils'
import { sanitizeSuggestion } from '@/lib/security'

// GET /api/suggestions - List all pending suggestions
export async function GET() {
  try {
    const suggestions = await getSuggestions()
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}

// POST /api/suggestions - Create a new suggestion
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)

    // Rate limit: 5 suggestions per hour
    const rateLimit = checkRateLimit(`suggestions:${ip}`, 5, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    // Validate and sanitize content using security utilities
    const result = sanitizeSuggestion(content)
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Create the suggestion with sanitized content
    const id = await createSuggestion(result.sanitized)

    return NextResponse.json(
      {
        id,
        message: 'Suggestion created successfully',
        remaining: rateLimit.remaining
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    )
  }
}
