import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getSuggestions,
  createSuggestionWithUser,
  deleteSuggestionByUser,
  getStatus,
  getUserById,
  getContributors,
  type Suggestion,
} from '@/lib/db'
import { getClientIP } from '@/lib/utils-server'
import { checkRateLimit } from '@/lib/utils'
import { sanitizeSuggestion } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

interface SuggestionWithUser extends Suggestion {
  submitter: {
    id: number
    username: string
    avatar: string | null
    name: string | null
  } | null
  contributors: Array<{
    id: number
    username: string
    avatar: string | null
    type: 'comment' | 'vote'
  }>
  contributorCount: number
  isOwner: boolean
}

// GET /api/suggestions - List all pending suggestions
export async function GET(request: Request) {
  try {
    const suggestions = await getSuggestions()

    // Get current user to check ownership
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const currentUser = await validateSessionAndGetUser(sessionId)

    // Enhance each suggestion with user data and contributors
    const enhancedSuggestions: SuggestionWithUser[] = await Promise.all(
      suggestions.map(async (s) => {
        // Get submitter user info if user_id exists
        let submitter: SuggestionWithUser['submitter'] = null
        if (s.user_id) {
          const user = await getUserById(s.user_id)
          if (user) {
            submitter = {
              id: user.id,
              username: user.twitter_username,
              avatar: user.twitter_avatar,
              name: user.twitter_name,
            }
          }
        }

        // Get contributors (commenters + voters)
        const { contributors, totalCount } = await getContributors(s.id, 5)

        return {
          ...s,
          submitter,
          contributors,
          contributorCount: totalCount,
          isOwner: currentUser ? s.user_id === currentUser.id : false,
        }
      })
    )

    return NextResponse.json(enhancedSuggestions)
  } catch (error) {
    console.error('Error fetching suggestions:', error)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}

// POST /api/suggestions - Create a new suggestion (requires authentication)
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Twitter.' },
        { status: 401 }
      )
    }

    const ip = getClientIP(request)

    // Rate limit: 5 suggestions per hour per user
    const rateLimit = checkRateLimit(`suggestions:user:${user.id}`, 5, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    // Validate and sanitize content
    const result = sanitizeSuggestion(content)
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Create the suggestion with user_id
    const id = await createSuggestionWithUser(result.sanitized, user.id)

    return NextResponse.json(
      {
        id,
        message: 'Suggestion created successfully',
        remaining: rateLimit.remaining,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 })
  }
}

// DELETE /api/suggestions - Delete a user's own suggestion (requires authentication)
export async function DELETE(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Twitter.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { suggestionId } = body

    // Validate suggestionId
    if (typeof suggestionId !== 'number' || suggestionId <= 0) {
      return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 })
    }

    // Check if system is currently working on this suggestion
    const status = await getStatus()
    if (status.state === 'working' && status.current_suggestion_id === suggestionId) {
      return NextResponse.json(
        { error: 'Cannot delete a suggestion that is currently being implemented' },
        { status: 400 }
      )
    }

    // Attempt to delete (will only work if user owns the suggestion)
    const deleted = await deleteSuggestionByUser(suggestionId, user.id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Suggestion not found or you do not have permission to delete it' },
        { status: 403 }
      )
    }

    return NextResponse.json({ message: 'Suggestion deleted successfully' })
  } catch (error) {
    console.error('Error deleting suggestion:', error)
    return NextResponse.json({ error: 'Failed to delete suggestion' }, { status: 500 })
  }
}
