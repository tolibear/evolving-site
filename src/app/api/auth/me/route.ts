import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Return safe user data (no internal IDs exposed unnecessarily)
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.twitter_username,
        name: user.twitter_name,
        avatar: user.twitter_avatar,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ user: null })
  }
}
