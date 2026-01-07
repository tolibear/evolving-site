'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface TerminalLine {
  id: string
  content: string
  timestamp: number
}

export interface SessionInfo {
  id: string
  suggestionId: number
  status: 'active' | 'completed' | 'failed'
  startedAt: string
  endedAt?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface UseTerminalSSEOptions {
  sessionId?: string | null
  replay?: boolean
  enabled?: boolean
}

interface UseTerminalSSEReturn {
  lines: TerminalLine[]
  session: SessionInfo | null
  status: ConnectionStatus
  reconnect: () => void
  disconnect: () => void
  clearLines: () => void
}

export function useTerminalSSE(options: UseTerminalSSEOptions = {}): UseTerminalSSEReturn {
  const { sessionId = null, replay = false, enabled = true } = options

  const [lines, setLines] = useState<TerminalLine[]>([])
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSequenceRef = useRef<number>(-1)

  const clearLines = useCallback(() => {
    setLines([])
    lastSequenceRef.current = -1
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus('disconnected')
  }, [])

  const connect = useCallback(() => {
    // Don't connect if disabled
    if (!enabled) {
      return
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus('connecting')

    // Build URL with query params
    const params = new URLSearchParams()
    if (sessionId) {
      params.set('sessionId', sessionId)
    }
    if (lastSequenceRef.current >= 0) {
      params.set('fromSequence', lastSequenceRef.current.toString())
    }
    if (replay) {
      params.set('replay', 'true')
    }

    const url = `/api/terminal/stream?${params.toString()}`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setStatus('connected')
    }

    eventSource.onerror = () => {
      setStatus('error')
      eventSource.close()
      eventSourceRef.current = null

      // Reconnect after 5 seconds
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    }

    // Handle session info event
    eventSource.addEventListener('session', (event) => {
      try {
        const data = JSON.parse(event.data)
        setSession({
          id: data.id,
          suggestionId: data.suggestionId,
          status: data.status,
          startedAt: data.startedAt,
          endedAt: data.endedAt,
        })
        // Clear lines when switching to a new session
        if (data.id !== session?.id) {
          setLines([])
          lastSequenceRef.current = -1
        }
      } catch (error) {
        console.error('Failed to parse session event:', error)
      }
    })

    // Handle chunk event
    eventSource.addEventListener('chunk', (event) => {
      try {
        const data = JSON.parse(event.data)
        const { sequence, content } = data

        // Update last sequence
        lastSequenceRef.current = Math.max(lastSequenceRef.current, sequence)

        // Decode base64 content with proper UTF-8 support (for emojis etc)
        const decodedContent = new TextDecoder().decode(
          Uint8Array.from(atob(content), c => c.charCodeAt(0))
        )

        // Add new line
        setLines((prev) => [
          ...prev,
          {
            id: `${data.sessionId}-${sequence}`,
            content: decodedContent,
            timestamp: Date.now(),
          },
        ])
      } catch (error) {
        console.error('Failed to parse chunk event:', error)
      }
    })

    // Handle session end event
    eventSource.addEventListener('session_end', (event) => {
      try {
        const data = JSON.parse(event.data)
        setSession((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                endedAt: data.endedAt,
              }
            : null
        )
      } catch (error) {
        console.error('Failed to parse session_end event:', error)
      }
    })

    // Handle replay complete event
    eventSource.addEventListener('replay_complete', () => {
      // Replay is done, close connection
      eventSource.close()
      eventSourceRef.current = null
      setStatus('disconnected')
    })

    // Handle no session event
    eventSource.addEventListener('no_session', () => {
      setSession(null)
    })

    // Handle heartbeat (just to keep connection alive, no action needed)
    eventSource.addEventListener('heartbeat', () => {
      // Connection is alive
    })

    // Handle timeout
    eventSource.addEventListener('timeout', () => {
      eventSource.close()
      eventSourceRef.current = null
      // Auto-reconnect
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 1000)
      }
    })

    // Handle error events
    eventSource.addEventListener('error', (event) => {
      console.error('SSE error event:', event)
    })
  }, [enabled, sessionId, replay, session?.id])

  // Connect on mount and when options change
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  const reconnect = useCallback(() => {
    disconnect()
    connect()
  }, [disconnect, connect])

  return {
    lines,
    session,
    status,
    reconnect,
    disconnect,
    clearLines,
  }
}
