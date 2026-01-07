import crypto from 'crypto'
import { createSession, deleteSession, getSession, upsertUser, type User } from './db'

// Environment variables
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/callback'

// PKCE helpers
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Generate Twitter OAuth 2.0 authorization URL
export function getTwitterAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_CALLBACK_URL,
    scope: 'tweet.read users.read',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const basicAuth = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: TWITTER_CALLBACK_URL,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Twitter token exchange failed:', error)
    throw new Error('Failed to exchange code for tokens')
  }

  return response.json()
}

// Get Twitter user profile
export async function getTwitterUser(accessToken: string): Promise<{
  id: string
  username: string
  name: string
  profile_image_url?: string
}> {
  const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Twitter user fetch failed:', error)
    throw new Error('Failed to fetch Twitter user')
  }

  const data = await response.json()
  return data.data
}

// Complete OAuth flow: exchange code, get user, create session
export async function completeOAuthFlow(
  code: string,
  codeVerifier: string
): Promise<{ sessionId: string; user: User }> {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code, codeVerifier)

  // Get Twitter user profile
  const twitterUser = await getTwitterUser(tokens.access_token)

  // Upsert user in database
  const user = await upsertUser(
    twitterUser.id,
    twitterUser.username,
    twitterUser.profile_image_url || null,
    twitterUser.name
  )

  // Create session
  const sessionId = await createSession(user.id)

  return { sessionId, user }
}

// Validate session and get user
export async function validateSessionAndGetUser(
  sessionId: string | undefined
): Promise<User | null> {
  if (!sessionId) return null

  const session = await getSession(sessionId)
  if (!session) return null

  return session.user
}

// Logout: delete session
export async function logout(sessionId: string): Promise<void> {
  await deleteSession(sessionId)
}

// Cookie helpers
export const SESSION_COOKIE_NAME = 'session_id'
export const STATE_COOKIE_NAME = 'oauth_state'
export const VERIFIER_COOKIE_NAME = 'oauth_verifier'

export function getSessionCookieOptions(maxAge: number = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export function getOAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  }
}
