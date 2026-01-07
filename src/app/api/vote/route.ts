import { NextResponse } from 'next/server'
import { hasVoted, addVote, removeVote } from '@/lib/db'
import { getClientIP, createVoterHash, checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'

// POST /api/vote - Toggle vote for a suggestion
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Rate limit: 50 votes per day
    const rateLimit = checkRateLimit(`votes:${ip}`, 50, 24 * 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Daily vote limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { suggestionId } = body

    // Validate suggestionId using security utility
    if (!isValidId(suggestionId)) {
      return NextResponse.json(
        { error: 'Valid suggestionId is required' },
        { status: 400 }
      )
    }

    // Create voter hash for deduplication
    const voterHash = createVoterHash(ip, userAgent)

    // Check if already voted - toggle behavior
    const alreadyVoted = await hasVoted(suggestionId, voterHash)
    if (alreadyVoted) {
      // Remove the vote
      await removeVote(suggestionId, voterHash)
      return NextResponse.json({
        message: 'Vote removed successfully',
        action: 'removed',
        remaining: rateLimit.remaining
      })
    }

    // Record the vote
    await addVote(suggestionId, voterHash)

    return NextResponse.json({
      message: 'Vote recorded successfully',
      action: 'added',
      remaining: rateLimit.remaining
    })
  } catch (error) {
    console.error('Error recording vote:', error)
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    )
  }
}
