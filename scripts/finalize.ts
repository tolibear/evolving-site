/**
 * Finalize a suggestion implementation by updating database
 *
 * Usage:
 *   npm run finalize -- <suggestionId> <status> "<content>" <votes> "<aiNote>" [commitHash]
 *
 * Example:
 *   npm run finalize -- 12 implemented "Add dark mode" 5 "Added dark mode toggle with CSS variables" abc1234
 *   npm run finalize -- 13 denied "Unsafe feature" 2 "Denied due to security concerns"
 */
import 'dotenv/config'
import { updateSuggestionStatus, addChangelogEntry, updateStatus, grantVotesToAllUsers } from '../src/lib/db.js'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 4) {
    console.error('Usage: npm run finalize -- <suggestionId> <status> "<content>" <votes> "<aiNote>" [commitHash]')
    console.error('')
    console.error('Arguments:')
    console.error('  suggestionId  - ID of the suggestion to finalize')
    console.error('  status        - "implemented" or "denied"')
    console.error('  content       - The suggestion content (for changelog)')
    console.error('  votes         - Number of votes the suggestion had')
    console.error('  aiNote        - Implementation notes')
    console.error('  commitHash    - (optional) Git commit hash')
    process.exit(1)
  }

  const suggestionId = parseInt(args[0])
  const status = args[1]
  const content = args[2]
  const votes = parseInt(args[3])
  const aiNote = args[4] || ''
  const commitHash = args[5] || null

  if (isNaN(suggestionId)) {
    console.error('Error: suggestionId must be a number')
    process.exit(1)
  }

  if (status !== 'implemented' && status !== 'denied') {
    console.error('Error: status must be "implemented" or "denied"')
    process.exit(1)
  }

  console.log(`Finalizing suggestion ${suggestionId} as ${status}...`)

  // Update suggestion status
  await updateSuggestionStatus(suggestionId, status, aiNote)
  console.log(`✓ Updated suggestion status to "${status}"`)

  // Add changelog entry if implemented
  if (status === 'implemented') {
    await addChangelogEntry(suggestionId, content, votes, commitHash, aiNote)
    console.log('✓ Added changelog entry')

    // Grant 2 votes to all users when a feature is implemented
    await grantVotesToAllUsers(2)
    console.log('✓ Granted 2 votes to all users')
  }

  // Set status back to idle
  await updateStatus(null, 'idle', 'Awaiting next suggestion...')
  console.log('✓ Set status back to idle')

  console.log(`\n✅ Suggestion ${suggestionId} finalized as ${status}`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
