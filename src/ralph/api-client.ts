import type { RalphConfig, RalphStatus, Suggestion } from './types'

export class RalphApiClient {
  constructor(private config: RalphConfig) {}

  async getStatus(): Promise<RalphStatus> {
    const res = await fetch(`${this.config.apiUrl}/api/status`)
    if (!res.ok) {
      throw new Error(`Status fetch failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async getTopSuggestion(): Promise<Suggestion | null> {
    const res = await fetch(`${this.config.apiUrl}/api/suggestions`)
    if (!res.ok) {
      throw new Error(`Suggestions fetch failed: ${res.status} ${res.statusText}`)
    }
    const suggestions: Suggestion[] = await res.json()
    // Return the first suggestion with votes > 0
    return suggestions.find((s) => s.votes > 0) || null
  }

  async updateStatus(data: {
    state?: 'idle' | 'working' | 'completed'
    message?: string
    automationMode?: 'manual' | 'automated'
    currentSuggestionId?: number | null
    nextCheckAt?: string | null
  }): Promise<void> {
    const res = await fetch(`${this.config.apiUrl}/api/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.config.apiSecret,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Status update failed: ${res.status} - ${error}`)
    }
  }

  async finalize(data: {
    suggestionId: number
    status: 'implemented' | 'denied'
    content: string
    votes: number
    aiNote: string
    commitHash?: string
  }): Promise<void> {
    const res = await fetch(`${this.config.apiUrl}/api/ralph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.config.apiSecret,
      },
      body: JSON.stringify({
        action: 'finalize',
        ...data,
      }),
    })
    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Finalize failed: ${res.status} - ${error}`)
    }
  }

  async setMode(mode: 'manual' | 'automated'): Promise<void> {
    const res = await fetch(`${this.config.apiUrl}/api/ralph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.config.apiSecret,
      },
      body: JSON.stringify({
        action: 'setMode',
        mode,
      }),
    })
    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Set mode failed: ${res.status} - ${error}`)
    }
  }

  async setInterval(minutes: number): Promise<void> {
    const res = await fetch(`${this.config.apiUrl}/api/ralph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': this.config.apiSecret,
      },
      body: JSON.stringify({
        action: 'setInterval',
        minutes,
      }),
    })
    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Set interval failed: ${res.status} - ${error}`)
    }
  }
}
