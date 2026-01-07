import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const suggestionId = 12;
const content = 'give users 2 votes every implementation, show how many votes they have left';
const votes = 1;
const aiNote = 'Added vote allowance system. New users start with 2 votes. Voting costs 1 vote, un-voting refunds it. All users receive 2 new votes when a feature is implemented.';
const commitHash = 'd4a0b11';

async function main() {
  // Update suggestion status
  await db.execute({
    sql: `UPDATE suggestions SET status = ?, implemented_at = datetime('now'), ai_note = ? WHERE id = ?`,
    args: ['implemented', aiNote, suggestionId],
  });
  console.log('Updated suggestion status to implemented');

  // Add changelog entry
  await db.execute({
    sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (?, ?, ?, ?, ?)`,
    args: [suggestionId, content, votes, commitHash, aiNote],
  });
  console.log('Added changelog entry');

  // Grant 2 votes to all users
  const result = await db.execute({
    sql: `UPDATE vote_allowance SET remaining_votes = remaining_votes + 2, last_grant_at = datetime('now')`,
    args: [],
  });
  console.log(`Granted 2 votes to ${result.rowsAffected} users`);

  // Set status back to idle
  await db.execute({
    sql: `UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = 'Awaiting next suggestion...', updated_at = datetime('now') WHERE id = 1`,
    args: [],
  });
  console.log('Set status to idle');

  console.log('Done! Suggestion 12 finalized as implemented');
}

main().catch(console.error);
