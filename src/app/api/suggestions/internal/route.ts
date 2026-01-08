import { NextResponse } from 'next/server'
import { createSuggestionWithAuthor, logSecurityEvent } from '@/lib/db'
import { sanitizeSuggestion } from '@/lib/security'
import { validateRalphAuth } from '@/lib/auth'
import { getClientIP } from '@/lib/utils-server'

/**
 * Internal API endpoint for Ralph Wiggum to create suggestions
 * Bypasses rate limiting but requires authentication via secret header
 *
 * POST /api/suggestions/internal
 * Headers: x-ralph-secret: <RALPH_API_SECRET>
 * Body: { content: string, author: 'ralph' }
 */
export async function POST(request: Request) {
  // Validate internal API secret with timing-safe comparison
  if (!validateRalphAuth(request)) {
    const ip = getClientIP(request)
    await logSecurityEvent('auth_failure', ip, '/api/suggestions/internal', 'Invalid or missing API secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, author } = body

    // Only allow 'ralph' as author for now
    if (author !== 'ralph') {
      return NextResponse.json(
        { error: 'Invalid author - only "ralph" is allowed' },
        { status: 400 }
      )
    }

    // Still apply content sanitization for security
    const result = sanitizeSuggestion(content)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const id = await createSuggestionWithAuthor(result.sanitized, author)

    return NextResponse.json(
      { id, message: 'Suggestion created by Ralph' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Internal suggestion creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    )
  }
}
