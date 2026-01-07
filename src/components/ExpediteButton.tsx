'use client'

import { useState } from 'react'
import { mutate } from 'swr'

interface ExpediteButtonProps {
  suggestionId: number
  isExpedited?: boolean
  disabled?: boolean
}

export default function ExpediteButton({
  suggestionId,
  isExpedited = false,
  disabled = false,
}: ExpediteButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExpedite = async () => {
    if (isLoading || isExpedited || disabled) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/expedite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  if (isExpedited) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Expedited
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={handleExpedite}
        disabled={isLoading || disabled}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
          bg-gradient-to-r from-amber-500 to-orange-500 text-white
          hover:from-amber-600 hover:to-orange-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all shadow-sm hover:shadow"
        title="Pay $9 to prioritize this suggestion"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {isLoading ? 'Loading...' : '$9 Expedite'}
      </button>
      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  )
}
