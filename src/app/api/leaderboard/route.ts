import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/db'
import {
  getLeaderboard,
  getUserReputation,
  getUserRank,
  getUserAchievements,
  generateReferralCode,
} from '@/lib/reputation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') === 'weekly' ? 'weekly' : 'all_time'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Get leaderboard
    let leaderboard
    try {
      leaderboard = await getLeaderboard(type, limit, offset)
    } catch (e) {
      console.error('getLeaderboard failed:', e)
      throw new Error(`getLeaderboard: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Get current user's stats if logged in
    let currentUser = null
    let cookieStore
    try {
      cookieStore = await cookies()
    } catch (e) {
      console.error('cookies() failed:', e)
      throw new Error(`cookies: ${e instanceof Error ? e.message : String(e)}`)
    }
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      let session
      try {
        session = await getSession(sessionId)
      } catch (e) {
        console.error('getSession failed:', e)
        // Don't throw - just skip user stats
        session = null
      }

      if (session) {
        try {
          const userId = session.user.id
          const rep = await getUserReputation(userId)
          const rank = await getUserRank(userId, type)
          const achievements = await getUserAchievements(userId)
          const referralCode = await generateReferralCode(userId)

          currentUser = {
            user_id: userId,
            username: session.user.twitter_username,
            avatar: session.user.twitter_avatar,
            total_rep: rep.total_rep,
            weekly_rep: rep.weekly_rep,
            tier: rep.tier,
            rank,
            current_streak: rep.current_streak,
            longest_streak: rep.longest_streak,
            suggestions_backed_denied: rep.suggestions_backed_denied,
            achievements,
            referral_code: referralCode,
          }
        } catch (e) {
          console.error('User stats failed:', e)
          // Don't throw - just skip user stats
        }
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUser,
      type,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error('Leaderboard error:', errMsg, errStack)
    return NextResponse.json({ error: `Failed to fetch leaderboard: ${errMsg}` }, { status: 500 })
  }
}
