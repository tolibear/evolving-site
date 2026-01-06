const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Update suggestion status
  await db.execute({
    sql: "UPDATE suggestions SET status = 'implemented', implemented_at = datetime('now'), ai_note = ? WHERE id = 5",
    args: ['Added expandable comments section to each suggestion card. Users can now add context for Claude to consider when implementing.']
  });

  // Add changelog entry
  await db.execute({
    sql: 'INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (?, ?, ?, ?, ?)',
    args: [5, 'allow users to add comments to suggestions, giving extra context or ideas for claude to consider', 1, null, 'Added expandable comments section to each suggestion card. Users can now add context for Claude to consider when implementing.']
  });

  // Set status back to idle
  await db.execute({
    sql: "UPDATE status SET state = 'idle', message = 'Awaiting next suggestion...', current_suggestion_id = NULL, updated_at = datetime('now') WHERE id = 1",
    args: []
  });

  console.log('Database updated successfully');
}

main().catch(console.error);
