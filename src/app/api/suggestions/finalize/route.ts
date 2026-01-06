import { NextResponse } from 'next/server'
import { updateSuggestionStatus, addChangelogEntry, updateStatus } from '@/lib/db'

/**
 * Internal API endpoint to finalize a suggestion implementation
 * Requires authentication via secret header
 *
 * POST /api/suggestions/finalize
 * Headers: x-ralph-secret: <RALPH_API_SECRET>
 * Body: { suggestionId: number, content: string, votes: number, status: 'implemented' | 'denied', aiNote: string, commitHash?: string }
 */
export async function POST(request: Request) {
  // Validate internal API secret
  const secret = request.headers.get('x-ralph-secret')
  if (!secret || secret !== process.env.RALPH_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { suggestionId, content, votes, status, aiNote, commitHash } = body

    if (!suggestionId || !status) {
      return NextResponse.json(
        { error: 'suggestionId and status are required' },
        { status: 400 }
      )
    }

    if (status !== 'implemented' && status !== 'denied' && status !== 'needs_input') {
      return NextResponse.json(
        { error: 'status must be implemented, denied, or needs_input' },
        { status: 400 }
      )
    }

    // Update suggestion status
    await updateSuggestionStatus(suggestionId, status, aiNote)

    // Add changelog entry if implemented
    if (status === 'implemented' && content) {
      await addChangelogEntry(
        suggestionId,
        content,
        votes || 0,
        commitHash || null,
        aiNote
      )
    }

    // Set status back to idle
    await updateStatus(null, 'idle', 'Awaiting next suggestion...')

    return NextResponse.json({ success: true, message: `Suggestion ${suggestionId} marked as ${status}` })
  } catch (error) {
    console.error('Finalize suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize suggestion' },
      { status: 500 }
    )
  }
}
