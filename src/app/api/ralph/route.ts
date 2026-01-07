import { NextResponse } from 'next/server'
import {
  updateSuggestionStatus,
  addChangelogEntry,
  updateStatus,
  grantVotesToAllUsers,
  setAutomationMode,
  setIntervalMinutes,
  getStatus,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/ralph - Get Ralph configuration (public)
export async function GET() {
  try {
    const status = await getStatus()
    return NextResponse.json({
      automation_mode: status.automation_mode,
      interval_minutes: status.interval_minutes,
      state: status.state,
      message: status.message,
    })
  } catch (error) {
    console.error('Error getting Ralph config:', error)
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 })
  }
}

// POST /api/ralph - Unified Ralph operations
export async function POST(request: Request) {
  // Validate API secret
  const secret = request.headers.get('x-ralph-secret')
  if (!secret || secret !== process.env.RALPH_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'finalize':
        return handleFinalize(body)

      case 'setMode':
        return handleSetMode(body)

      case 'setInterval':
        return handleSetInterval(body)

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Ralph API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleFinalize(body: {
  suggestionId: number
  status: 'implemented' | 'denied' | 'needs_input'
  content: string
  votes: number
  aiNote: string
  commitHash?: string
}) {
  const { suggestionId, status, content, votes, aiNote, commitHash } = body

  if (!suggestionId || !status) {
    return NextResponse.json(
      { error: 'suggestionId and status are required' },
      { status: 400 }
    )
  }

  if (!['implemented', 'denied', 'needs_input'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be "implemented", "denied", or "needs_input"' },
      { status: 400 }
    )
  }

  // Update suggestion status
  await updateSuggestionStatus(suggestionId, status, aiNote)

  // Add changelog entry and grant votes if implemented
  if (status === 'implemented') {
    if (content) {
      await addChangelogEntry(
        suggestionId,
        content,
        votes || 0,
        commitHash || null,
        aiNote
      )
    }
    // Grant 2 votes to all users
    await grantVotesToAllUsers(2)
  }

  // Reset status to idle
  await updateStatus(null, 'idle', 'Awaiting next suggestion...')

  return NextResponse.json({
    success: true,
    message: `Suggestion ${suggestionId} finalized as ${status}`,
  })
}

async function handleSetMode(body: { mode: 'manual' | 'automated' }) {
  const { mode } = body

  if (!mode || !['manual', 'automated'].includes(mode)) {
    return NextResponse.json(
      { error: 'mode must be "manual" or "automated"' },
      { status: 400 }
    )
  }

  await setAutomationMode(mode)
  return NextResponse.json({ success: true, mode })
}

async function handleSetInterval(body: { minutes: number }) {
  const { minutes } = body

  if (typeof minutes !== 'number' || minutes < 1 || minutes > 60) {
    return NextResponse.json(
      { error: 'minutes must be a number between 1 and 60' },
      { status: 400 }
    )
  }

  await setIntervalMinutes(minutes)
  return NextResponse.json({ success: true, minutes })
}
