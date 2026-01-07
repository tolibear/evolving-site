import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const db = createClient({
  url: envVars.TURSO_DATABASE_URL,
  authToken: envVars.TURSO_AUTH_TOKEN,
})

async function main() {
  const suggestionId = 9
  const commitHash = '51882c3'
  const content = 'Make the vote arrow do a little wiggle dance when you click it, like it is happy to receive your vote'
  const votes = 0
  const aiNote = 'Added wiggle animation that triggers when voting. The arrow now rotates back and forth for 0.5 seconds after each vote action.'

  console.log('Marking suggestion #9 as implemented...')
  await db.execute({
    sql: "UPDATE suggestions SET status = 'implemented', implemented_at = datetime('now'), ai_note = ? WHERE id = ?",
    args: [aiNote, suggestionId],
  })

  console.log('Adding changelog entry...')
  await db.execute({
    sql: 'INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (?, ?, ?, ?, ?)',
    args: [suggestionId, content, votes, commitHash, aiNote],
  })

  console.log('Setting status to idle...')
  await db.execute({
    sql: "UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = ?, updated_at = datetime('now') WHERE id = 1",
    args: ['Implemented vote arrow wiggle animation! Awaiting next suggestion...'],
  })

  console.log('Done!')
}

main().catch(console.error)
