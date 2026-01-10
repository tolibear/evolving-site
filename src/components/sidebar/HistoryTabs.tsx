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
}

interface DeniedEntry {
  id: number
  content: string
  votes: number
  implemented_at: string
  ai_note: string | null
}

interface UnifiedHistoryItem {
  id: string // unique key combining type + id
  suggestion_id: number
  content: string
  votes: number
  date: string
  ai_note: string | null
  commit_hash: string | null
  status: 'implemented' | 'denied'
}

export function HistoryTabs() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<UnifiedHistoryItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [changelogRes, deniedRes] = await Promise.all([
        fetch('/api/changelog'),
        fetch('/api/denied'),
      ])

      const changelog: ChangelogEntry[] = await changelogRes.json()
      const denied: DeniedEntry[] = await deniedRes.json()

      // Normalize changelog entries
      const implementedItems: UnifiedHistoryItem[] = changelog.map((entry) => ({
        id: `implemented-${entry.id}`,
        suggestion_id: entry.suggestion_id,
        content: entry.suggestion_content,
        votes: entry.votes_when_implemented,
        date: entry.implemented_at,
        ai_note: entry.ai_note,
        commit_hash: entry.commit_hash,
        status: 'implemented' as const,
      }))

      // Normalize denied entries
      const deniedItems: UnifiedHistoryItem[] = denied.map((entry) => ({
        id: `denied-${entry.id}`,
        suggestion_id: entry.id,
        content: entry.content,
        votes: entry.votes,
        date: entry.implemented_at,
        ai_note: entry.ai_note,
        commit_hash: null,
        status: 'denied' as const,
      }))

      // Merge and sort by date (most recent first)
      const merged = [...implementedItems, ...deniedItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      setItems(merged)
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const { displayedItems, hasMore, remainingCount, showAll, toggle } = useCollapsibleList(items || [])

  return (
    <div>
      {/* Collapse trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <span>History</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
              <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
            </div>
          ) : !items || items.length === 0 ? (
            <p className="text-muted text-sm text-center py-4">
              No history yet. Submit suggestions and vote!
            </p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <p className="text-xs text-muted mb-3">{items.length} total</p>
              <div className="space-y-3">
                {displayedItems.map((item) => (
                  <HistoryItem key={item.id} item={item} />
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
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryItem({ item }: { item: UnifiedHistoryItem }) {
  const isImplemented = item.status === 'implemented'

  return (
    <div
      className={`card border-l-2 ${
        isImplemented
          ? 'border-l-green-500 bg-green-50/30 dark:bg-green-900/10'
          : 'border-l-red-500 bg-red-50/30 dark:bg-red-900/10'
      }`}
    >
      <div className="flex gap-3">
        {/* Status icon with vote count */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center justify-center w-6 h-6 rounded-full ${
              isImplemented
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}
          >
            {isImplemented ? (
              <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <span
            className={`text-xs font-semibold mt-0.5 ${
              isImplemented
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {item.votes}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isImplemented
                  ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40'
                  : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40'
              }`}
            >
              {isImplemented ? 'SHIPPED' : 'DENIED'}
            </span>
          </div>

          {/* Suggestion content */}
          <p
            className={`text-sm text-foreground break-words leading-snug line-clamp-2 ${
              !isImplemented ? 'line-through opacity-75' : ''
            }`}
          >
            {item.content}
          </p>

          {/* AI Note */}
          {item.ai_note && (
            <p
              className={`text-xs text-muted italic mt-1.5 pl-2 border-l-2 line-clamp-2 ${
                isImplemented
                  ? 'border-green-300 dark:border-green-700'
                  : 'border-red-300 dark:border-red-700'
              }`}
            >
              {item.ai_note}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{formatRelativeTime(item.date)}</span>
              {item.commit_hash && (
                <code className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1 rounded">
                  {item.commit_hash.slice(0, 7)}
                </code>
              )}
            </div>
            <span className="text-xs text-neutral-300 dark:text-neutral-600 font-mono select-none">
              #{item.suggestion_id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
