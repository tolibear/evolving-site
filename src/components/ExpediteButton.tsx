'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import LoginPrompt from './LoginPrompt'

interface ExpediteButtonProps {
  suggestionId: number
  currentAmount?: number // Amount already paid in cents
}

export default function ExpediteButton({ suggestionId, currentAmount = 0 }: ExpediteButtonProps) {
  const { isLoggedIn, isLoading } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleExpedite = async () => {
    if (isProcessing || isLoading) return

    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      setTimeout(() => setShowLoginPrompt(false), 5000)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/expedite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expedite')
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleExpedite}
        disabled={isProcessing}
        className={`
          inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full
          transition-all duration-200
          ${currentAmount > 0
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            : 'bg-neutral-100 dark:bg-neutral-800 text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 border border-neutral-200 dark:border-neutral-700 hover:border-amber-300 dark:hover:border-amber-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={currentAmount > 0
          ? `$${(currentAmount / 100).toFixed(0)} paid to expedite. Pay $4 more to boost priority.`
          : 'Pay $4 to boost this suggestion to the top of the queue'
        }
      >
        <svg
          className={`w-3 h-3 ${isProcessing ? 'animate-pulse' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        {currentAmount > 0 ? (
          <span>${(currentAmount / 100).toFixed(0)}</span>
        ) : (
          <span>$4</span>
        )}
      </button>

      {showLoginPrompt && (
        <div className="absolute top-full left-0 mt-1 z-10 animate-fade-in">
          <LoginPrompt action="expedite" compact />
        </div>
      )}

      {error && (
        <span className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
