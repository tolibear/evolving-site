import { NextResponse } from 'next/server'
import crypto from 'crypto'

// In-memory store for active users (cleared on server restart, which is fine)
// Key is user hash, value is last heartbeat timestamp
const activeUsers = new Map<string, number>()

// Users are considered active for 30 seconds after their last heartbeat
const ACTIVE_THRESHOLD_MS = 30000

// Clean up inactive users
function cleanupInactiveUsers() {
  const now = Date.now()
  activeUsers.forEach((lastSeen, hash) => {
    if (now - lastSeen > ACTIVE_THRESHOLD_MS) {
      activeUsers.delete(hash)
    }
  })
}

// Generate a hash from request headers for user identification
function getUserHash(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return crypto.createHash('sha256').update(`${ip}-${userAgent}`).digest('hex').slice(0, 16)
}

// GET /api/active-users - Get count of active users
export async function GET() {
  cleanupInactiveUsers()
  return NextResponse.json({ count: activeUsers.size })
}

// POST /api/active-users - Heartbeat to mark user as active
export async function POST(request: Request) {
  const userHash = getUserHash(request)
  activeUsers.set(userHash, Date.now())
  cleanupInactiveUsers()
  return NextResponse.json({ count: activeUsers.size })
}
