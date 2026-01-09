'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { useCollapsibleList } from '@/hooks/useCollapsibleList'

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

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog')
      const data = await res.json()
      setEntries(data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Call hook BEFORE any conditional returns (React rules of hooks)
  const { displayedItems, hasMore, remainingCount, showAll, toggle } = useCollapsibleList(entries || [])

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

  return (
    <div>
      <p className="text-xs text-muted mb-3">{entries.length} implemented</p>
      <div className="space-y-3">
        {displayedItems.map((entry) => (
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
                  <span>{formatRelativeTime(entry.implemented_at)}</span>
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
          onClick={toggle}
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
              View {remainingCount} more
            </>
          )}
        </button>
      )}
    </div>
  )
}
