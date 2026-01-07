import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { completeExpeditePayment, getExpeditePaymentBySessionId } from '@/lib/db'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Verify this is our expedite payment
    if (session.metadata?.suggestionId) {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || ''

      try {
        // Check if we have a record of this payment
        const payment = await getExpeditePaymentBySessionId(session.id)
        if (payment && payment.status === 'pending') {
          await completeExpeditePayment(session.id, paymentIntentId)
          console.log(`Expedite payment completed for suggestion ${session.metadata.suggestionId}`)
        }
      } catch (error) {
        console.error('Failed to complete expedite payment:', error)
        return NextResponse.json(
          { error: 'Failed to process payment' },
          { status: 500 }
        )
      }
    }
  }

  return NextResponse.json({ received: true })
}
