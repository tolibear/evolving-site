'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function StatusBanner() {
  const { data: status, error } = useSWR<Status>(
    '/api/status',
    fetcher,
    { refreshInterval: 10000 } // Refresh every 10 seconds
  )

  const [countdown, setCountdown] = useState('')

  // Calculate countdown to next hour for automated mode
  useEffect(() => {
    if (status?.automation_mode !== 'automated' || status?.state === 'working') {
      setCountdown('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const nextHour = new Date(now)
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
      const diffMs = nextHour.getTime() - now.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffSecs = Math.floor((diffMs % 60000) / 1000)

      if (diffMins > 0) {
        setCountdown(`${diffMins}m ${diffSecs}s`)
      } else {
        setCountdown(`${diffSecs}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [status?.automation_mode, status?.state])

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

  const isAutomated = status?.automation_mode === 'automated'

  return (
    <div className={`rounded-lg border px-4 py-3 mb-8 flex items-center gap-3 ${getStateColor(status?.state || 'idle')}`}>
      {getStateIcon(status?.state || 'idle')}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {status?.message || 'Loading status...'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            isAutomated
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
          }`}
          title={isAutomated ? 'Autonomous mode: implementing hourly' : 'Manual mode: owner approval required'}
        >
          {isAutomated ? 'AUTO' : 'MANUAL'}
        </span>
        {isAutomated && countdown && status?.state !== 'working' && (
          <span className="text-xs opacity-60">
            next in {countdown}
          </span>
        )}
      </div>
    </div>
  )
}
