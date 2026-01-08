/**
 * Fix leaderboard issues by linking suggestions to users and distributing rep
 *
 * Usage:
 *   npm run fix-leaderboard -- list-orphans     # List implemented suggestions with no user_id
 *   npm run fix-leaderboard -- list-users       # List all users
 *   npm run fix-leaderboard -- link <suggestionId> <userId>  # Link suggestion to user
 *   npm run fix-leaderboard -- distribute <suggestionId>     # Distribute rep for suggestion
 */

// Load env vars BEFORE importing db module
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@libsql/client'

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  if (command === 'list-orphans') {
    // List implemented suggestions with no user_id
    const result = await db.execute({
      sql: `SELECT id, content, user_id, votes, status, created_at
            FROM suggestions
            WHERE status = 'implemented' AND user_id IS NULL
            ORDER BY id DESC`,
      args: [],
    })

    console.log('\n📋 Implemented suggestions with no user_id:')
    console.log('━'.repeat(60))

    if (result.rows.length === 0) {
      console.log('None found! All implemented suggestions have user_id set.')
    } else {
      for (const row of result.rows) {
        console.log(`#${row.id} - ${row.content}`)
        console.log(`   Votes: ${row.votes}, Status: ${row.status}`)
        console.log(`   Created: ${row.created_at}`)
        console.log('')
      }
    }
  } else if (command === 'list-users') {
    // List all users
    const result = await db.execute({
      sql: `SELECT id, twitter_username, twitter_name, created_at
            FROM users
            ORDER BY id DESC
            LIMIT 50`,
      args: [],
    })

    console.log('\n👥 Users (most recent 50):')
    console.log('━'.repeat(60))

    for (const row of result.rows) {
      console.log(`ID ${row.id}: @${row.twitter_username} (${row.twitter_name || 'no name'})`)
    }
  } else if (command === 'link') {
    const suggestionId = parseInt(args[1])
    const userId = parseInt(args[2])

    if (isNaN(suggestionId) || isNaN(userId)) {
      console.error('Usage: npm run fix-leaderboard -- link <suggestionId> <userId>')
      process.exit(1)
    }

    // Verify suggestion exists
    const suggestion = await db.execute({
      sql: 'SELECT id, content, user_id FROM suggestions WHERE id = ?',
      args: [suggestionId],
    })

    if (suggestion.rows.length === 0) {
      console.error(`Error: Suggestion #${suggestionId} not found`)
      process.exit(1)
    }

    if (suggestion.rows[0].user_id !== null) {
      console.error(`Error: Suggestion #${suggestionId} already has user_id: ${suggestion.rows[0].user_id}`)
      process.exit(1)
    }

    // Verify user exists
    const user = await db.execute({
      sql: 'SELECT id, twitter_username FROM users WHERE id = ?',
      args: [userId],
    })

    if (user.rows.length === 0) {
      console.error(`Error: User #${userId} not found`)
      process.exit(1)
    }

    // Update suggestion
    await db.execute({
      sql: 'UPDATE suggestions SET user_id = ? WHERE id = ?',
      args: [userId, suggestionId],
    })

    console.log(`✓ Linked suggestion #${suggestionId} to user @${user.rows[0].twitter_username} (ID: ${userId})`)
    console.log('')
    console.log('Next step: Run reputation distribution:')
    console.log(`  npm run fix-leaderboard -- distribute ${suggestionId}`)
  } else if (command === 'distribute') {
    const suggestionId = parseInt(args[1])

    if (isNaN(suggestionId)) {
      console.error('Usage: npm run fix-leaderboard -- distribute <suggestionId>')
      process.exit(1)
    }

    // Dynamic import AFTER env vars are loaded
    const { distributeRepForImplementation } = await import('../src/lib/reputation.js')

    console.log(`Distributing reputation for suggestion #${suggestionId}...`)

    const result = await distributeRepForImplementation(suggestionId)

    console.log('✓ Reputation distributed:')
    console.log(`  - Suggester (user ${result.suggesterId}): +${result.suggesterRep} rep`)
    console.log(`  - ${result.voterCount} voters received rep (total: ${result.totalVoterRep})`)

    if (result.suggesterId === null) {
      console.log('')
      console.log('⚠ Note: No suggester received rep. Make sure to link the suggestion to a user first:')
      console.log(`  npm run fix-leaderboard -- link ${suggestionId} <userId>`)
    }
  } else if (command === 'add-rep') {
    const userId = parseInt(args[1])
    const amount = parseInt(args[2])

    if (isNaN(userId) || isNaN(amount)) {
      console.error('Usage: npm run fix-leaderboard -- add-rep <userId> <amount>')
      process.exit(1)
    }

    // Dynamic import AFTER env vars are loaded
    const { addReputation } = await import('../src/lib/reputation.js')

    await addReputation(userId, amount)
    console.log(`✓ Added ${amount} rep to user ${userId}`)
  } else if (command === 'link-all') {
    // Link all orphan suggestions to a user (useful for initial setup)
    const userId = parseInt(args[1])

    if (isNaN(userId)) {
      console.error('Usage: npm run fix-leaderboard -- link-all <userId>')
      process.exit(1)
    }

    // Verify user exists
    const user = await db.execute({
      sql: 'SELECT id, twitter_username FROM users WHERE id = ?',
      args: [userId],
    })

    if (user.rows.length === 0) {
      console.error(`Error: User #${userId} not found`)
      process.exit(1)
    }

    // Get all orphan implemented suggestions
    const orphans = await db.execute({
      sql: `SELECT id, content FROM suggestions
            WHERE status = 'implemented' AND user_id IS NULL`,
      args: [],
    })

    if (orphans.rows.length === 0) {
      console.log('No orphan suggestions found!')
      process.exit(0)
    }

    console.log(`Linking ${orphans.rows.length} suggestions to @${user.rows[0].twitter_username}...`)

    for (const row of orphans.rows) {
      await db.execute({
        sql: 'UPDATE suggestions SET user_id = ? WHERE id = ?',
        args: [userId, row.id],
      })
      console.log(`  ✓ #${row.id}`)
    }

    console.log('')
    console.log(`✓ Linked ${orphans.rows.length} suggestions to user ${userId}`)
    console.log('')
    console.log('Next: Distribute rep for each suggestion:')
    console.log('  npm run fix-leaderboard -- distribute-all')
  } else if (command === 'distribute-all') {
    // Distribute rep for all implemented suggestions
    const { distributeRepForImplementation } = await import('../src/lib/reputation.js')

    const implemented = await db.execute({
      sql: `SELECT id FROM suggestions WHERE status = 'implemented'`,
      args: [],
    })

    console.log(`Distributing rep for ${implemented.rows.length} implemented suggestions...`)

    let totalSuggesterRep = 0
    let totalVoterRep = 0

    for (const row of implemented.rows) {
      const result = await distributeRepForImplementation(row.id as number)
      totalSuggesterRep += result.suggesterRep
      totalVoterRep += result.totalVoterRep
      console.log(`  #${row.id}: suggester +${result.suggesterRep}, voters +${result.totalVoterRep}`)
    }

    console.log('')
    console.log(`✓ Total rep distributed:`)
    console.log(`  - Suggesters: ${totalSuggesterRep}`)
    console.log(`  - Voters: ${totalVoterRep}`)
  } else {
    console.log('Fix Leaderboard Script')
    console.log('━'.repeat(40))
    console.log('')
    console.log('Usage:')
    console.log('  npm run fix-leaderboard -- list-orphans')
    console.log('    List implemented suggestions with no user_id')
    console.log('')
    console.log('  npm run fix-leaderboard -- list-users')
    console.log('    List all users')
    console.log('')
    console.log('  npm run fix-leaderboard -- link <suggestionId> <userId>')
    console.log('    Link a suggestion to a user')
    console.log('')
    console.log('  npm run fix-leaderboard -- link-all <userId>')
    console.log('    Link ALL orphan suggestions to a user')
    console.log('')
    console.log('  npm run fix-leaderboard -- distribute <suggestionId>')
    console.log('    Distribute reputation for a suggestion')
    console.log('')
    console.log('  npm run fix-leaderboard -- distribute-all')
    console.log('    Distribute reputation for ALL implemented suggestions')
    console.log('')
    console.log('  npm run fix-leaderboard -- add-rep <userId> <amount>')
    console.log('    Manually add reputation to a user')
  }

  db.close()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
