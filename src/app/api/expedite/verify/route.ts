import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { completeExpeditePayment, getExpeditePaymentBySessionId } from '@/lib/db'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  : null

// GET - Verify a checkout session and complete the payment if successful
export async function GET(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id' },
      { status: 400 }
    )
  }

  try {
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      // Check if we have a record and need to complete it
      const payment = await getExpeditePaymentBySessionId(sessionId)
      if (payment && payment.status === 'pending') {
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || ''
        await completeExpeditePayment(sessionId, paymentIntentId)
      }

      return NextResponse.json({
        success: true,
        suggestionId: session.metadata?.suggestionId,
      })
    }

    return NextResponse.json({
      success: false,
      status: session.payment_status,
    })
  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    )
  }
}
