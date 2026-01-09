'use client'

import React, { useState, useEffect } from 'react'
import { useTerminal } from './TerminalProvider'
import { formatRelativeTime } from '@/lib/utils'

interface SessionMeta {
  id: string
  suggestion_id: number
  started_at: string
  ended_at: string | null
  status: 'active' | 'completed' | 'failed'
  chunkCount: number
  suggestionContent: string | null
}

export function SessionPicker() {
  const { state, selectSession, session } = useTerminal()
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch sessions when dropdown opens
  useEffect(() => {
    if (isOpen && sessions.length === 0) {
      setLoading(true)
      fetch('/api/terminal/sessions?limit=10')
        .then((res) => res.json())
        .then((data) => {
          setSessions(data.sessions || [])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, sessions.length])

  const isLive = state.selectedSessionId === null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-terminal-header text-terminal-text rounded border border-terminal-border hover:bg-opacity-80 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-blue-500'}`} />
        <span>{isLive ? 'Live' : 'Replay'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <ul
            role="listbox"
            className="absolute top-full left-0 mt-1 w-72 bg-terminal-bg border border-terminal-border rounded-lg shadow-xl z-50 overflow-hidden"
          >
            {/* Live option */}
            <li
              role="option"
              aria-selected={isLive}
              onClick={() => {
                selectSession(null)
                setIsOpen(false)
              }}
              className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 transition-colors ${
                isLive
                  ? 'bg-green-500/20 text-green-300'
                  : 'text-terminal-text hover:bg-terminal-header'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Live</span>
              {session?.status === 'active' && (
                <span className="ml-auto text-xs opacity-60">Active</span>
              )}
            </li>

            {/* Divider */}
            <li className="border-t border-terminal-border" aria-hidden="true" />

            {/* Past sessions */}
            {loading ? (
              <li className="px-3 py-4 text-center text-terminal-text opacity-50 text-sm">
                Loading sessions...
              </li>
            ) : sessions.length === 0 ? (
              <li className="px-3 py-4 text-center text-terminal-text opacity-50 text-sm">
                No past sessions
              </li>
            ) : (
              sessions.map((s) => (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={state.selectedSessionId === s.id}
                  onClick={() => {
                    selectSession(s.id)
                    setIsOpen(false)
                  }}
                  className={`px-3 py-2.5 cursor-pointer transition-colors ${
                    state.selectedSessionId === s.id
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-terminal-text hover:bg-terminal-header'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.status === 'completed'
                          ? 'bg-green-500'
                          : s.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <span className="font-medium text-sm truncate flex-1">
                      {s.suggestion_id === 0
                        ? '🔄 GitHub Sync'
                        : s.suggestionContent?.slice(0, 35) || `Session #${s.suggestion_id}`}
                      {s.suggestion_id !== 0 && s.suggestionContent && s.suggestionContent.length > 35 && '...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs opacity-60">
                    <span>{formatRelativeTime(s.started_at)}</span>
                    <span>·</span>
                    <span>{s.chunkCount} chunks</span>
                    <span>·</span>
                    <span className="capitalize">{s.status}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  )
}
