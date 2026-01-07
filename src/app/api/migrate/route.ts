import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// GET /api/migrate - Run pending migrations
export async function GET() {
  try {
    const aiNote = 'Added vote allowance system. New users start with 2 votes. Voting costs 1 vote, un-voting refunds it. All users receive 2 new votes when a feature is implemented.'

    // Check current status
    const beforeResult = await db.execute({
      sql: `SELECT id, status, implemented_at FROM suggestions WHERE id = 12`,
      args: [],
    })
    const before = beforeResult.rows[0]

    // Update suggestion #12 to implemented if still pending
    const updateResult = await db.execute({
      sql: `UPDATE suggestions SET status = 'implemented', implemented_at = COALESCE(implemented_at, datetime('now')), ai_note = COALESCE(ai_note, ?) WHERE id = 12 AND status = 'pending'`,
      args: [aiNote],
    })

    // Check after status
    const afterResult = await db.execute({
      sql: `SELECT id, status, implemented_at FROM suggestions WHERE id = 12`,
      args: [],
    })
    const after = afterResult.rows[0]

    return NextResponse.json({
      success: true,
      before,
      after,
      rowsAffected: updateResult.rowsAffected,
      message: updateResult.rowsAffected > 0
        ? 'Migration completed: suggestion #12 marked as implemented'
        : 'No changes needed: suggestion #12 already implemented or not found'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    )
  }
}
