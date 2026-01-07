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
  console.log('Updating status to working...')
  await db.execute({
    sql: "UPDATE status SET current_suggestion_id = ?, state = 'working', message = ?, updated_at = datetime('now') WHERE id = 1",
    args: [6, 'Reviewing top suggestions for safety and feasibility...'],
  })

  console.log('Denying suggestion #6 (Twitter login)...')
  await db.execute({
    sql: "UPDATE suggestions SET status = 'denied', implemented_at = datetime('now'), ai_note = ? WHERE id = 6",
    args: [
      "This suggestion requires implementing Twitter OAuth authentication, which is a complex architectural change that should be planned carefully with the site owner. Additionally, restricting suggestions to only logged-in Twitter users would exclude people who don't use Twitter - the site works better as an open platform. Consider submitting a simpler version, like 'Add optional Twitter sharing for implemented features'.",
    ],
  })

  console.log('Denying suggestion #10 (test submission)...')
  await db.execute({
    sql: "UPDATE suggestions SET status = 'denied', implemented_at = datetime('now'), ai_note = ? WHERE id = 10",
    args: ['This is a test submission, not a feature request.'],
  })

  console.log('Setting status back to idle...')
  await db.execute({
    sql: "UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = ?, updated_at = datetime('now') WHERE id = 1",
    args: [
      'Denied 2 suggestions: Twitter login (too complex/restrictive) and test submission. Awaiting next suggestion...',
    ],
  })

  console.log('Done!')
}

main().catch(console.error)
