import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe'
import {
  completeExpeditePayment,
  failExpeditePayment,
  getExpeditePaymentBySession,
  completeCreditPurchase,
  failCreditPurchase,
  getCreditPurchaseBySession,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs'

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature, webhookSecret)
    if (!event) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`Received Stripe webhook: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const checkoutSessionId = session.id
        const paymentIntentId = session.payment_intent as string
        const paymentType = session.metadata?.type

        // Handle credit purchases
        if (paymentType === 'credit_purchase') {
          const existingPurchase = await getCreditPurchaseBySession(checkoutSessionId)
          if (!existingPurchase) {
            console.error(`No credit purchase record found for session ${checkoutSessionId}`)
            return NextResponse.json({ received: true })
          }

          if (existingPurchase.status === 'completed') {
            console.log(`Credit purchase ${checkoutSessionId} already completed`)
            return NextResponse.json({ received: true })
          }

          const purchase = await completeCreditPurchase(checkoutSessionId, paymentIntentId)
          if (purchase) {
            console.log(`Credit purchase completed: user ${purchase.user_id}, ${purchase.credits_amount} credits, ${purchase.amount_cents} cents`)
          }
          break
        }

        // Handle legacy expedite payments
        if (paymentType === 'expedite') {
          const existingPayment = await getExpeditePaymentBySession(checkoutSessionId)
          if (!existingPayment) {
            console.error(`No payment record found for session ${checkoutSessionId}`)
            return NextResponse.json({ received: true })
          }

          if (existingPayment.status === 'completed') {
            console.log(`Payment ${checkoutSessionId} already completed`)
            return NextResponse.json({ received: true })
          }

          const payment = await completeExpeditePayment(checkoutSessionId, paymentIntentId)
          if (payment) {
            console.log(`Expedite payment completed: suggestion ${payment.suggestion_id}, amount ${payment.amount_cents} cents`)
          }
          break
        }

        console.log(`Ignoring checkout session with type: ${paymentType}`)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object
        const checkoutSessionId = session.id
        const paymentType = session.metadata?.type

        if (paymentType === 'credit_purchase') {
          await failCreditPurchase(checkoutSessionId)
          console.log(`Credit purchase checkout session expired: ${checkoutSessionId}`)
        } else if (paymentType === 'expedite') {
          await failExpeditePayment(checkoutSessionId)
          console.log(`Expedite checkout session expired: ${checkoutSessionId}`)
        }
        break
      }

      case 'charge.refunded': {
        // Log refunds for audit purposes
        const charge = event.data.object
        console.log(`Charge refunded: ${charge.id}, amount: ${charge.amount_refunded}`)
        break
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
