'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { useAuth } from './AuthProvider'
import LoginPrompt from './LoginPrompt'
import { useAutoResetFlag } from '@/hooks/useAutoReset'

interface VoteButtonProps {
  suggestionId: number
  votes: number
  initialVoteType?: 'up' | null
  isLocked?: boolean
}

export default function VoteButton({
  suggestionId,
  votes,
  initialVoteType = null,
  isLocked = false,
}: VoteButtonProps) {
  const { isLoggedIn, isLoading } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [voteType, setVoteType] = useState<'up' | null>(initialVoteType)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-reset animation states
  const [isWiggling, triggerWiggle] = useAutoResetFlag(500)
  const [isPop, triggerPop] = useAutoResetFlag(300)
  const [showLoginPrompt, triggerLoginPrompt] = useAutoResetFlag(5000)

  // Update vote type when initialVoteType changes
  useEffect(() => {
    setVoteType(initialVoteType)
  }, [initialVoteType])

  const handleVote = async () => {
    if (isVoting || isLoading || isLocked) return

    // Check if user is logged in
    if (!isLoggedIn) {
      triggerLoginPrompt()
      return
    }

    setIsVoting(true)
    setError(null)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update vote state based on response
      setVoteType(data.voteType)
      // Trigger animations to indicate vote receipt
      triggerWiggle()
      triggerPop()
      // Show success feedback briefly
      setSuccess(true)
      setTimeout(() => setSuccess(false), 1500)
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
    <div className="flex flex-col items-center relative">
      {/* Vote button */}
      <button
        onClick={handleVote}
        disabled={isVoting || isLocked}
        className={`
          flex items-center justify-center p-1 rounded transition-all
          ${
            isLocked
              ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
              : voteType === 'up'
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
              : 'text-muted hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
          }
          active:scale-95 disabled:cursor-not-allowed
        `}
        aria-label={isLocked ? 'Voting locked during implementation' : voteType === 'up' ? 'Remove vote' : 'Vote for this suggestion'}
        aria-pressed={voteType === 'up'}
        title={isLocked ? 'Voting locked during implementation' : undefined}
      >
        <svg
          className={`w-4 h-4 ${isVoting ? 'animate-pulse' : ''} ${isWiggling && voteType === 'up' ? 'animate-wiggle' : ''}`}
          fill={voteType === 'up' ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Vote count */}
      <span
        className={`text-xs font-semibold transition-transform ${
          voteType === 'up'
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted'
        } ${isPop ? 'animate-pop' : ''}`}
      >
        {votes}
      </span>

      {showLoginPrompt && (
        <div className="absolute left-full ml-2 top-0 z-10 animate-fade-in whitespace-nowrap">
          <LoginPrompt action="vote" compact />
        </div>
      )}

      {success && (
        <span
          className="text-xs text-green-600 dark:text-green-400 mt-1 animate-fade-in"
          role="status"
        >
          Voted!
        </span>
      )}

      {error && (
        <span className="text-xs text-red-500 mt-1 max-w-[80px] text-center" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
