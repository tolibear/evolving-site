import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSuggestionById, createExpeditePayment, isSuggestionExpedited } from '@/lib/db'
import { getClientIP, createVoterHash, checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'

// Initialize Stripe - only if keys are configured
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  : null

const EXPEDITE_PRICE_CENTS = 900 // $9.00

// POST - Create a Stripe Checkout Session for expediting a suggestion
export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured. Please set STRIPE_SECRET_KEY.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { suggestionId } = body

    // Validate suggestion ID
    if (!isValidId(suggestionId)) {
      return NextResponse.json(
        { error: 'Invalid suggestion ID' },
        { status: 400 }
      )
    }

    // Get user hash for tracking
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const userHash = createVoterHash(ip, userAgent)

    // Rate limit: 3 expedite attempts per hour per user
    const rateLimit = checkRateLimit(`expedite:${ip}`, 3, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many expedite attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Check if suggestion exists and is pending
    const suggestion = await getSuggestionById(suggestionId)
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      )
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { error: 'This suggestion cannot be expedited (not pending)' },
        { status: 400 }
      )
    }

    // Check if already expedited
    const alreadyExpedited = await isSuggestionExpedited(suggestionId)
    if (alreadyExpedited) {
      return NextResponse.json(
        { error: 'This suggestion is already expedited' },
        { status: 400 }
      )
    }

    // Determine the base URL for redirects
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Create Stripe Checkout Session using Stripe-hosted checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Expedite Build',
              description: `Priority implementation for: "${suggestion.content.slice(0, 100)}${suggestion.content.length > 100 ? '...' : ''}"`,
            },
            unit_amount: EXPEDITE_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?expedited=${suggestionId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?expedite_cancelled=1`,
      metadata: {
        suggestionId: String(suggestionId),
        userHash,
      },
    })

    // Store the payment record
    await createExpeditePayment(suggestionId, userHash, session.id)

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Expedite checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
