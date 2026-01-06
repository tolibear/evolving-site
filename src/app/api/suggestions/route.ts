import { NextResponse } from 'next/server'
import { getSuggestions, createSuggestion } from '@/lib/db'
import { getClientIP, checkRateLimit } from '@/lib/utils'

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

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 10) {
      return NextResponse.json(
        { error: 'Suggestion must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { error: 'Suggestion must be less than 500 characters' },
        { status: 400 }
      )
    }

    // Create the suggestion
    const id = await createSuggestion(trimmedContent)

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
