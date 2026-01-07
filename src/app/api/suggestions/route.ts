import { NextResponse } from 'next/server'
import { getSuggestions, createSuggestion, deleteSuggestion, getStatus } from '@/lib/db'
import { getClientIP, checkRateLimit, createVoterHash } from '@/lib/utils'
import { sanitizeSuggestion } from '@/lib/security'

// GET /api/suggestions - List all pending suggestions
export async function GET(request: Request) {
  try {
    const suggestions = await getSuggestions()

    // Get the current user's hash to check ownership
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    const currentUserHash = createVoterHash(ip, userAgent)

    // Add isOwner flag to each suggestion
    const suggestionsWithOwnership = suggestions.map(s => ({
      ...s,
      isOwner: s.submitter_hash === currentUserHash
    }))

    return NextResponse.json(suggestionsWithOwnership)
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

    // Create a submitter hash to track ownership for deletion
    const userAgent = request.headers.get('user-agent') || ''
    const submitterHash = createVoterHash(ip, userAgent)

    // Create the suggestion with sanitized content and submitter hash
    const id = await createSuggestion(result.sanitized, submitterHash)

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

// DELETE /api/suggestions - Delete a user's own suggestion
export async function DELETE(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    const submitterHash = createVoterHash(ip, userAgent)

    const body = await request.json()
    const { suggestionId } = body

    // Validate suggestionId
    if (typeof suggestionId !== 'number' || suggestionId <= 0) {
      return NextResponse.json(
        { error: 'Invalid suggestion ID' },
        { status: 400 }
      )
    }

    // Check if system is currently working on this suggestion
    const status = await getStatus()
    if (status.state === 'working' && status.current_suggestion_id === suggestionId) {
      return NextResponse.json(
        { error: 'Cannot delete a suggestion that is currently being implemented' },
        { status: 400 }
      )
    }

    // Attempt to delete (will only work if user owns the suggestion)
    const deleted = await deleteSuggestion(suggestionId, submitterHash)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Suggestion not found or you do not have permission to delete it' },
        { status: 403 }
      )
    }

    return NextResponse.json({ message: 'Suggestion deleted successfully' })
  } catch (error) {
    console.error('Error deleting suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to delete suggestion' },
      { status: 500 }
    )
  }
}
