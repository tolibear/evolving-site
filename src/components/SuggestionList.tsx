'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import SuggestionCard from './SuggestionCard'
import VoteAllowanceDisplay from './VoteAllowanceDisplay'

interface Submitter {
  id: number
  username: string
  avatar: string | null
  name: string | null
}

interface Contributor {
  id: number
  username: string
  avatar: string | null
  type: 'comment' | 'vote'
}

interface Suggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
  comment_count?: number
  author: string | null
  isOwner: boolean
  expedite_amount_cents?: number
  submitter: Submitter | null
  contributors: Contributor[]
  contributorCount: number
}

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
}

interface UserVotesResponse {
  votes: Record<number, 'up' | null>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ITEMS_TO_SHOW = 5

export default function SuggestionList() {
  const [showAll, setShowAll] = useState(false)
  const {
    data: suggestions,
    error,
    isLoading,
  } = useSWR<Suggestion[]>('/api/suggestions', fetcher, { refreshInterval: 5000 })

  const { data: status } = useSWR<Status>('/api/status', fetcher, { refreshInterval: 5000 })

  // Build the suggestionIds query parameter
  const suggestionIdsParam = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return ''
    return suggestions.map((s) => s.id).join(',')
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
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse" aria-hidden="true">
            <div className="flex gap-4">
              {/* Vote button skeleton */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-md" />
                <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-md" />
              </div>
              {/* Content skeleton */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
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
        <p className="text-sm">Be the first to suggest something!</p>
      </div>
    )
  }

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, ITEMS_TO_SHOW)
  const hasMore = suggestions.length > ITEMS_TO_SHOW

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-foreground">Suggestions ({suggestions.length})</h2>
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
          suggestionNumber={suggestion.id}
          submitter={suggestion.submitter}
          contributors={suggestion.contributors}
          contributorCount={suggestion.contributorCount}
          expediteAmountCents={suggestion.expedite_amount_cents}
          isInProgress={
            status?.state === 'working' && status?.current_suggestion_id === suggestion.id
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
