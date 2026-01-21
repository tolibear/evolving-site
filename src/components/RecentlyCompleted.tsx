'use client'

import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import confetti from 'canvas-confetti'
import ContributorStack from './ContributorStack'
import { fetcher, formatRelativeTime } from '@/lib/utils'
import type { Submitter, Contributor } from '@/types'

interface ChangelogEntry {
  id: number
  suggestion_id: number
  suggestion_content: string
  votes_when_implemented: number
  implemented_at: string
  ai_note: string | null
  commit_hash: string | null
  submitter?: Submitter | null
  contributors?: Contributor[]
  contributorCount?: number
}

function triggerConfetti() {
  // Fire confetti from both sides
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  // Burst from left
  fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.2, y: 0.7 } })
  fire(0.2, { spread: 60, origin: { x: 0.2, y: 0.7 } })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.2, y: 0.7 } })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.2, y: 0.7 } })
  fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.2, y: 0.7 } })

  // Burst from right
  fire(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.8, y: 0.7 } })
  fire(0.2, { spread: 60, origin: { x: 0.8, y: 0.7 } })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { x: 0.8, y: 0.7 } })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { x: 0.8, y: 0.7 } })
  fire(0.1, { spread: 120, startVelocity: 45, origin: { x: 0.8, y: 0.7 } })
}

export default function RecentlyCompleted() {
  const { data: entries } = useSWR<ChangelogEntry[]>(
    '/api/changelog?limit=3&contributors=true',
    fetcher,
    { refreshInterval: 30000 }
  )

  // Track the latest entry ID to detect new completions
  const lastEntryIdRef = useRef<number | null>(null)
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    if (!entries || entries.length === 0) return

    const latestId = entries[0].id

    // Skip confetti on initial page load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      lastEntryIdRef.current = latestId
      return
    }

    // Trigger confetti when a new entry appears
    if (lastEntryIdRef.current !== null && latestId !== lastEntryIdRef.current) {
      triggerConfetti()
    }

    lastEntryIdRef.current = latestId
  }, [entries])

  if (!entries || entries.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
        Recently Shipped
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="card border-l-2 border-l-green-500 bg-green-50/30 dark:bg-green-900/10"
          >
            <div className="flex gap-3">
              {/* Vote count (shipped) */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30">
                  <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
                  {entry.votes_when_implemented}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Shipped badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded">
                    SHIPPED
                  </span>
                </div>

                {/* Suggestion content */}
                <p className="text-sm text-foreground break-words leading-snug line-clamp-2">
                  {entry.suggestion_content}
                </p>

                {/* AI Note */}
                {entry.ai_note && (
                  <p className="text-xs text-muted italic mt-1.5 pl-2 border-l-2 border-green-300 dark:border-green-700 line-clamp-2">
                    {entry.ai_note}
                  </p>
                )}

                {/* Byline: Contributors + metadata + number */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {(entry.submitter || (entry.contributors && entry.contributors.length > 0)) && (
                      <ContributorStack
                        submitter={entry.submitter ?? null}
                        contributors={entry.contributors || []}
                        totalCount={entry.contributorCount || 0}
                        compact
                      />
                    )}
                    <span className="text-xs text-muted">{formatRelativeTime(entry.implemented_at)}</span>
                    {entry.commit_hash && (
                      <code className="text-xs bg-neutral-100 dark:bg-neutral-700 px-1 rounded">
                        {entry.commit_hash.slice(0, 7)}
                      </code>
                    )}
                  </div>
                  <span className="text-xs text-neutral-300 dark:text-neutral-600 font-mono select-none">
                    #{entry.suggestion_id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
