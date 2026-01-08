import { NextResponse } from 'next/server'
import { appendTerminalChunk, getTerminalSession, logSecurityEvent } from '@/lib/db'
import { validateRalphAuth } from '@/lib/auth'
import { getClientIP } from '@/lib/utils-server'

export const dynamic = 'force-dynamic'

// POST /api/terminal/push - Receive terminal output chunks from Ralph
// Requires authentication via x-ralph-secret header
export async function POST(request: Request) {
  try {
    // Validate internal API secret with timing-safe comparison
    if (!validateRalphAuth(request)) {
      const ip = getClientIP(request)
      await logSecurityEvent('auth_failure', ip, '/api/terminal/push', 'Invalid or missing API secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, sequence, content } = body

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 })
    }
    if (typeof sequence !== 'number' || sequence < 0) {
      return NextResponse.json({ error: 'Missing or invalid sequence' }, { status: 400 })
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content' }, { status: 400 })
    }

    // Verify session exists and is active
    const session = await getTerminalSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Append the chunk
    await appendTerminalChunk(sessionId, sequence, content)

    return NextResponse.json({ received: sequence, sessionId })
  } catch (error) {
    console.error('Error pushing terminal chunk:', error)
    return NextResponse.json(
      { error: 'Failed to push terminal chunk' },
      { status: 500 }
    )
  }
}
