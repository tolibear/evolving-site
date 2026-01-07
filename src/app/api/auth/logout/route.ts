import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logout, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'
import { logSecurityEvent } from '@/lib/db'
import { getClientIP } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = getClientIP(request)

  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (sessionId) {
      await logout(sessionId)
      await logSecurityEvent('logout', ip, '/api/auth/logout', 'User logged out')
    }

    // Clear session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete(SESSION_COOKIE_NAME)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    await logSecurityEvent('logout_error', ip, '/api/auth/logout', error instanceof Error ? error.message : 'Unknown error')

    // Still clear the cookie even if there's an error
    const response = NextResponse.json({ success: true })
    response.cookies.delete(SESSION_COOKIE_NAME)

    return response
  }
}
