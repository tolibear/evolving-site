'use client'

import useSWR from 'swr'

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function StatusBanner() {
  const { data: status, error } = useSWR<Status>(
    '/api/status',
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  )

  if (error) {
    return null // Silently fail - not critical
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'working':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
      case 'completed':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
      default:
        return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
    }
  }

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'working':
        return (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <span className="inline-flex rounded-full h-3 w-3 bg-neutral-300 dark:bg-neutral-500 pulse-dot"></span>
        )
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`rounded-lg border px-4 py-3 mb-8 flex items-center gap-3 ${getStateColor(status?.state || 'idle')}`}>
      {getStateIcon(status?.state || 'idle')}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {status?.message || 'Loading status...'}
        </p>
      </div>
      {status?.updated_at && (
        <span className="text-xs opacity-60">
          {formatTime(status.updated_at)}
        </span>
      )}
    </div>
  )
}
