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
    const leaderboard = await getLeaderboard(type, limit, offset)

    // Get current user's stats if logged in
    let currentUser = null
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      const session = await getSession(sessionId)
      if (session) {
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
      }
    }

    return NextResponse.json({
      leaderboard,
      currentUser,
      type,
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
