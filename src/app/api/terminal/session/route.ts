import { NextResponse } from 'next/server'
import {
  createTerminalSession,
  endTerminalSession,
  getTerminalSession,
  getActiveTerminalSession,
  cleanupOldTerminalSessions,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/terminal/session - Get active session or specific session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (sessionId) {
      const session = await getTerminalSession(sessionId)
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      return NextResponse.json(session)
    }

    // Return active session if no ID specified
    const activeSession = await getActiveTerminalSession()
    return NextResponse.json({ session: activeSession })
  } catch (error) {
    console.error('Error fetching terminal session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminal session' },
      { status: 500 }
    )
  }
}

// POST /api/terminal/session - Create or end a session
// Requires authentication via x-ralph-secret header
export async function POST(request: Request) {
  try {
    // Validate internal API secret
    const secret = request.headers.get('x-ralph-secret')
    if (!secret || secret !== process.env.RALPH_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, suggestionId, sessionId, status } = body

    if (action === 'start') {
      // Start a new session
      if (typeof suggestionId !== 'number') {
        return NextResponse.json({ error: 'Missing or invalid suggestionId' }, { status: 400 })
      }

      // Clean up old sessions before starting a new one
      await cleanupOldTerminalSessions(20)

      const newSessionId = await createTerminalSession(suggestionId)
      return NextResponse.json({ sessionId: newSessionId })
    }

    if (action === 'end') {
      // End an existing session
      if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid sessionId' }, { status: 400 })
      }
      if (!status || !['completed', 'failed'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be: completed or failed' }, { status: 400 })
      }

      await endTerminalSession(sessionId, status)
      return NextResponse.json({ success: true, sessionId, status })
    }

    return NextResponse.json({ error: 'Invalid action. Must be: start or end' }, { status: 400 })
  } catch (error) {
    console.error('Error managing terminal session:', error)
    return NextResponse.json(
      { error: 'Failed to manage terminal session' },
      { status: 500 }
    )
  }
}
