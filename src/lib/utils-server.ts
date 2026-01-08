import 'server-only'
import crypto from 'crypto'
import { checkRateLimitDb, cleanupExpiredRateLimits } from '@/lib/db'

/**
 * Create a hash from IP address and user agent for vote deduplication
 * This provides anonymous but consistent user identification
 */
export function createVoterHash(ip: string, userAgent: string): string {
  const data = `${ip}:${userAgent}`
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32)
}

/**
 * Get client IP from request headers
 * Handles various proxy headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback for development
  return '127.0.0.1'
}

/**
 * Database-backed rate limiter (distributed across server instances)
 * Use this for API routes to ensure rate limits work in multi-instance deployments
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  // Periodically cleanup expired records (1% chance per request)
  if (Math.random() < 0.01) {
    cleanupExpiredRateLimits().catch(() => {
      // Silently ignore cleanup errors
    })
  }

  return checkRateLimitDb(key, limit, windowMs)
}
