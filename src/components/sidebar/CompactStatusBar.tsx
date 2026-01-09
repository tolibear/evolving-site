'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { fetcher } from '@/lib/utils'

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'deploying' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
  interval_minutes: number
  next_check_at: string | null
}

export function CompactStatusBar() {
  const { data: status, error } = useSWR<Status>(
    '/api/status',
    fetcher,
    {
      refreshInterval: (data) => {
        if (data?.state === 'working' || data?.state === 'deploying') {
          return 2000
        }
        return 10000
      }
    }
  )

  const [countdown, setCountdown] = useState('')
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false)
  const [lastState, setLastState] = useState<string>('')

  const intervalMinutes = status?.interval_minutes || 10

  // Track state changes to show refresh prompt
  useEffect(() => {
    if (status?.state === 'completed' && lastState === 'deploying') {
      // Refresh suggestion and changelog lists immediately
      mutate('/api/suggestions')
      mutate('/api/changelog')
      setShowRefreshPrompt(true)
      const timer = setTimeout(() => setShowRefreshPrompt(false), 30000)
      return () => clearTimeout(timer)
    }
    if (status?.state) {
      setLastState(status.state)
    }
  }, [status?.state, lastState])

  // Live countdown
  useEffect(() => {
    if (status?.state !== 'idle' || status?.automation_mode !== 'automated') {
      setCountdown('')
      return
    }

    if (!status?.next_check_at) {
      setCountdown(`${intervalMinutes}m`)
      return
    }

    const updateCountdown = () => {
      const nextCheck = new Date(status.next_check_at!).getTime()
      const now = Date.now()
      const remaining = nextCheck - now

      if (remaining <= 0) {
        setCountdown('...')
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)

      if (minutes > 0) {
        setCountdown(`${minutes}m`)
      } else {
        setCountdown(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [status?.automation_mode, status?.state, status?.next_check_at, intervalMinutes])

  if (error) return null

  const getDotColor = (state: string) => {
    switch (state) {
      case 'working': return 'bg-amber-500'
      case 'deploying': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      default: return 'bg-neutral-400 dark:bg-neutral-500'
    }
  }

  const isAnimating = status?.state === 'working' || status?.state === 'deploying'
  const isAutomated = status?.automation_mode === 'automated'

  const getStatusText = () => {
    if (status?.state === 'working') {
      return status.current_suggestion_id
        ? `Implementing #${status.current_suggestion_id}`
        : 'Working...'
    }
    if (status?.state === 'deploying') return 'Deploying...'
    if (status?.state === 'completed') return 'Done'
    if (isAutomated && countdown) return `Next in ${countdown}`
    if (isAutomated) return 'Ready'
    return 'Manual'
  }

  return (
    <>
      {/* Refresh prompt overlay - keep the celebration */}
      {showRefreshPrompt && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
            <span className="text-xl">🎉</span>
            <span className="font-medium">New feature deployed!</span>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-green-600 px-3 py-1 rounded font-medium hover:bg-green-50 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowRefreshPrompt(false)}
              className="ml-2 text-green-200 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Compact inline status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isAnimating && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${getDotColor(status?.state || 'idle')} opacity-75`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${getDotColor(status?.state || 'idle')}`}></span>
        </span>
        <span className="text-xs text-muted truncate max-w-[140px]">
          {getStatusText()}
        </span>
      </div>
    </>
  )
}
