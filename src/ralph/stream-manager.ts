/**
 * Stream Manager - Global state for terminal output streaming
 *
 * This module manages a global stream buffer that both Ralph's UI functions
 * and Claude's output can write to, ensuring all terminal activity is
 * streamed to the web terminal.
 */

import { StreamBuffer } from './stream-buffer'
import { TerminalClient } from './terminal-client'
import { getRalphConfig } from './config'

// Global stream state
let globalBuffer: StreamBuffer | null = null
let globalClient: TerminalClient | null = null
let globalSessionId: string | null = null

/**
 * Get or create the terminal client singleton
 */
function getClient(): TerminalClient {
  if (!globalClient) {
    const config = getRalphConfig()
    globalClient = new TerminalClient(config)
  }
  return globalClient
}

/**
 * Initialize a new streaming session
 * Should be called before any logging that should be streamed
 */
export async function initializeStream(suggestionId: number): Promise<string | null> {
  try {
    const client = getClient()
    globalSessionId = await client.startSession(suggestionId)

    // Create buffer that pushes to the API
    globalBuffer = new StreamBuffer(async (sequence, content) => {
      if (globalSessionId) {
        try {
          await client.pushChunk(globalSessionId, sequence, content)
        } catch (error) {
          // Log but don't break - streaming failures shouldn't stop implementation
          console.error('Stream push error:', error)
        }
      }
    })

    return globalSessionId
  } catch (error) {
    console.error('Failed to initialize stream:', error)
    return null
  }
}

/**
 * Write data to the global stream buffer
 * Safe to call even if stream is not initialized (will be a no-op)
 */
export function writeToStream(data: string | Buffer): void {
  if (globalBuffer) {
    globalBuffer.write(data)
  }
}

/**
 * Get the current session ID
 */
export function getCurrentSessionId(): string | null {
  return globalSessionId
}

/**
 * Get the global buffer (for direct usage in runClaude)
 */
export function getGlobalBuffer(): StreamBuffer | null {
  return globalBuffer
}

/**
 * Close the stream and mark session as completed/failed
 */
export async function closeStream(status: 'completed' | 'failed'): Promise<void> {
  // Flush remaining buffer content
  if (globalBuffer) {
    await globalBuffer.close()
    globalBuffer = null
  }

  // End the session
  if (globalSessionId && globalClient) {
    try {
      await globalClient.endSession(globalSessionId, status)
    } catch (error) {
      console.error('Failed to close stream session:', error)
    }
  }

  globalSessionId = null
}

/**
 * Check if stream is active
 */
export function isStreamActive(): boolean {
  return globalBuffer !== null && globalSessionId !== null
}
