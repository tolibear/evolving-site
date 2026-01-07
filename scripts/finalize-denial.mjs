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
  console.log('Setting status to working...')
  await db.execute({
    sql: "UPDATE status SET current_suggestion_id = 10, state = 'working', message = ?, updated_at = datetime('now') WHERE id = 1",
    args: ['Reviewing suggestion #10...'],
  })

  console.log('Denying suggestion #10 (test submission)...')
  await db.execute({
    sql: "UPDATE suggestions SET status = 'denied', implemented_at = datetime('now'), ai_note = ? WHERE id = 10",
    args: ['This is a test submission, not a legitimate feature request. Please submit actual feature ideas that would improve the site.'],
  })

  console.log('Setting status back to idle...')
  await db.execute({
    sql: "UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = ?, updated_at = datetime('now') WHERE id = 1",
    args: ['Denied test submission. Awaiting next suggestion...'],
  })

  console.log('Done! Suggestion #10 denied.')
}

main().catch(console.error)
