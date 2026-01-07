import { NextResponse } from 'next/server'
import { getVoteType } from '@/lib/db'
import { getClientIP, createVoterHash } from '@/lib/utils'

// GET /api/user-votes?suggestionIds=1,2,3 - Get user's vote types for suggestions
export async function GET(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const voterHash = createVoterHash(ip, userAgent)

    const { searchParams } = new URL(request.url)
    const suggestionIdsParam = searchParams.get('suggestionIds')

    if (!suggestionIdsParam) {
      return NextResponse.json({ votes: {} })
    }

    const suggestionIds = suggestionIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)

    // Get vote type for each suggestion
    const votes: Record<number, 'up' | 'down' | null> = {}
    for (const suggestionId of suggestionIds) {
      votes[suggestionId] = await getVoteType(suggestionId, voterHash)
    }

    return NextResponse.json({ votes })
  } catch (error) {
    console.error('Error fetching user votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user votes' },
      { status: 500 }
    )
  }
}
