'use client'

import React, { useState } from 'react'
import { getBoostPricing, getMilestoneDisplay, MIN_QUANTITY, MAX_QUANTITY } from '@/lib/boost-pricing'

interface InlineBoostCheckoutProps {
  onClose: () => void
  onSuccess?: () => void
}

export function InlineBoostCheckout({ onClose, onSuccess }: InlineBoostCheckoutProps) {
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pricing = getBoostPricing(quantity)
  const milestoneDisplay = getMilestoneDisplay(quantity)

  const handleIncrement = () => {
    if (quantity < MAX_QUANTITY) {
      setQuantity(q => q + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > MIN_QUANTITY) {
      setQuantity(q => q - 1)
    }
  }

  const handlePurchase = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground">Get Boosts</h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-muted mb-3">
        Move your ideas to the front of the line
      </p>

      {/* Compact quantity selector */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={quantity <= MIN_QUANTITY}
            className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700
                       flex items-center justify-center text-sm font-medium
                       hover:bg-neutral-100 dark:hover:bg-neutral-700
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Decrease quantity"
          >
            −
          </button>

          <div className="text-center min-w-[50px]">
            <span className="text-xl font-bold text-foreground tabular-nums">
              {quantity}
            </span>
            <span className="text-xs text-muted ml-1">
              {quantity === 1 ? 'boost' : 'boosts'}
            </span>
          </div>

          <button
            onClick={handleIncrement}
            disabled={quantity >= MAX_QUANTITY}
            className="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700
                       flex items-center justify-center text-sm font-medium
                       hover:bg-neutral-100 dark:hover:bg-neutral-700
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <div className="text-right">
          <div className="text-lg font-semibold text-foreground">
            {pricing.priceDisplay}
          </div>
          {milestoneDisplay && (
            <div className="text-xs text-green-600 dark:text-green-400">
              {milestoneDisplay}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-2 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className="w-full py-2 px-3 rounded-lg bg-neutral-900 dark:bg-white
                   text-white dark:text-neutral-900 text-sm font-medium
                   hover:bg-neutral-800 dark:hover:bg-neutral-100
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          'Continue'
        )}
      </button>

      <p className="mt-2 text-[10px] text-center text-muted">
        Secure payment via Stripe
      </p>
    </div>
  )
}
