import { NextResponse } from 'next/server'
import { updateSuggestionStatus, addChangelogEntry, updateStatus } from '@/lib/db'

// Force dynamic - always process fresh
export const dynamic = 'force-dynamic'

/**
 * Internal API endpoint to finalize a suggestion implementation
 * Requires authentication via secret query param (for GET) or header (for POST)
 *
 * GET /api/suggestions/finalize?secret=XXX&suggestionId=8&status=implemented&content=...&votes=1&aiNote=...&commitHash=...
 * POST /api/suggestions/finalize
 * Headers: x-ralph-secret: <RALPH_API_SECRET>
 * Body: { suggestionId: number, content: string, votes: number, status: 'implemented' | 'denied', aiNote: string, commitHash?: string }
 */

async function processFinalize(
  suggestionId: number,
  content: string,
  votes: number,
  status: string,
  aiNote: string,
  commitHash: string | null
) {
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
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Validate internal API secret
  const secret = searchParams.get('secret')
  if (!secret || secret !== process.env.RALPH_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const suggestionId = parseInt(searchParams.get('suggestionId') || '0', 10)
    const content = decodeURIComponent(searchParams.get('content') || '')
    const votes = parseInt(searchParams.get('votes') || '0', 10)
    const status = searchParams.get('status') || ''
    const aiNote = decodeURIComponent(searchParams.get('aiNote') || '')
    const commitHash = searchParams.get('commitHash') || null

    return processFinalize(suggestionId, content, votes, status, aiNote, commitHash)
  } catch (error) {
    console.error('Finalize suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize suggestion' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  // Validate internal API secret
  const secret = request.headers.get('x-ralph-secret')
  if (!secret || secret !== process.env.RALPH_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { suggestionId, content, votes, status, aiNote, commitHash } = body

    return processFinalize(suggestionId, content, votes, status, aiNote, commitHash)
  } catch (error) {
    console.error('Finalize suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize suggestion' },
      { status: 500 }
    )
  }
}
