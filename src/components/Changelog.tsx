'use client'

import { useState } from 'react'
import useSWR from 'swr'

interface ChangelogEntry {
  id: number
  suggestion_id: number
  suggestion_content: string
  votes_when_implemented: number
  commit_hash: string | null
  implemented_at: string
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const ITEMS_TO_SHOW = 5

export default function Changelog() {
  const [showAll, setShowAll] = useState(false)
  const { data: entries, error, isLoading } = useSWR<ChangelogEntry[]>(
    '/api/changelog',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      keepPreviousData: true, // Prevent data from being undefined during revalidation
      revalidateOnFocus: false, // Prevent revalidation on tab focus
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
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
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Changelog
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return null // Silently fail
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Changelog
        </h2>
        <p className="text-muted text-sm text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          No features implemented yet. Submit suggestions and vote!
        </p>
      </div>
    )
  }

  const displayedEntries = showAll ? entries : entries.slice(0, ITEMS_TO_SHOW)
  const hasMore = entries.length > ITEMS_TO_SHOW

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Changelog ({entries.length} implemented)
      </h2>
      <div className="space-y-3">
        {displayedEntries.map((entry) => (
          <div
            key={entry.id}
            className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-foreground break-words">
                  {entry.suggestion_content}
                </p>
                {entry.ai_note && (
                  <p className="text-sm text-muted italic mt-2 pl-3 border-l-2 border-green-300 dark:border-green-700">
                    {entry.ai_note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {entry.votes_when_implemented} votes
                  </span>
                  <span>{formatDate(entry.implemented_at)}</span>
                  {entry.commit_hash && (
                    <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded text-xs">
                      {entry.commit_hash.slice(0, 7)}
                    </code>
                  )}
                </div>
              </div>
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
              View {entries.length - ITEMS_TO_SHOW} more
            </>
          )}
        </button>
      )}
    </div>
  )
}
