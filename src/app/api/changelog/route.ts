import { NextResponse } from 'next/server'
import { getChangelog } from '@/lib/db'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

// GET /api/changelog - Get implementation history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const entries = await getChangelog(limit)
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching changelog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    )
  }
}
