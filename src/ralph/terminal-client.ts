/**
 * TerminalClient - Handles pushing terminal output to the API
 */

import type { RalphConfig } from './types'

export class TerminalClient {
  private readonly apiUrl: string
  private readonly apiSecret: string

  constructor(config: RalphConfig) {
    this.apiUrl = config.apiUrl
    this.apiSecret = config.apiSecret
  }

  /**
   * Start a new terminal session
   */
  async startSession(suggestionId: number): Promise<string> {
    const response = await fetch(`${this.apiUrl}/api/terminal/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.apiSecret,
      },
      body: JSON.stringify({
        action: 'start',
        suggestionId,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to start terminal session: ${error}`)
    }

    const data = await response.json()
    return data.sessionId
  }

  /**
   * Push a chunk of terminal output
   */
  async pushChunk(sessionId: string, sequence: number, content: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/terminal/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.apiSecret,
      },
      body: JSON.stringify({
        sessionId,
        sequence,
        content, // Already base64 encoded by StreamBuffer
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to push terminal chunk: ${error}`)
    }
  }

  /**
   * End a terminal session
   */
  async endSession(sessionId: string, status: 'completed' | 'failed'): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/terminal/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.apiSecret,
      },
      body: JSON.stringify({
        action: 'end',
        sessionId,
        status,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to end terminal session: ${error}`)
    }
  }
}
