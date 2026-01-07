'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'

interface VoteButtonProps {
  suggestionId: number
  votes: number
}

export default function VoteButton({ suggestionId, votes }: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWiggling, setIsWiggling] = useState(false)

  // Clear wiggle animation after it completes
  useEffect(() => {
    if (isWiggling) {
      const timer = setTimeout(() => setIsWiggling(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isWiggling])

  const handleVote = async () => {
    if (isVoting) return

    setIsVoting(true)
    setError(null)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Toggle vote state based on action
      setHasVoted(data.action === 'added')
      // Trigger wiggle animation to indicate vote receipt
      setIsWiggling(true)
      // Refresh suggestions to update vote counts
      mutate('/api/suggestions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed')
      // Clear error after 2 seconds
      setTimeout(() => setError(null), 2000)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleVote}
        disabled={isVoting}
        className={`
          flex flex-col items-center justify-center p-2 rounded-lg transition-all
          ${hasVoted
            ? 'text-accent bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95'
            : 'text-muted hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/30 active:scale-95'
          }
          disabled:cursor-not-allowed
        `}
        title={hasVoted ? 'Click to remove your vote' : 'Vote for this suggestion'}
      >
        <svg
          className={`w-6 h-6 ${isVoting ? 'animate-pulse' : ''} ${isWiggling ? 'animate-wiggle' : ''}`}
          fill={hasVoted ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
        <span className="text-sm font-semibold">{votes}</span>
      </button>
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  )
}
