import { NextResponse } from 'next/server'
import { updateSuggestionStatus, addChangelogEntry, updateStatus, grantVotesToAllUsers } from '@/lib/db'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'

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

    // Update suggestion status
    await updateSuggestionStatus(suggestionId, 'implemented', aiNote)
    results.push(`Updated suggestion ${suggestionId} to implemented`)

    // Add changelog entry
    await addChangelogEntry(suggestionId, content, votes, commitHash, aiNote)
    results.push('Added changelog entry')

    // Grant 2 votes to all users
    await grantVotesToAllUsers(2)
    results.push('Granted 2 votes to all users')

    // Set status back to idle
    await updateStatus(null, 'idle', 'Awaiting next suggestion...')
    results.push('Set status to idle')

    return NextResponse.json({
      success: true,
      message: `Suggestion ${suggestionId} finalized as implemented`,
      results
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    )
  }
}
