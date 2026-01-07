'use client'

import React, { useRef, useEffect } from 'react'
import Ansi from 'ansi-to-react'
import { useTerminal } from './TerminalProvider'
import { SessionPicker } from './SessionPicker'

interface TerminalViewProps {
  className?: string
}

export function TerminalView({ className = '' }: TerminalViewProps) {
  const { lines, session, connectionStatus, state } = useTerminal()
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

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

        {session && (
          <span className="text-xs text-terminal-text opacity-50 font-mono">
            #{session.suggestionId}
          </span>
        )}
      </div>

      {/* Terminal content - flex-col with justify-end for bottom-anchored content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 flex flex-col justify-end overflow-y-auto overflow-x-hidden p-4 font-mono text-[13px] leading-relaxed"
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
          <div className="terminal-output">
            {lines.map((line) => (
              <div
                key={line.id}
                className="whitespace-pre-wrap text-terminal-text"
              >
                <Ansi>{line.content}</Ansi>
              </div>
            ))}
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
