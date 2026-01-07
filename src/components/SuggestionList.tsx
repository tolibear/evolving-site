'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import SuggestionCard from './SuggestionCard'
import VoteAllowanceDisplay from './VoteAllowanceDisplay'

interface Suggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
  comment_count?: number
  author: string | null
  isOwner: boolean
  is_expedited?: number
}

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
}

interface UserVotesResponse {
  votes: Record<number, 'up' | 'down' | null>
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const ITEMS_TO_SHOW = 5

export default function SuggestionList() {
  const [showAll, setShowAll] = useState(false)
  const { data: suggestions, error, isLoading } = useSWR<Suggestion[]>(
    '/api/suggestions',
    fetcher,
    { refreshInterval: 5000 } // Refresh every 5 seconds
  )

  const { data: status } = useSWR<Status>(
    '/api/status',
    fetcher,
    { refreshInterval: 5000 }
  )

  // Build the suggestionIds query parameter
  const suggestionIdsParam = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return ''
    return suggestions.map(s => s.id).join(',')
  }, [suggestions])

  // Fetch user votes for all suggestions
  const { data: userVotesData } = useSWR<UserVotesResponse>(
    suggestionIdsParam ? `/api/user-votes?suggestionIds=${suggestionIdsParam}` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  const userVotes = userVotesData?.votes || {}

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center text-red-600">
        Failed to load suggestions. Please try again later.
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="card text-center text-muted">
        <p className="mb-2">No suggestions yet.</p>
        <p className="text-sm">Be the first to suggest a feature!</p>
      </div>
    )
  }

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, ITEMS_TO_SHOW)
  const hasMore = suggestions.length > ITEMS_TO_SHOW

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          Suggestions ({suggestions.length})
        </h2>
        <VoteAllowanceDisplay />
      </div>
      {displayedSuggestions.map((suggestion, index) => (
        <SuggestionCard
          key={suggestion.id}
          id={suggestion.id}
          content={suggestion.content}
          votes={suggestion.votes}
          createdAt={suggestion.created_at}
          commentCount={suggestion.comment_count}
          author={suggestion.author}
          isOwner={suggestion.isOwner}
          userVoteType={userVotes[suggestion.id] || null}
          suggestionNumber={index + 1}
          isInProgress={
            status?.state === 'working' &&
            status?.current_suggestion_id === suggestion.id
          }
        />
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1"
        >
          {showAll ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              View {suggestions.length - ITEMS_TO_SHOW} more
            </>
          )}
        </button>
      )}
    </div>
  )
}
