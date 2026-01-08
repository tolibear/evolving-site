import { NextResponse } from 'next/server'
import { getVoteAllowance } from '@/lib/db'
import { getClientIP, createVoterHash } from '@/lib/utils-server'

// GET /api/vote-allowance - Get remaining votes for current user
export async function GET(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const voterHash = createVoterHash(ip, userAgent)

    const remainingVotes = await getVoteAllowance(voterHash)

    return NextResponse.json({
      remainingVotes,
      voterHash: voterHash.substring(0, 8) + '...' // Partial hash for debugging
    })
  } catch (error) {
    console.error('Error fetching vote allowance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vote allowance' },
      { status: 500 }
    )
  }
}
