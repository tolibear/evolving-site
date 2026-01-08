import crypto from 'crypto'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { checkRateLimitDb, cleanupExpiredRateLimits } from '@/lib/db'

/**
 * Shadcn utility for merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
 * In-memory rate limiter (fallback for sync contexts)
 * For API routes, use checkRateLimitAsync which uses database-backed storage
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: record.resetTime - now
  }
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

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
