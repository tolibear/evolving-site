'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { playSound } from '@/lib/sounds'

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'deploying' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
  interval_minutes: number
  next_check_at: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function StatusBanner() {
  const { data: status, error } = useSWR<Status>(
    '/api/status',
    fetcher,
    {
      // Poll faster when working/deploying, slower when idle
      refreshInterval: (data) => {
        if (data?.state === 'working' || data?.state === 'deploying') {
          return 2000 // Every 2 seconds during active work
        }
        return 10000 // Every 10 seconds when idle
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
      setShowRefreshPrompt(true)
      // Play notification sound for new deployment
      playSound('notification')
      // Hide after 30 seconds
      const timer = setTimeout(() => setShowRefreshPrompt(false), 30000)
      return () => clearTimeout(timer)
    }
    if (status?.state) {
      setLastState(status.state)
    }
  }, [status?.state, lastState])

  // Live countdown synced with server
  useEffect(() => {
    if (status?.state !== 'idle' || status?.automation_mode !== 'automated') {
      setCountdown('')
      return
    }

    // If no next_check_at, show the interval
    if (!status?.next_check_at) {
      setCountdown(`every ${intervalMinutes}m`)
      return
    }

    const updateCountdown = () => {
      const nextCheck = new Date(status.next_check_at!).getTime()
      const now = Date.now()
      const remaining = nextCheck - now

      if (remaining <= 0) {
        setCountdown('checking...')
        return
      }

      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)

      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${seconds}s`)
      }
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [status?.automation_mode, status?.state, status?.next_check_at, intervalMinutes])

  if (error) {
    return null // Silently fail - not critical
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'working':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200'
      case 'deploying':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200'
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
      case 'deploying':
        return (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
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
    <>
      {/* Refresh prompt overlay */}
      {showRefreshPrompt && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-bounce">
            <span className="text-xl">🎉</span>
            <span className="font-medium">New feature deployed!</span>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-green-600 px-3 py-1 rounded font-medium hover:bg-green-50 transition-colors"
            >
              Refresh Now
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

      {/* Status banner */}
      <div className={`rounded-lg border px-4 py-3 mb-8 flex items-center gap-3 ${getStateColor(status?.state || 'idle')}`}>
        {getStateIcon(status?.state || 'idle')}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {status?.message || 'Loading status...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${
              isAutomated
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
            }`}
            title={isAutomated ? 'Autonomous mode: implementing automatically' : 'Manual mode: owner approval required'}
          >
            {isAutomated
              ? (countdown && status?.state === 'idle' ? `auto builds in ${countdown}` : 'AUTO')
              : 'MANUAL'}
          </span>
        </div>
      </div>
    </>
  )
}
