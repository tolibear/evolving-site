import { NextResponse } from 'next/server'
import {
  getTerminalChunks,
  getActiveTerminalSession,
  getLatestTerminalSession,
  getTerminalSession,
  getAllTerminalChunks,
  getStatus,
} from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/terminal/stream - SSE endpoint for streaming terminal output
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedSessionId = searchParams.get('sessionId')
  const fromSequence = parseInt(searchParams.get('fromSequence') || '-1', 10)
  const replay = searchParams.get('replay') === 'true'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        // Determine which session to stream
        let sessionId = requestedSessionId
        let session = null

        if (sessionId) {
          session = await getTerminalSession(sessionId)
        } else {
          // Try active session first, then latest
          session = await getActiveTerminalSession()
          if (!session) {
            session = await getLatestTerminalSession()
          }
          sessionId = session?.id || null
        }

        // Send initial session info
        if (session) {
          sendEvent('session', {
            id: session.id,
            suggestionId: session.suggestion_id,
            status: session.status,
            startedAt: session.started_at,
            endedAt: session.ended_at,
          })

          // If replay mode or session is not active, send all chunks at once
          if (replay || session.status !== 'active') {
            const allChunks = await getAllTerminalChunks(session.id)
            for (const chunk of allChunks) {
              sendEvent('chunk', {
                sessionId: chunk.session_id,
                sequence: chunk.sequence,
                content: chunk.content,
              })
            }
            sendEvent('replay_complete', { sessionId: session.id })
            controller.close()
            return
          }

          // For active sessions, send catch-up chunks first
          if (fromSequence >= 0) {
            const catchUpChunks = await getTerminalChunks(session.id, fromSequence)
            for (const chunk of catchUpChunks) {
              sendEvent('chunk', {
                sessionId: chunk.session_id,
                sequence: chunk.sequence,
                content: chunk.content,
              })
            }
          } else {
            // Send all existing chunks for new connections
            const allChunks = await getAllTerminalChunks(session.id)
            for (const chunk of allChunks) {
              sendEvent('chunk', {
                sessionId: chunk.session_id,
                sequence: chunk.sequence,
                content: chunk.content,
              })
            }
          }
        } else {
          sendEvent('no_session', { message: 'No terminal session available' })
        }

        // Start polling for new chunks
        let lastSequence = fromSequence
        let heartbeatCount = 0
        let lastCountdownSent: string | null = null // Track last sent countdown to avoid duplicates
        const POLL_INTERVAL = 200 // 200ms
        const HEARTBEAT_INTERVAL = 30000 / POLL_INTERVAL // Every 30 seconds
        const COUNTDOWN_CHECK_INTERVAL = 5000 / POLL_INTERVAL // Check countdown every 5 seconds
        const MAX_DURATION = 5 * 60 * 1000 / POLL_INTERVAL // 5 minutes max
        let countdownCheckCount = 0

        // Send initial countdown status
        try {
          const initialStatus = await getStatus()
          if (initialStatus.next_check_at) {
            sendEvent('countdown', {
              targetTime: initialStatus.next_check_at,
              message: initialStatus.message || 'Waiting...',
            })
            lastCountdownSent = initialStatus.next_check_at
          }
        } catch {
          // Ignore status fetch errors
        }

        for (let i = 0; i < MAX_DURATION; i++) {
          // Check if client disconnected
          if (request.signal.aborted) {
            break
          }

          // Get current session status
          const currentSession = sessionId ? await getTerminalSession(sessionId) : await getActiveTerminalSession()

          if (!currentSession) {
            // Session ended or doesn't exist
            await sleep(POLL_INTERVAL)
            heartbeatCount++

            // Check for new active session
            const newActiveSession = await getActiveTerminalSession()
            if (newActiveSession && newActiveSession.id !== sessionId) {
              sessionId = newActiveSession.id
              lastSequence = -1
              sendEvent('session', {
                id: newActiveSession.id,
                suggestionId: newActiveSession.suggestion_id,
                status: newActiveSession.status,
                startedAt: newActiveSession.started_at,
              })
            }
          } else {
            // Get new chunks
            const newChunks = await getTerminalChunks(currentSession.id, lastSequence)
            for (const chunk of newChunks) {
              sendEvent('chunk', {
                sessionId: chunk.session_id,
                sequence: chunk.sequence,
                content: chunk.content,
              })
              lastSequence = Math.max(lastSequence, chunk.sequence)
            }

            // Check if session ended
            if (currentSession.status !== 'active') {
              sendEvent('session_end', {
                sessionId: currentSession.id,
                status: currentSession.status,
                endedAt: currentSession.ended_at,
              })
              // Keep connection open for potential new session
            }
          }

          // Send heartbeat periodically
          heartbeatCount++
          if (heartbeatCount >= HEARTBEAT_INTERVAL) {
            sendEvent('heartbeat', {
              timestamp: new Date().toISOString(),
              activeSessionId: sessionId,
            })
            heartbeatCount = 0
          }

          // Check countdown status periodically (every 5 seconds)
          countdownCheckCount++
          if (countdownCheckCount >= COUNTDOWN_CHECK_INTERVAL) {
            countdownCheckCount = 0
            try {
              const status = await getStatus()
              if (status.next_check_at !== lastCountdownSent) {
                if (status.next_check_at) {
                  sendEvent('countdown', {
                    targetTime: status.next_check_at,
                    message: status.message || 'Waiting...',
                  })
                } else {
                  sendEvent('countdown_clear', {})
                }
                lastCountdownSent = status.next_check_at
              }
            } catch {
              // Ignore status fetch errors
            }
          }

          await sleep(POLL_INTERVAL)
        }

        // Max duration reached
        sendEvent('timeout', { message: 'Stream timeout, please reconnect' })
        controller.close()
      } catch (error) {
        console.error('SSE stream error:', error)
        sendEvent('error', { message: 'Stream error occurred' })
        controller.close()
      }
    },
    cancel() {
      // Client disconnected
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
