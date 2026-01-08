import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSuggestionById, createExpeditePayment } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'
import { createExpediteCheckoutSession, EXPEDITE_AMOUNT_CENTS } from '@/lib/stripe'

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

    // Determine base URL for success/cancel redirects
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'https://evolving-site.vercel.app'
    const successUrl = `${origin}/?expedited=true&suggestionId=${suggestionId}`
    const cancelUrl = `${origin}/`

    // Create Stripe Checkout session
    const session = await createExpediteCheckoutSession(
      suggestionId,
      user.id,
      suggestion.content,
      successUrl,
      cancelUrl
    )

    if (!session) {
      return NextResponse.json(
        { error: 'Payment service unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    // Create pending payment record in database
    await createExpeditePayment(suggestionId, user.id, session.id, EXPEDITE_AMOUNT_CENTS)

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Error creating expedite session:', error)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
