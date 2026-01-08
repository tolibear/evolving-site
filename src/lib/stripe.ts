import Stripe from 'stripe'
import {
  getCompletedExpeditePayments,
  markExpediteRefunded,
  updateSuggestionExpediteAmount,
} from './db'

// Initialize Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe features will be unavailable')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

// Legacy expedite constants (kept for backwards compatibility)
export const EXPEDITE_PRODUCT_ID = 'prod_TkZwfKCkKmAPaW'
export const EXPEDITE_PRICE_ID = 'price_1Sn4mJLCJbdyFiTaSDwKWU3K'
export const EXPEDITE_AMOUNT_CENTS = 400

// Import and re-export credit tiers from shared module
import { CREDIT_TIERS, getCreditTier, type CreditTier } from './credit-tiers'
export { CREDIT_TIERS, getCreditTier, type CreditTier }

// Refund all expedite payments for a suggestion (called when suggestion is denied)
export async function refundExpeditePayments(suggestionId: number): Promise<{
  refunded: number
  failed: number
  totalRefundedCents: number
}> {
  if (!stripe) {
    console.error('Stripe not configured - cannot process refunds')
    return { refunded: 0, failed: 0, totalRefundedCents: 0 }
  }

  const payments = await getCompletedExpeditePayments(suggestionId)
  let refunded = 0
  let failed = 0
  let totalRefundedCents = 0

  for (const payment of payments) {
    if (!payment.stripe_payment_intent_id) {
      console.error(`Payment ${payment.id} has no payment intent ID - skipping refund`)
      failed++
      continue
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        reason: 'requested_by_customer',
        metadata: {
          suggestionId: String(suggestionId),
          reason: 'suggestion_denied',
          originalPaymentId: String(payment.id),
        },
      })

      await markExpediteRefunded(payment.id, refund.id)
      refunded++
      totalRefundedCents += payment.amount_cents
      console.log(`Refunded payment ${payment.id} (${payment.amount_cents} cents) - refund ${refund.id}`)
    } catch (error) {
      console.error(`Failed to refund payment ${payment.id}:`, error)
      failed++
    }
  }

  // Update suggestion expedite amount to reflect refunds
  await updateSuggestionExpediteAmount(suggestionId)

  return { refunded, failed, totalRefundedCents }
}

// Create a Stripe Checkout session for expediting a suggestion
export async function createExpediteCheckoutSession(
  suggestionId: number,
  userId: number,
  suggestionContent: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('Stripe not configured - cannot create checkout session')
    return null
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: EXPEDITE_PRICE_ID,
        quantity: 1,
      },
    ],
    metadata: {
      suggestionId: String(suggestionId),
      userId: String(userId),
      type: 'expedite',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Shorten the session expiration to 30 minutes
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  })

  return session
}

// Verify Stripe webhook signature
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event | null {
  if (!stripe) {
    console.error('Stripe not configured - cannot verify webhook')
    return null
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return null
  }
}

// Create a Stripe Checkout session for purchasing credits
export async function createCreditCheckoutSession(
  userId: number,
  tierId: 1 | 2 | 3,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('Stripe not configured - cannot create checkout session')
    return null
  }

  const tier = getCreditTier(tierId)
  if (!tier) {
    console.error(`Invalid tier ID: ${tierId}`)
    return null
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tier.credits} Expedite Credit${tier.credits > 1 ? 's' : ''}`,
            description: tier.discount > 0
              ? `${tier.discount}% discount - $${(tier.perCreditCents / 100).toFixed(2)} per credit`
              : 'Use to boost your suggestion to the top',
          },
          unit_amount: tier.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: String(userId),
      tierId: String(tierId),
      creditsAmount: String(tier.credits),
      type: 'credit_purchase',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  })

  return session
}
