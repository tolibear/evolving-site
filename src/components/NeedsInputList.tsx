'use client'

import { useState } from 'react'
import useSWR from 'swr'

interface NeedsInputSuggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
  implemented_at: string | null
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const ITEMS_TO_SHOW = 5

export default function NeedsInputList() {
  const [showAll, setShowAll] = useState(false)
  const { data: suggestions, error, isLoading } = useSWR<NeedsInputSuggestion[]>(
    '/api/needs-input',
    fetcher,
    { refreshInterval: 30000 }
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Needs Developer Input
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return null
  }

  if (!suggestions || suggestions.length === 0) {
    return null // Don't show section if no suggestions need input
  }

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, ITEMS_TO_SHOW)
  const hasMore = suggestions.length > ITEMS_TO_SHOW

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Needs Developer Input ({suggestions.length})
      </h2>
      <p className="text-sm text-muted mb-4">
        These suggestions require manual setup (like environment variables or external services) before they can be implemented.
      </p>
      <div className="space-y-3">
        {displayedSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-foreground break-words">
                  {suggestion.content}
                </p>
                {suggestion.ai_note && (
                  <p className="text-sm text-muted italic mt-2 pl-3 border-l-2 border-amber-300 dark:border-amber-700">
                    {suggestion.ai_note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {suggestion.votes} votes
                  </span>
                  <span>{formatDate(suggestion.created_at)}</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1"
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
