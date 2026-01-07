/**
 * Finalize a suggestion implementation by updating database
 *
 * Usage:
 *   npm run finalize -- <suggestionId> <status> "<content>" <votes> "<aiNote>" [commitHash] [iconType]
 *
 * Example:
 *   npm run finalize -- 12 implemented "Add dark mode" 5 "Added dark mode toggle with CSS variables" abc1234 theme
 *   npm run finalize -- 13 denied "Unsafe feature" 2 "Denied due to security concerns"
 *
 * Available icon types:
 *   UI: theme, layout, image, button, form
 *   Features: search, notification, settings, user, chat
 *   Data: list, chart, file, link, code
 *   Actions: add, edit, delete, share, vote
 *   System: security, speed, mobile, terminal
 *   Creative: animation, sound, time, magic, globe, bookmark, eye, puzzle,
 *             trophy, heart, rocket, palette, brain, shield, compass, zap,
 *             tag, cursor, refresh, icon
 *   Fallbacks: star, sparkle, dot, diamond, hexagon, flower
 */

// Load env vars BEFORE importing db module
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 4) {
    console.error('Usage: npm run finalize -- <suggestionId> <status> "<content>" <votes> "<aiNote>" [commitHash] [iconType]')
    console.error('')
    console.error('Arguments:')
    console.error('  suggestionId  - ID of the suggestion to finalize')
    console.error('  status        - "implemented" or "denied"')
    console.error('  content       - The suggestion content (for changelog)')
    console.error('  votes         - Number of votes the suggestion had')
    console.error('  aiNote        - Implementation notes')
    console.error('  commitHash    - (optional) Git commit hash')
    console.error('  iconType      - (optional) Icon type for the changelog entry')
    process.exit(1)
  }

  const suggestionId = parseInt(args[0])
  const status = args[1]
  const content = args[2]
  const votes = parseInt(args[3])
  const aiNote = args[4] || ''
  const commitHash = args[5] || null
  const iconType = args[6] || null

  if (isNaN(suggestionId)) {
    console.error('Error: suggestionId must be a number')
    process.exit(1)
  }

  if (status !== 'implemented' && status !== 'denied') {
    console.error('Error: status must be "implemented" or "denied"')
    process.exit(1)
  }

  // Dynamic import AFTER env vars are loaded
  const { updateSuggestionStatus, addChangelogEntry, updateStatus, grantVotesToAllUsers, grantBonusVoteToSupporters } = await import('../src/lib/db.js')

  console.log(`Finalizing suggestion ${suggestionId} as ${status}...`)

  // Update suggestion status
  await updateSuggestionStatus(suggestionId, status, aiNote)
  console.log(`✓ Updated suggestion status to "${status}"`)

  // Add changelog entry if implemented
  if (status === 'implemented') {
    await addChangelogEntry(suggestionId, content, votes, commitHash, aiNote, iconType ?? undefined)
    console.log(`✓ Added changelog entry${iconType ? ` with icon: ${iconType}` : ''}`)

    // Grant bonus vote (+1) to users who upvoted this suggestion
    const bonusCount = await grantBonusVoteToSupporters(suggestionId)
    console.log(`✓ Granted +1 bonus vote to ${bonusCount} supporters`)

    // Reset all users' votes to 2 (the cap)
    await grantVotesToAllUsers(2)
    console.log('✓ Reset all users to 2 votes')
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
