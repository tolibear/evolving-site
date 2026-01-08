import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getSuggestionById,
  getUserCredits,
  useCredit,
  incrementSuggestionExpediteAmount,
} from '@/lib/db'
import { checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

// POST /api/expedite - Create Stripe checkout session for expediting a suggestion
// Body: { suggestionId: number }
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

    // Rate limit: 10 expedite attempts per hour per user
    const rateLimit = checkRateLimit(`expedite:user:${user.id}`, 10, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Expedite rate limit exceeded. Please try again later.',
          resetIn: Math.ceil(rateLimit.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { suggestionId } = body

    // Validate suggestionId
    if (!isValidId(suggestionId)) {
      return NextResponse.json({ error: 'Valid suggestionId is required' }, { status: 400 })
    }

    // Verify suggestion exists and is pending
    const suggestion = await getSuggestionById(suggestionId)
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending suggestions can be expedited' },
        { status: 400 }
      )
    }

    // Check if user has credits available
    const credits = await getUserCredits(user.id)

    if (credits.balance > 0) {
      // Use a credit to expedite instantly
      const creditUsed = await useCredit(user.id)
      if (creditUsed) {
        // Increment the suggestion's expedite amount (1 credit = 100 cents = $1)
        await incrementSuggestionExpediteAmount(suggestionId, 100)

        return NextResponse.json({
          success: true,
          usedCredit: true,
          remainingCredits: credits.balance - 1,
        })
      }
    }

    // No credits available - return indication that credits are needed
    return NextResponse.json({
      needsCredits: true,
      currentBalance: credits.balance,
    })
  } catch (error) {
    console.error('Error creating expedite session:', error)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
