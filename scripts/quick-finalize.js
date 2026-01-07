// Quick finalize script that uses dotenv to load .env.local
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@libsql/client')

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  const suggestionId = 13
  const status = 'implemented'
  const content = 'In addition to light and dark mode, add brown mode'
  const votes = 1
  const aiNote = 'Added brown mode as a third theme option. Click the theme toggle to cycle through light, dark, and brown. Uses warm earth tones with amber/brown color palette.'
  const commitHash = '4ec78b8'

  console.log(`Finalizing suggestion ${suggestionId} as ${status}...`)

  // Update suggestion status
  await db.execute({
    sql: `UPDATE suggestions SET status = ?, implemented_at = datetime('now'), ai_note = ? WHERE id = ?`,
    args: [status, aiNote, suggestionId],
  })
  console.log('✓ Updated suggestion status')

  // Add changelog entry
  await db.execute({
    sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (?, ?, ?, ?, ?)`,
    args: [suggestionId, content, votes, commitHash, aiNote],
  })
  console.log('✓ Added changelog entry')

  // Grant 2 votes to all users
  await db.execute({
    sql: `UPDATE vote_allowance SET remaining_votes = remaining_votes + 2, last_grant_at = datetime('now')`,
    args: [],
  })
  console.log('✓ Granted 2 votes to all users')

  // Set status back to idle
  await db.execute({
    sql: `UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = 'Awaiting next suggestion...', updated_at = datetime('now') WHERE id = 1`,
    args: [],
  })
  console.log('✓ Set status back to idle')

  console.log(`\n✅ Suggestion ${suggestionId} finalized as ${status}`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
