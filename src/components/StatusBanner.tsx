'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

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
  const [elapsedTime, setElapsedTime] = useState(0)

  const intervalMinutes = status?.interval_minutes || 10

  // Track state changes to show refresh prompt
  useEffect(() => {
    if (status?.state === 'completed' && lastState === 'deploying') {
      setShowRefreshPrompt(true)
      // Hide after 30 seconds
      const timer = setTimeout(() => setShowRefreshPrompt(false), 30000)
      return () => clearTimeout(timer)
    }
    if (status?.state) {
      setLastState(status.state)
    }
  }, [status?.state, lastState])

  // Track elapsed time when working or deploying
  useEffect(() => {
    if (status?.state === 'working' || status?.state === 'deploying') {
      const startTime = new Date(status.updated_at).getTime()
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedTime(elapsed)
      }
      updateElapsed()
      const interval = setInterval(updateElapsed, 1000)
      return () => clearInterval(interval)
    } else {
      setElapsedTime(0)
    }
  }, [status?.state, status?.updated_at])

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

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  const isAutomated = status?.automation_mode === 'automated'
  const isActive = status?.state === 'working' || status?.state === 'deploying'
  const isCompleted = status?.state === 'completed'

  // When idle, show minimal inline status
  if (!isActive && !isCompleted) {
    return (
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full h-2 w-2 bg-neutral-300 dark:bg-neutral-500 animate-pulse"></span>
          <span className="text-xs text-muted">
            {status?.message || 'Awaiting next suggestion...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              isAutomated
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
            }`}
            title={isAutomated ? 'Autonomous mode: implementing automatically' : 'Manual mode: owner approval required'}
          >
            {isAutomated ? 'AUTO' : 'MANUAL'}
          </span>
          {isAutomated && countdown && (
            <span className="text-xs text-muted">
              {countdown}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Active implementation or just completed - show prominent card
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

      {/* Active implementation card - replaces the form area */}
      <div className={`card mb-8 overflow-hidden ${
        status?.state === 'working'
          ? 'border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20'
          : status?.state === 'deploying'
            ? 'border-2 border-blue-400 dark:border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20'
            : 'border-2 border-green-400 dark:border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20'
      }`}>
        {/* Progress bar */}
        <div className="h-1 bg-neutral-200 dark:bg-neutral-700">
          <div
            className={`h-full transition-all duration-1000 ${
              status?.state === 'working'
                ? 'bg-amber-500 animate-progress-working'
                : status?.state === 'deploying'
                  ? 'bg-blue-500 animate-progress-deploying'
                  : 'bg-green-500 w-full'
            }`}
          />
        </div>

        <div className="p-6">
          {/* Status header */}
          <div className="flex items-center gap-3 mb-4">
            {status?.state === 'working' && (
              <>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
                <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">Claude is working...</span>
              </>
            )}
            {status?.state === 'deploying' && (
              <>
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                </span>
                <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">Deploying to Vercel...</span>
              </>
            )}
            {status?.state === 'completed' && (
              <>
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">Feature Deployed!</span>
              </>
            )}
            <span className="ml-auto text-sm text-muted">
              {elapsedTime > 0 && formatElapsedTime(elapsedTime)}
            </span>
          </div>

          {/* Status message */}
          <p className="text-sm mb-4">
            {status?.message || 'Processing...'}
          </p>

          {/* Phase indicators */}
          <div className="flex items-center gap-2 text-xs">
            <PhaseIndicator
              label="Starting"
              active={status?.state === 'working' && elapsedTime < 5}
              completed={status?.state === 'working' && elapsedTime >= 5 || status?.state === 'deploying' || status?.state === 'completed'}
            />
            <PhaseConnector completed={status?.state === 'working' && elapsedTime >= 5 || status?.state === 'deploying' || status?.state === 'completed'} />
            <PhaseIndicator
              label="Implementing"
              active={status?.state === 'working' && elapsedTime >= 5}
              completed={status?.state === 'deploying' || status?.state === 'completed'}
            />
            <PhaseConnector completed={status?.state === 'deploying' || status?.state === 'completed'} />
            <PhaseIndicator
              label="Deploying"
              active={status?.state === 'deploying'}
              completed={status?.state === 'completed'}
            />
            <PhaseConnector completed={status?.state === 'completed'} />
            <PhaseIndicator
              label="Done"
              active={status?.state === 'completed'}
              completed={false}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function PhaseIndicator({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
      active
        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium'
        : completed
          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
          : 'bg-neutral-100 dark:bg-neutral-800 text-muted'
    }`}>
      {completed && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      {active && !completed && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
      )}
      {label}
    </div>
  )
}

function PhaseConnector({ completed }: { completed: boolean }) {
  return (
    <div className={`w-4 h-0.5 transition-colors ${
      completed ? 'bg-green-400 dark:bg-green-600' : 'bg-neutral-200 dark:bg-neutral-700'
    }`} />
  )
}
