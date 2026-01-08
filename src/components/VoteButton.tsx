'use client'

import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { useAuth } from './AuthProvider'
import LoginPrompt from './LoginPrompt'

interface VoteButtonProps {
  suggestionId: number
  votes: number
  initialVoteType?: 'up' | 'down' | null
}

export default function VoteButton({
  suggestionId,
  votes,
  initialVoteType = null,
}: VoteButtonProps) {
  const { isLoggedIn, isLoading } = useAuth()
  const [isVoting, setIsVoting] = useState(false)
  const [voteType, setVoteType] = useState<'up' | 'down' | null>(initialVoteType)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isWiggling, setIsWiggling] = useState(false)
  const [isPop, setIsPop] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

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

  // Clear pop animation after it completes
  useEffect(() => {
    if (isPop) {
      const timer = setTimeout(() => setIsPop(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isPop])

  // Clear login prompt after 5 seconds
  useEffect(() => {
    if (showLoginPrompt) {
      const timer = setTimeout(() => setShowLoginPrompt(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showLoginPrompt])

  const handleVote = async (newVoteType: 'up' | 'down') => {
    if (isVoting || isLoading) return

    // Check if user is logged in
    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return
    }

    setIsVoting(true)
    setError(null)
    setShowLoginPrompt(false)

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, voteType: newVoteType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote')
      }

      // Update vote state based on response
      setVoteType(data.voteType)
      // Trigger animations to indicate vote receipt
      setIsWiggling(true)
      setIsPop(true)
      // Play vote sound
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
    <div className="flex flex-col items-center">
      {/* Upvote button */}
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting}
        className={`
          flex items-center justify-center p-1 rounded transition-all
          ${
            voteType === 'up'
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50'
              : 'text-muted hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
          }
          active:scale-95 disabled:cursor-not-allowed
        `}
        aria-label={voteType === 'up' ? 'Remove upvote' : 'Upvote this suggestion'}
        aria-pressed={voteType === 'up'}
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
            : voteType === 'down'
              ? 'text-red-500 dark:text-red-400'
              : 'text-muted'
        } ${isPop ? 'animate-pop' : ''}`}
      >
        {votes}
      </span>

      {/* Downvote button */}
      <button
        onClick={() => handleVote('down')}
        disabled={isVoting}
        className={`
          flex items-center justify-center p-1 rounded transition-all
          ${
            voteType === 'down'
              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50'
              : 'text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
          }
          active:scale-95 disabled:cursor-not-allowed
        `}
        aria-label={voteType === 'down' ? 'Remove downvote' : 'Downvote this suggestion'}
        aria-pressed={voteType === 'down'}
      >
        <svg
          className={`w-4 h-4 ${isVoting ? 'animate-pulse' : ''} ${isWiggling && voteType === 'down' ? 'animate-wiggle' : ''}`}
          fill={voteType === 'down' ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showLoginPrompt && (
        <div className="absolute mt-16 z-10 animate-fade-in">
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
