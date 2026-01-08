'use client'

import { useState } from 'react'
import useSWR from 'swr'
import FeatureIcon from './FeatureIcon'

interface ChangelogEntry {
  id: number
  suggestion_id: number
  suggestion_content: string
  votes_when_implemented: number
  commit_hash: string | null
  implemented_at: string
  ai_note: string | null
  icon_type: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const ITEMS_TO_SHOW = 5

export default function Changelog() {
  const [showAll, setShowAll] = useState(false)
  const { data: entries, error, isLoading } = useSWR<ChangelogEntry[]>(
    '/api/changelog',
    fetcher,
    {
      refreshInterval: 30000,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
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
        <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return null
  }

  if (!entries || entries.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-4">
        No features implemented yet. Submit suggestions and vote!
      </p>
    )
  }

  const displayedEntries = showAll ? entries : entries.slice(0, ITEMS_TO_SHOW)
  const hasMore = entries.length > ITEMS_TO_SHOW

  return (
    <div>
      <p className="text-xs text-muted mb-3">{entries.length} implemented</p>
      <div className="space-y-3">
        {displayedEntries.map((entry) => (
          <div
            key={entry.id}
            className="card border-l-2 border-l-green-500"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground break-words leading-snug">
                  {entry.suggestion_content}
                </p>
                {entry.ai_note && (
                  <p className="text-xs text-muted italic mt-2 pl-3 border-l-2 border-green-300 dark:border-green-700">
                    {entry.ai_note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {entry.votes_when_implemented}
                  </span>
                  <span>{formatDate(entry.implemented_at)}</span>
                  {entry.commit_hash && (
                    <code className="bg-neutral-100 dark:bg-neutral-700 px-1 rounded text-xs">
                      {entry.commit_hash.slice(0, 7)}
                    </code>
                  )}
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
              View {entries.length - ITEMS_TO_SHOW} more
            </>
          )}
        </button>
      )}
    </div>
  )
}
