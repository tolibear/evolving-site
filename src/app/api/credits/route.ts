import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getSession,
  getUserCredits,
  hasEverPurchased,
  createCreditPurchase,
} from '@/lib/db'
import { createCreditCheckoutSession, CREDIT_TIERS, getCreditTier } from '@/lib/stripe'

// GET: Get user's credit balance and purchase status
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const credits = await getUserCredits(session.user.id)
    const hasPurchased = await hasEverPurchased(session.user.id)

    return NextResponse.json({
      balance: credits.balance,
      totalPurchased: credits.total_purchased,
      hasEverPurchased: hasPurchased,
      tiers: CREDIT_TIERS,
    })
  } catch (error) {
    console.error('Error fetching credits:', error)
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 })
  }
}

// POST: Create a checkout session for purchasing credits
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const tierId = body.tierId as 1 | 2 | 3

    if (![1, 2, 3].includes(tierId)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const tier = getCreditTier(tierId)
    if (!tier) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Get base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`

    const checkoutSession = await createCreditCheckoutSession(
      session.user.id,
      tierId,
      `${baseUrl}?credits=success`,
      `${baseUrl}?credits=cancelled`
    )

    if (!checkoutSession) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    // Store the pending purchase
    await createCreditPurchase(
      session.user.id,
      tier.credits,
      tier.priceCents,
      checkoutSession.id
    )

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Error creating credit checkout:', error)
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 })
  }
}
