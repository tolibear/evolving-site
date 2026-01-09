import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getVoteAllowance } from '@/lib/db'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

// GET /api/vote-allowance - Get remaining votes for current user
export async function GET() {
  try {
    // Get the authenticated user
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      // Not authenticated - return 0 votes (they need to log in to vote)
      return NextResponse.json({
        remainingVotes: 0,
        voterHash: 'unauthenticated'
      })
    }

    // Use the same voter hash format as the vote endpoint
    const voterHash = `user:${user.id}`
    const remainingVotes = await getVoteAllowance(voterHash)

    return NextResponse.json({
      remainingVotes,
      voterHash: voterHash.substring(0, 8) + '...' // Partial hash for debugging
    })
  } catch (error) {
    console.error('Error fetching vote allowance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vote allowance' },
      { status: 500 }
    )
  }
}
