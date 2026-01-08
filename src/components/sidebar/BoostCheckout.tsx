'use client'

import React, { useState } from 'react'
import { getBoostPricing, getMilestoneDisplay, MIN_QUANTITY, MAX_QUANTITY } from '@/lib/boost-pricing'

interface BoostCheckoutProps {
  onClose: () => void
  onSuccess?: () => void
}

export function BoostCheckout({ onClose, onSuccess }: BoostCheckoutProps) {
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Get Boosts</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-muted mb-6">
        Move your ideas to the front of the line
      </p>

      {/* Quantity selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handleDecrement}
          disabled={quantity <= MIN_QUANTITY}
          className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700
                     flex items-center justify-center text-lg font-medium
                     hover:bg-neutral-50 dark:hover:bg-neutral-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Decrease quantity"
        >
          −
        </button>

        <div className="text-center min-w-[80px]">
          <div className="text-4xl font-bold text-foreground tabular-nums">
            {quantity}
          </div>
          <div className="text-sm text-muted">
            {quantity === 1 ? 'boost' : 'boosts'}
          </div>
        </div>

        <button
          onClick={handleIncrement}
          disabled={quantity >= MAX_QUANTITY}
          className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700
                     flex items-center justify-center text-lg font-medium
                     hover:bg-neutral-50 dark:hover:bg-neutral-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Price display */}
      <div className="text-center mb-6 py-3 border-t border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-semibold text-foreground">
            {pricing.priceDisplay}
          </span>
        </div>
        {milestoneDisplay && (
          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
            {milestoneDisplay}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-lg bg-neutral-900 dark:bg-white
                   text-white dark:text-neutral-900 font-medium
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

      <p className="mt-3 text-xs text-center text-muted">
        Secure payment via Stripe
      </p>
    </div>
  )
}
