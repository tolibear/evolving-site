'use client'

import React, { useState } from 'react'
import { CREDIT_TIERS, CreditTier } from '@/lib/stripe'

interface CreditCheckoutProps {
  onClose: () => void
  onSuccess?: () => void
}

export function CreditCheckout({ onClose, onSuccess }: CreditCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<CreditTier>(CREDIT_TIERS[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: selectedTier.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Buy Credits</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-100 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-muted mb-4">
        Use credits to boost suggestions to the top of the queue.
      </p>

      <div className="space-y-2 mb-4">
        {CREDIT_TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => setSelectedTier(tier)}
            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
              selectedTier.id === tier.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">
                  {tier.credits} Credit{tier.credits > 1 ? 's' : ''}
                </span>
                {tier.discount > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    {tier.discount}% off
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="font-semibold text-foreground">{tier.priceDisplay}</span>
                {tier.credits > 1 && (
                  <span className="block text-xs text-muted">
                    ${(tier.perCreditCents / 100).toFixed(2)}/credit
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay ${selectedTier.priceDisplay}`
        )}
      </button>

      <p className="mt-3 text-xs text-center text-muted">
        Secure payment powered by Stripe
      </p>
    </div>
  )
}
