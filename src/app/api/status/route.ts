import { NextResponse } from 'next/server'
import { getStatus, updateStatus, setAutomationMode, setIntervalMinutes, setNextCheckAt } from '@/lib/db'
import { validateRalphAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/status - Get current Claude status
export async function GET() {
  try {
    const status = await getStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}

// POST /api/status - Update Claude status (called by Ralph loop)
// Requires authentication via x-ralph-secret header
export async function POST(request: Request) {
  try {
    // Validate internal API secret
    if (!validateRalphAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentSuggestionId, state, message, automationMode, nextCheckAt } = body

    // Handle automation mode update
    if (automationMode) {
      if (!['manual', 'automated'].includes(automationMode)) {
        return NextResponse.json(
          { error: 'Invalid automationMode. Must be: manual or automated' },
          { status: 400 }
        )
      }
      await setAutomationMode(automationMode)
      // If only setting mode, return early
      if (!state && !message && nextCheckAt === undefined) {
        return NextResponse.json({ message: 'Automation mode updated successfully' })
      }
    }

    // Handle next check time update
    if (nextCheckAt !== undefined) {
      await setNextCheckAt(nextCheckAt)
      // If only setting nextCheckAt, return early
      if (!state && !message) {
        return NextResponse.json({ message: 'Next check time updated successfully' })
      }
    }

    // Validate state
    if (state && !['idle', 'working', 'deploying', 'completed'].includes(state)) {
      return NextResponse.json(
        { error: 'Invalid state. Must be: idle, working, deploying, or completed' },
        { status: 400 }
      )
    }

    await updateStatus(
      currentSuggestionId ?? null,
      state ?? 'idle',
      message ?? 'Awaiting next suggestion...'
    )

    return NextResponse.json({ message: 'Status updated successfully' })
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
