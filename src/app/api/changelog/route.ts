import { NextResponse } from 'next/server'
import { getChangelog } from '@/lib/db'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

// GET /api/changelog - Get implementation history
export async function GET() {
  try {
    const entries = await getChangelog()
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching changelog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    )
  }
}
