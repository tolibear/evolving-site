import { NextResponse } from 'next/server'
import { getDeniedSuggestions } from '@/lib/db'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

// GET /api/denied - Get denied suggestions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined

    const suggestions = await getDeniedSuggestions(limit)
    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error fetching denied suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch denied suggestions' },
      { status: 500 }
    )
  }
}
