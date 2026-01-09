'use client'

import { useEffect, useState } from 'react'

export default function ActiveUserCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    // Send heartbeat and get count
    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/active-users', { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
        }
      } catch {
        // Silently fail - not critical
      }
    }

    // Initial heartbeat
    sendHeartbeat()

    // Send heartbeat every 15 seconds
    const interval = setInterval(sendHeartbeat, 15000)

    return () => clearInterval(interval)
  }, [])

  // Don't show anything until we have data, and hide if only 1 user (just you)
  if (count === null || count < 1) {
    return null
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20"
      title="Active viewers right now"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        {count} {count === 1 ? 'viewer' : 'viewers'}
      </span>
    </span>
  )
}
