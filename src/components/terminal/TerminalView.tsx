'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'
import AnsiToHtml from 'ansi-to-html'
import { useTerminal } from './TerminalProvider'

// Create a single converter instance
const ansiConverter = new AnsiToHtml({
  fg: '#d4d4d4',
  bg: 'transparent',
  newline: true,
  escapeXML: true,
})
import { SessionPicker } from './SessionPicker'
import ActiveUserCounter from '@/components/ActiveUserCounter'

interface TerminalViewProps {
  className?: string
}

// Format milliseconds remaining into "Xm Ys" format
function formatCountdown(ms: number): string {
  if (ms <= 0) return ''
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `  Next check in: ${mins}m ${secs}s`
}

export function TerminalView({ className = '' }: TerminalViewProps) {
  const { lines, session, connectionStatus, state } = useTerminal()
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const [, setTick] = useState(0) // Force re-render for countdown updates

  // Check if there's an active countdown line
  const hasCountdown = lines.some(l => l.isCountdown)

  // Tick every second when there's a countdown to update display
  useEffect(() => {
    if (!hasCountdown) return

    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [hasCountdown])

  // Auto-scroll to bottom when new lines are added (for flex-col-reverse, bottom is scrollTop=0)
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length])

  // Detect manual scroll (user scrolling up disables auto-scroll)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50
    autoScrollRef.current = isAtBottom
  }

  const isLive = state.selectedSessionId === null
  const isActive = session?.status === 'active'

  return (
    <div className={`flex flex-col h-full bg-terminal-bg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-terminal-header border-b border-terminal-border">
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? isActive
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-green-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-terminal-text opacity-70 font-mono">
              {isLive ? (
                isActive ? (
                  'LIVE'
                ) : (
                  'Last Session'
                )
              ) : (
                'REPLAY'
              )}
            </span>
          </div>

          {/* Session picker */}
          <SessionPicker />
        </div>

        <div className="flex items-center gap-3">
          {session && (
            <span className="text-xs text-terminal-text opacity-50 font-mono">
              {session.suggestionId === 0 ? '🔄 Sync' : `#${session.suggestionId}`}
            </span>
          )}
          <ActiveUserCounter />
        </div>
      </div>

      {/* Terminal content - scrollable area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-[13px] leading-relaxed min-h-0"
        role="log"
        aria-label="Terminal output"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <div className="text-terminal-text opacity-50 text-center py-12 text-sm">
            {connectionStatus === 'connecting'
              ? 'Connecting...'
              : session
              ? 'Waiting for output...'
              : 'No terminal session available'}
          </div>
        ) : (
          <div className="terminal-output whitespace-pre-wrap text-terminal-text">
            {/* Combine all non-countdown content into a single continuous block */}
            {/* ansi-to-html with escapeXML:true is safe - only creates <span> tags with color styles */}
            <span
              dangerouslySetInnerHTML={{
                __html: ansiConverter.toHtml(
                  lines
                    .filter(line => !line.isCountdown)
                    .map(line => line.content)
                    .join('')
                ),
              }}
            />
            {/* Render countdown separately at the end */}
            {lines.find(line => line.isCountdown && line.targetTime) && (
              <span className="opacity-50">
                {formatCountdown(
                  (lines.find(line => line.isCountdown)?.targetTime || 0) - Date.now()
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer with session info */}
      {session && (
        <div className="px-3 py-1.5 bg-terminal-header border-t border-terminal-border text-xs text-terminal-text opacity-50 font-mono">
          <span>
            {session.status === 'active'
              ? 'Running...'
              : session.status === 'completed'
              ? 'Completed'
              : 'Failed'}
          </span>
          {lines.length > 0 && (
            <span className="ml-2">
              {lines.length} chunk{lines.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
