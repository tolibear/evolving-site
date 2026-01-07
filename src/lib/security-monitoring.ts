/**
 * Security monitoring for Ralph agent activity
 * Logs and alerts on potentially sensitive operations
 */

import { logSecurityEvent } from './db'

// Sensitive file patterns that should trigger alerts
const SENSITIVE_FILE_PATTERNS = [
  /\.env/i,
  /credentials/i,
  /secrets?/i,
  /\.pem$/i,
  /\.key$/i,
  /password/i,
  /package\.json$/,
  /package-lock\.json$/,
  /\.npmrc$/,
  /\.git\/config$/,
  /next\.config\./,
  /tsconfig\.json$/,
]

// Dangerous command patterns
const DANGEROUS_COMMAND_PATTERNS = [
  /rm\s+-rf?\s+\//,  // Recursive delete from root
  /chmod\s+777/,      // Overly permissive permissions
  /curl.*\|\s*bash/,  // Piping curl to bash
  /wget.*\|\s*sh/,    // Piping wget to shell
  /eval\s*\(/,        // Eval execution
  /DROP\s+TABLE/i,    // SQL drop
  /DELETE\s+FROM\s+\w+\s*;?\s*$/i, // Unqualified delete
  /--force/,          // Force flags
  /--no-verify/,      // Skip verification
]

export interface RalphActivity {
  type: 'file_read' | 'file_write' | 'file_edit' | 'command' | 'tool_use'
  target: string // File path or command
  timestamp: Date
  sessionId?: string
}

/**
 * Check if a file path is sensitive
 */
export function isSensitiveFile(filePath: string): boolean {
  return SENSITIVE_FILE_PATTERNS.some(pattern => pattern.test(filePath))
}

/**
 * Check if a command is potentially dangerous
 */
export function isDangerousCommand(command: string): boolean {
  return DANGEROUS_COMMAND_PATTERNS.some(pattern => pattern.test(command))
}

/**
 * Log a Ralph agent activity
 * Automatically alerts on sensitive operations
 */
export async function logRalphActivity(activity: RalphActivity): Promise<void> {
  const details = JSON.stringify({
    target: activity.target,
    sessionId: activity.sessionId,
    timestamp: activity.timestamp.toISOString(),
  })

  // Determine if this is a suspicious activity
  let eventType = 'ralph_activity'

  if (activity.type === 'command' && isDangerousCommand(activity.target)) {
    eventType = 'suspicious_activity'
    console.warn(`[SECURITY] Dangerous command detected: ${activity.target}`)
  }

  if (
    (activity.type === 'file_read' || activity.type === 'file_write' || activity.type === 'file_edit') &&
    isSensitiveFile(activity.target)
  ) {
    eventType = 'suspicious_activity'
    console.warn(`[SECURITY] Sensitive file access: ${activity.type} ${activity.target}`)
  }

  // Log to database
  await logSecurityEvent(
    eventType,
    null, // IP not applicable for Ralph agent
    `ralph:${activity.type}`,
    details
  )
}

/**
 * Parse a Claude tool use event and log if relevant
 */
export async function monitorToolUse(
  toolName: string,
  input: Record<string, unknown>,
  sessionId?: string
): Promise<void> {
  const timestamp = new Date()

  switch (toolName) {
    case 'Read':
      if (input.file_path) {
        await logRalphActivity({
          type: 'file_read',
          target: String(input.file_path),
          timestamp,
          sessionId,
        })
      }
      break

    case 'Write':
      if (input.file_path) {
        await logRalphActivity({
          type: 'file_write',
          target: String(input.file_path),
          timestamp,
          sessionId,
        })
      }
      break

    case 'Edit':
      if (input.file_path) {
        await logRalphActivity({
          type: 'file_edit',
          target: String(input.file_path),
          timestamp,
          sessionId,
        })
      }
      break

    case 'Bash':
      if (input.command) {
        await logRalphActivity({
          type: 'command',
          target: String(input.command),
          timestamp,
          sessionId,
        })
      }
      break

    default:
      // Log other tool uses for audit purposes
      await logRalphActivity({
        type: 'tool_use',
        target: `${toolName}: ${JSON.stringify(input).slice(0, 200)}`,
        timestamp,
        sessionId,
      })
  }
}

/**
 * Get recent suspicious activities
 */
export async function getRecentSuspiciousActivities(limit: number = 50): Promise<unknown[]> {
  const { getSecurityEvents } = await import('./db')
  return getSecurityEvents(limit, 'suspicious_activity')
}
