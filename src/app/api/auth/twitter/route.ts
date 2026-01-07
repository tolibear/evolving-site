import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getTwitterAuthUrl,
  STATE_COOKIE_NAME,
  VERIFIER_COOKIE_NAME,
  getOAuthCookieOptions,
} from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Generate PKCE values
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()

    // Store in cookies for callback verification
    const cookieStore = await cookies()
    const cookieOptions = getOAuthCookieOptions()

    cookieStore.set(STATE_COOKIE_NAME, state, cookieOptions)
    cookieStore.set(VERIFIER_COOKIE_NAME, codeVerifier, cookieOptions)

    // Generate auth URL and redirect
    const authUrl = getTwitterAuthUrl(state, codeChallenge)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Twitter auth error:', error)
    return NextResponse.redirect(new URL('/?auth_error=failed', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
  }
}
