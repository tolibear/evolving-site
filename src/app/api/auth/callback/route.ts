import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  completeOAuthFlow,
  STATE_COOKIE_NAME,
  VERIFIER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/twitter-auth'
import { logSecurityEvent } from '@/lib/db'
import { getClientIP } from '@/lib/utils-server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
  const ip = getClientIP(request)

  try {
    // Handle OAuth errors from Twitter
    if (error) {
      await logSecurityEvent('oauth_error', ip, '/api/auth/callback', `${error}: ${errorDescription}`)
      return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl))
    }

    if (!code || !state) {
      await logSecurityEvent('oauth_error', ip, '/api/auth/callback', 'Missing code or state')
      return NextResponse.redirect(new URL('/?auth_error=missing_params', baseUrl))
    }

    // Verify state matches stored state (CSRF protection)
    const cookieStore = await cookies()
    const storedState = cookieStore.get(STATE_COOKIE_NAME)?.value
    const codeVerifier = cookieStore.get(VERIFIER_COOKIE_NAME)?.value

    if (!storedState || state !== storedState) {
      await logSecurityEvent('csrf_attempt', ip, '/api/auth/callback', 'State mismatch')
      return NextResponse.redirect(new URL('/?auth_error=invalid_state', baseUrl))
    }

    if (!codeVerifier) {
      await logSecurityEvent('oauth_error', ip, '/api/auth/callback', 'Missing code verifier')
      return NextResponse.redirect(new URL('/?auth_error=missing_verifier', baseUrl))
    }

    // Complete OAuth flow
    const { sessionId, user } = await completeOAuthFlow(code, codeVerifier)

    // Log successful login
    await logSecurityEvent('login_success', ip, '/api/auth/callback', `User: @${user.twitter_username}`)

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/', baseUrl))

    // Set session cookie
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, getSessionCookieOptions())

    // Clear OAuth cookies
    response.cookies.delete(STATE_COOKIE_NAME)
    response.cookies.delete(VERIFIER_COOKIE_NAME)

    return response
  } catch (err) {
    console.error('OAuth callback error:', err)
    await logSecurityEvent('oauth_error', ip, '/api/auth/callback', err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.redirect(new URL('/?auth_error=server_error', baseUrl))
  }
}
