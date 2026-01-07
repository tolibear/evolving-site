import { NextResponse } from 'next/server'
import { updateSuggestionStatus, addChangelogEntry, updateStatus, grantVotesToAllUsers } from '@/lib/db'
import db from '@/lib/db'

// Force dynamic - no caching (v3 - finalize suggestion #13)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/migrate - Run pending migrations (finalize suggestion #13: brown mode)
export async function GET() {
  try {
    const results: string[] = []

    // Migration for suggestion #13: Brown mode
    const suggestionId = 13
    const content = 'In addition to light and dark mode, add brown mode'
    const votes = 1
    const aiNote = 'Added brown mode as a third theme option. Click the theme toggle to cycle through light, dark, and brown. Uses warm earth tones with amber/brown color palette.'
    const commitHash = '4ec78b8'

    // Check if already implemented
    const existing = await db.execute({
      sql: 'SELECT status FROM suggestions WHERE id = ?',
      args: [suggestionId],
    })

    if (existing.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: `Suggestion ${suggestionId} not found`,
        version: 'v3'
      })
    }

    if (existing.rows[0].status === 'implemented') {
      return NextResponse.json({
        success: true,
        message: `Suggestion ${suggestionId} already implemented`,
        version: 'v3'
      })
    }

    // Check if changelog entry already exists
    const changelogCheck = await db.execute({
      sql: 'SELECT id FROM changelog WHERE suggestion_id = ?',
      args: [suggestionId],
    })

    // Update suggestion status
    await updateSuggestionStatus(suggestionId, 'implemented', aiNote)
    results.push(`Updated suggestion ${suggestionId} to implemented`)

    // Add changelog entry only if it doesn't exist
    if (changelogCheck.rows.length === 0) {
      await addChangelogEntry(suggestionId, content, votes, commitHash, aiNote)
      results.push('Added changelog entry')

      // Grant 2 votes to all users (only if this is a new implementation)
      await grantVotesToAllUsers(2)
      results.push('Granted 2 votes to all users')
    } else {
      results.push('Changelog entry already exists, skipping vote grant')
    }

    // Set status back to idle
    await updateStatus(null, 'idle', 'Awaiting next suggestion...')
    results.push('Set status to idle')

    return NextResponse.json({
      success: true,
      message: `Suggestion ${suggestionId} finalized as implemented`,
      results,
      version: 'v3'
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error), version: 'v3' },
      { status: 500 }
    )
  }
}
