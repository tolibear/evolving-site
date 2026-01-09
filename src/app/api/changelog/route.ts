import { NextResponse } from 'next/server'
import { getChangelog, getUserById, getContributors, getSuggestionById } from '@/lib/db'
import type { Submitter } from '@/types'

// Force dynamic - always fetch fresh data
export const dynamic = 'force-dynamic'

// GET /api/changelog - Get implementation history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const includeContributors = searchParams.get('contributors') === 'true'

    const entries = await getChangelog(limit)

    // If contributors requested (for recently shipped), enhance with user data
    if (includeContributors && entries.length > 0) {
      const enhancedEntries = await Promise.all(
        entries.map(async (entry) => {
          // Get the original suggestion to find submitter
          const suggestion = await getSuggestionById(entry.suggestion_id)

          let submitter: Submitter | null = null
          if (suggestion?.user_id) {
            const user = await getUserById(suggestion.user_id)
            if (user) {
              submitter = {
                id: user.id,
                username: user.twitter_username,
                avatar: user.twitter_avatar,
                name: user.twitter_name,
              }
            }
          }

          // Get contributors (voters + commenters)
          const { contributors, totalCount } = await getContributors(entry.suggestion_id, 5)

          return {
            ...entry,
            submitter,
            contributors,
            contributorCount: totalCount,
          }
        })
      )
      return NextResponse.json(enhancedEntries)
    }

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching changelog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch changelog' },
      { status: 500 }
    )
  }
}
