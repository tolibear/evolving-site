'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import LoginPrompt from './LoginPrompt'
import { useSWRConfig } from 'swr'

interface ExpediteButtonProps {
  suggestionId: number
  currentAmount?: number // Amount already paid in cents
  onNeedsCredits?: () => void // Callback when credits are needed
  onToggleBoost?: () => void // Callback to toggle inline boost UI
  showingBoost?: boolean // Whether boost UI is currently shown
}

export default function ExpediteButton({
  suggestionId,
  currentAmount = 0,
  onNeedsCredits,
  onToggleBoost,
  showingBoost = false,
}: ExpediteButtonProps) {
  const { isLoggedIn, isLoading } = useAuth()
  const { mutate } = useSWRConfig()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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
        throw new Error(data.error || 'Failed to expedite')
      }

      // Credit was used successfully
      if (data.success && data.usedCredit) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 2000)
        // Refresh suggestions and credits
        mutate('/api/suggestions')
        mutate('/api/credits')
        return
      }

      // Needs credits - toggle inline boost UI if available, otherwise trigger checkout
      if (data.needsCredits) {
        if (onToggleBoost) {
          onToggleBoost()
        } else if (onNeedsCredits) {
          onNeedsCredits()
        }
        return
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
        disabled={isProcessing || showSuccess}
        aria-expanded={showingBoost}
        className={`
          inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full
          transition-all duration-200
          ${showSuccess
            ? 'bg-green-100 text-green-700 border border-green-300'
            : showingBoost
            ? 'bg-amber-100 text-amber-700 border border-amber-300'
            : currentAmount > 0
            ? 'bg-amber-100 text-amber-700 border border-amber-300'
            : 'bg-neutral-100 text-muted hover:text-amber-600 hover:bg-amber-50 border border-neutral-200 hover:border-amber-300'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={showSuccess
          ? 'Boosted!'
          : showingBoost
          ? 'Hide boost options'
          : currentAmount > 0
          ? `$${(currentAmount / 100).toFixed(0)} paid to expedite. Use 1 credit to boost more.`
          : 'Use 1 credit to boost this suggestion'
        }
      >
        {showSuccess ? (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Boosted!</span>
          </>
        ) : (
          <>
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
              <span>Boost</span>
            )}
          </>
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
