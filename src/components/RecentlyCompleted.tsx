'use client'

import useSWR from 'swr'
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

export default function RecentlyCompleted() {
  const { data: entries } = useSWR<ChangelogEntry[]>(
    '/api/changelog?limit=3&contributors=true',
    fetcher,
    { refreshInterval: 30000 }
  )

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
