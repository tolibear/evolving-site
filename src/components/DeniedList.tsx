'use client'

import { useState } from 'react'
import useSWR from 'swr'

interface DeniedSuggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
  implemented_at: string
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const ITEMS_TO_SHOW = 5

export default function DeniedList() {
  const [showAll, setShowAll] = useState(false)
  const { data: suggestions, error, isLoading } = useSWR<DeniedSuggestion[]>(
    '/api/denied',
    fetcher,
    { refreshInterval: 30000 }
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return null
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-4">
        No denied suggestions yet.
      </p>
    )
  }

  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, ITEMS_TO_SHOW)
  const hasMore = suggestions.length > ITEMS_TO_SHOW

  return (
    <div>
      <p className="text-xs text-muted mb-3">{suggestions.length} denied</p>
      <div className="space-y-3">
        {displayedSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="card border-l-2 border-l-red-500"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground break-words leading-snug line-through opacity-75">
                  {suggestion.content}
                </p>
                {suggestion.ai_note && (
                  <p className="text-xs text-muted italic mt-2 pl-3 border-l-2 border-red-300 dark:border-red-700">
                    {suggestion.ai_note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {suggestion.votes}
                  </span>
                  <span>{formatDate(suggestion.implemented_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
        >
          {showAll ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
