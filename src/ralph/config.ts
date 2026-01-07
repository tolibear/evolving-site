import { config } from 'dotenv'
import { resolve } from 'path'
import type { RalphConfig } from './types'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

export function getRalphConfig(): RalphConfig {
  return {
    intervalMinutes: parseInt(process.env.RALPH_INTERVAL_MINUTES || '10', 10),
    apiUrl: process.env.RALPH_API_URL || 'https://evolving-site.vercel.app',
    apiSecret: process.env.RALPH_API_SECRET || '',
    projectDir: process.cwd(),
  }
}

export function validateConfig(cfg: RalphConfig): string[] {
  const errors: string[] = []

  if (!cfg.apiSecret) {
    errors.push('RALPH_API_SECRET not set in .env.local')
  }

  if (cfg.intervalMinutes < 1 || cfg.intervalMinutes > 60) {
    errors.push('RALPH_INTERVAL_MINUTES must be between 1 and 60')
  }

  if (!cfg.apiUrl.startsWith('http')) {
    errors.push('RALPH_API_URL must be a valid URL')
  }

  return errors
}
