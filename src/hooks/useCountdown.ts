'use client'

import { useState, useEffect } from 'react'

/**
 * Hook that provides a countdown display string from a target time
 *
 * @param targetTime - ISO timestamp string to count down to (or null)
 * @param fallbackText - Text to show when no target time
 * @returns Formatted countdown string (e.g., "2m 30s", "45s", or fallbackText)
 */
export function useCountdown(
  targetTime: string | null,
  fallbackText: string = ''
): string {
  const [display, setDisplay] = useState(fallbackText)

  useEffect(() => {
    if (!targetTime) {
      setDisplay(fallbackText)
      return
    }

    const updateCountdown = () => {
      const now = Date.now()
      const target = new Date(targetTime).getTime()
      const diff = target - now

      if (diff <= 0) {
        setDisplay('now')
        return
      }

      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60

      if (minutes > 0) {
        setDisplay(`${minutes}m ${remainingSeconds}s`)
      } else {
        setDisplay(`${remainingSeconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [targetTime, fallbackText])

  return display
}
