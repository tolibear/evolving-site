import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getUserCredits,
  hasEverPurchased,
  createCreditPurchase,
} from '@/lib/db'
import {
  createCreditCheckoutSession,
  createBoostCheckoutSession,
  CREDIT_TIERS,
  getCreditTier,
  getBoostPricing,
  MIN_QUANTITY,
  MAX_QUANTITY
} from '@/lib/stripe'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

// GET: Get user's credit balance and purchase status
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const credits = await getUserCredits(user.id)
    const hasPurchased = await hasEverPurchased(user.id)

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

// POST: Create a checkout session for purchasing credits/boosts
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    // Get base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`

    // Support both new quantity-based and legacy tier-based purchases
    if (body.quantity !== undefined) {
      // New quantity-based flow
      const quantity = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, Number(body.quantity) || 1))
      const pricing = getBoostPricing(quantity)

      const checkoutSession = await createBoostCheckoutSession(
        user.id,
        quantity,
        `${baseUrl}?credits=success`,
        `${baseUrl}?credits=cancelled`
      )

      if (!checkoutSession) {
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
      }

      // Store the pending purchase
      await createCreditPurchase(
        user.id,
        quantity,
        pricing.totalCents,
        checkoutSession.id
      )

      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      })
    } else {
      // Legacy tier-based flow
      const tierId = body.tierId as 1 | 2 | 3

      if (![1, 2, 3].includes(tierId)) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }

      const tier = getCreditTier(tierId)
      if (!tier) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }

      const checkoutSession = await createCreditCheckoutSession(
        user.id,
        tierId,
        `${baseUrl}?credits=success`,
        `${baseUrl}?credits=cancelled`
      )

      if (!checkoutSession) {
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
      }

      // Store the pending purchase
      await createCreditPurchase(
        user.id,
        tier.credits,
        tier.priceCents,
        checkoutSession.id
      )

      return NextResponse.json({
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      })
    }
  } catch (error) {
    console.error('Error creating credit checkout:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
