import { NextResponse } from 'next/server'
import { getTerminalSessions, getTerminalChunkCount, getSuggestionById } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/terminal/sessions - List terminal sessions with metadata
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const sessions = await getTerminalSessions(limit)

    // Enrich sessions with chunk count and suggestion content
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const chunkCount = await getTerminalChunkCount(session.id)
        const suggestion = await getSuggestionById(session.suggestion_id)
        return {
          ...session,
          chunkCount,
          suggestionContent: suggestion?.content?.slice(0, 100) || null,
        }
      })
    )

    return NextResponse.json({ sessions: enrichedSessions })
  } catch (error) {
    console.error('Error fetching terminal sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminal sessions' },
      { status: 500 }
    )
  }
}
