'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/utils'

interface VoteAllowanceResponse {
  remainingVotes: number
  voterHash: string
}

export default function VoteAllowanceDisplay() {
  const { data, error, isLoading } = useSWR<VoteAllowanceResponse>(
    '/api/vote-allowance',
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted animate-pulse">
        <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const votes = data.remainingVotes

  return (
    <div className="flex items-center gap-2 text-sm">
      <svg
        className={`w-4 h-4 ${votes > 0 ? 'text-accent' : 'text-muted'}`}
        fill={votes > 0 ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
      <span className={votes > 0 ? 'text-foreground' : 'text-muted'}>
        <span className="font-semibold">{votes}</span>
        <span className="ml-1">{votes === 1 ? 'vote' : 'votes'} left</span>
      </span>
      {votes === 0 && (
        <span className="text-xs text-muted">
          (refills after next implementation)
        </span>
      )}
    </div>
  )
}
