import crypto from 'crypto'

/**
 * Timing-safe comparison for API secret validation
 * Prevents timing attacks that could be used to brute-force the secret
 */
export function isValidRalphSecret(providedSecret: string | null): boolean {
  const expectedSecret = process.env.RALPH_API_SECRET

  // Both must exist
  if (!providedSecret || !expectedSecret) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSecret)
  const expectedBuffer = Buffer.from(expectedSecret)

  // If lengths differ, still do a comparison to avoid timing leak
  if (providedBuffer.length !== expectedBuffer.length) {
    // Compare against expected to maintain constant time
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Validate Ralph API secret from request headers
 * Returns true if valid, false otherwise
 */
export function validateRalphAuth(request: Request): boolean {
  const secret = request.headers.get('x-ralph-secret')
  return isValidRalphSecret(secret)
}

/**
 * Security event types for logging
 */
export type SecurityEventType =
  | 'auth_failure'
  | 'auth_success'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'

/**
 * Log a security event (to be stored in database)
 * This is a placeholder that will be integrated with db.ts
 */
export interface SecurityEvent {
  eventType: SecurityEventType
  ipAddress: string | null
  endpoint: string
  details?: string
}
