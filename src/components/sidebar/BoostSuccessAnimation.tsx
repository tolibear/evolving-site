'use client'

import { useEffect, useState } from 'react'

interface BoostSuccessAnimationProps {
  from: number
  to: number
  onComplete: () => void
}

export function BoostSuccessAnimation({ from, to, onComplete }: BoostSuccessAnimationProps) {
  const [displayValue, setDisplayValue] = useState(from)

  useEffect(() => {
    // Count up animation
    const duration = 1200 // ms
    const steps = to - from
    if (steps <= 0) {
      onComplete()
      return
    }

    const stepDuration = Math.max(50, duration / steps) // At least 50ms per step

    let current = from
    const interval = setInterval(() => {
      current++
      setDisplayValue(current)
      if (current >= to) {
        clearInterval(interval)
        // Hold for a moment, then fade out
        setTimeout(onComplete, 1500)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [from, to, onComplete])

  const boostsAdded = to - from

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
        {/* Lightning icon */}
        <div className="relative mb-4">
          <svg
            className="w-12 h-12 mx-auto text-amber-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Counting number */}
        <div className="text-5xl font-bold text-foreground tabular-nums animate-count-pulse">
          {displayValue}
        </div>
        <p className="text-muted mt-1">
          {displayValue === 1 ? 'boost' : 'boosts'} ready
        </p>

        {/* Success message */}
        <p className="text-sm text-green-600 dark:text-green-400 mt-4 font-medium">
          +{boostsAdded} added
        </p>
      </div>
    </div>
  )
}
