import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getVoteAllowance,
  decrementVoteAllowance,
  incrementVoteAllowance,
  getVoteTypeByUser,
  addVoteWithUser,
  removeVoteByUser,
  changeVoteByUser,
} from '@/lib/db'
import { updateVotingStreak, activateReferralIfEligible } from '@/lib/reputation'
import { getClientIP } from '@/lib/utils-server'
import { checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

// POST /api/vote - Toggle vote for a suggestion (requires authentication)
// Body: { suggestionId: number, voteType?: 'up' | 'down' }
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Twitter.' },
        { status: 401 }
      )
    }

    const ip = getClientIP(request)

    // Rate limit: 50 votes per day per user
    const rateLimit = checkRateLimit(`votes:user:${user.id}`, 50, 24 * 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Daily vote limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { suggestionId, voteType = 'up' } = body

    // Validate suggestionId
    if (!isValidId(suggestionId)) {
      return NextResponse.json({ error: 'Valid suggestionId is required' }, { status: 400 })
    }

    // Validate voteType
    if (voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json({ error: 'voteType must be "up" or "down"' }, { status: 400 })
    }

    // Use user:id as the voter hash for allowance tracking
    const voterHash = `user:${user.id}`

    // Check if already voted
    const currentVoteType = await getVoteTypeByUser(suggestionId, user.id)
    if (currentVoteType) {
      // If clicking the same vote type, remove the vote (toggle off)
      if (currentVoteType === voteType) {
        await removeVoteByUser(suggestionId, user.id)
        await incrementVoteAllowance(voterHash)
        const remainingVotes = await getVoteAllowance(voterHash)
        return NextResponse.json({
          message: 'Vote removed successfully',
          action: 'removed',
          voteType: null,
          remaining: rateLimit.remaining,
          remainingVotes,
        })
      }

      // If clicking different vote type, change the vote (no allowance cost)
      await changeVoteByUser(suggestionId, user.id, voteType)
      const remainingVotes = await getVoteAllowance(voterHash)
      return NextResponse.json({
        message: `Vote changed to ${voteType}`,
        action: 'changed',
        voteType,
        remaining: rateLimit.remaining,
        remainingVotes,
      })
    }

    // Check vote allowance before allowing new vote
    const currentAllowance = await getVoteAllowance(voterHash)
    if (currentAllowance <= 0) {
      return NextResponse.json(
        {
          error: 'No votes remaining. Wait for the next feature implementation to get more votes!',
          remainingVotes: 0,
        },
        { status: 403 }
      )
    }

    // Decrement allowance and record the vote
    await decrementVoteAllowance(voterHash)
    await addVoteWithUser(suggestionId, user.id, voteType)
    const remainingVotes = await getVoteAllowance(voterHash)

    // Update user's voting streak
    await updateVotingStreak(user.id)

    // Check if this vote activates a pending referral (7+ days + first vote)
    await activateReferralIfEligible(user.id)

    return NextResponse.json({
      message: 'Vote recorded successfully',
      action: 'added',
      voteType,
      remaining: rateLimit.remaining,
      remainingVotes,
    })
  } catch (error) {
    console.error('Error recording vote:', error)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}
