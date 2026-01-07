import { NextResponse } from 'next/server'
import { hasVoted, addVote, removeVote, getVoteAllowance, decrementVoteAllowance, incrementVoteAllowance, getVoteType, changeVote } from '@/lib/db'
import { getClientIP, createVoterHash, checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'

// POST /api/vote - Toggle vote for a suggestion
// Body: { suggestionId: number, voteType?: 'up' | 'down' }
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
    const { suggestionId, voteType = 'up' } = body

    // Validate suggestionId using security utility
    if (!isValidId(suggestionId)) {
      return NextResponse.json(
        { error: 'Valid suggestionId is required' },
        { status: 400 }
      )
    }

    // Validate voteType
    if (voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json(
        { error: 'voteType must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Create voter hash for deduplication
    const voterHash = createVoterHash(ip, userAgent)

    // Check if already voted
    const alreadyVoted = await hasVoted(suggestionId, voterHash)
    if (alreadyVoted) {
      const currentVoteType = await getVoteType(suggestionId, voterHash)

      // If clicking the same vote type, remove the vote (toggle off)
      if (currentVoteType === voteType) {
        await removeVote(suggestionId, voterHash)
        await incrementVoteAllowance(voterHash)
        const remainingVotes = await getVoteAllowance(voterHash)
        return NextResponse.json({
          message: 'Vote removed successfully',
          action: 'removed',
          voteType: null,
          remaining: rateLimit.remaining,
          remainingVotes
        })
      }

      // If clicking different vote type, change the vote (no allowance cost)
      await changeVote(suggestionId, voterHash, voteType)
      const remainingVotes = await getVoteAllowance(voterHash)
      return NextResponse.json({
        message: `Vote changed to ${voteType}`,
        action: 'changed',
        voteType,
        remaining: rateLimit.remaining,
        remainingVotes
      })
    }

    // Check vote allowance before allowing new vote
    const currentAllowance = await getVoteAllowance(voterHash)
    if (currentAllowance <= 0) {
      return NextResponse.json(
        {
          error: 'No votes remaining. Wait for the next feature implementation to get more votes!',
          remainingVotes: 0
        },
        { status: 403 }
      )
    }

    // Decrement allowance and record the vote
    await decrementVoteAllowance(voterHash)
    await addVote(suggestionId, voterHash, voteType)
    const remainingVotes = await getVoteAllowance(voterHash)

    return NextResponse.json({
      message: 'Vote recorded successfully',
      action: 'added',
      voteType,
      remaining: rateLimit.remaining,
      remainingVotes
    })
  } catch (error) {
    console.error('Error recording vote:', error)
    return NextResponse.json(
      { error: 'Failed to record vote' },
      { status: 500 }
    )
  }
}
