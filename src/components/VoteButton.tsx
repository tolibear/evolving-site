'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'

interface VoteButtonProps {
  suggestionId: number
  votes: number
  initialVoteType?: 'up' | 'down' | null
}

export default function VoteButton({ suggestionId, votes, initialVoteType = null }: VoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false)
  const [voteType, setVoteType] = useState<'up' | 'down' | null>(initialVoteType)
  const [error, setError] = useState<string | null>(null)
  const [isWiggling, setIsWiggling] = useState(false)

  // Update vote type when initialVoteType changes
  useEffect(() => {
    setVoteType(initialVoteType)
  }, [initialVoteType])

  // Clear wiggle animation after it completes
  useEffect(() => {
    if (isWiggling) {
      const timer = setTimeout(() => setIsWiggling(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isWiggling])

  const handleVote = async (newVoteType: 'up' | 'down') => {
    if (isVoting) return

    setIsVoting(true)
    setError(null)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, voteType: newVoteType })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update vote state based on response
      setVoteType(data.voteType)
      // Trigger wiggle animation to indicate vote receipt
      setIsWiggling(true)
      // Refresh suggestions to update vote counts and vote allowance
      mutate('/api/suggestions')
      mutate('/api/vote-allowance')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed')
      // Clear error after 2 seconds
      setTimeout(() => setError(null), 2000)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Upvote button */}
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting}
        className={`
          flex items-center justify-center p-1.5 rounded-md transition-all
          ${voteType === 'up'
            ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
            : 'text-muted hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
          }
          active:scale-95 disabled:cursor-not-allowed
        `}
        title={voteType === 'up' ? 'Click to remove upvote' : 'Upvote'}
      >
        <svg
          className={`w-5 h-5 ${isVoting ? 'animate-pulse' : ''} ${isWiggling && voteType === 'up' ? 'animate-wiggle' : ''}`}
          fill={voteType === 'up' ? 'currentColor' : 'none'}
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
      </button>

      {/* Vote count */}
      <span className={`text-sm font-semibold ${
        voteType === 'up' ? 'text-green-600 dark:text-green-400' :
        voteType === 'down' ? 'text-red-500 dark:text-red-400' : 'text-muted'
      }`}>{votes}</span>

      {/* Downvote button */}
      <button
        onClick={() => handleVote('down')}
        disabled={isVoting}
        className={`
          flex items-center justify-center p-1.5 rounded-md transition-all
          ${voteType === 'down'
            ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50'
            : 'text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
          }
          active:scale-95 disabled:cursor-not-allowed
        `}
        title={voteType === 'down' ? 'Click to remove downvote' : 'Downvote'}
      >
        <svg
          className={`w-5 h-5 ${isVoting ? 'animate-pulse' : ''} ${isWiggling && voteType === 'down' ? 'animate-wiggle' : ''}`}
          fill={voteType === 'down' ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {error && (
        <span className="text-xs text-red-500 mt-1 max-w-[80px] text-center">{error}</span>
      )}
    </div>
  )
}
