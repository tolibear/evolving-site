// Ralph Agent Types

export interface RalphConfig {
  intervalMinutes: number
  apiUrl: string
  apiSecret: string
  projectDir: string
}

export interface Suggestion {
  id: number
  content: string
  votes: number
  status: 'pending' | 'in_progress' | 'implemented' | 'denied' | 'needs_input'
  created_at: string
  implemented_at: string | null
  ai_note: string | null
  author: string | null
  comment_count?: number
}

export interface RalphStatus {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
  interval_minutes: number
  next_check_at: string | null
}

export interface ImplementationResult {
  success: boolean
  suggestionId: number
  status: 'implemented' | 'denied' | 'needs_input' | 'failed'
  commitHash?: string
  aiNote: string
  error?: string
}

export interface FinalizeRequest {
  action: 'finalize'
  suggestionId: number
  status: 'implemented' | 'denied' | 'needs_input'
  content: string
  votes: number
  aiNote: string
  commitHash?: string
}

export interface SetModeRequest {
  action: 'setMode'
  mode: 'manual' | 'automated'
}

export interface SetIntervalRequest {
  action: 'setInterval'
  minutes: number
}

export type RalphApiRequest = FinalizeRequest | SetModeRequest | SetIntervalRequest
