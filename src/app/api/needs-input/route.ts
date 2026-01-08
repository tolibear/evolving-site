import { NextResponse } from 'next/server'
import { getNeedsInputSuggestions } from '@/lib/db'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

// GET /api/needs-input - Get suggestions that need developer input
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const suggestions = await getNeedsInputSuggestions(limit)
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error fetching needs-input suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch needs-input suggestions' },
      { status: 500 }
    )
  }
}
