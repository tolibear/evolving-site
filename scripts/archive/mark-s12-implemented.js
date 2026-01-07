#!/usr/bin/env node
/**
 * One-time script to mark suggestion 12 as implemented
 * The vote allowance feature was already implemented in commit d4a0b11
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  // Update suggestion status
  await db.execute({
    sql: `UPDATE suggestions
          SET status = 'implemented',
              implemented_at = datetime('now'),
              ai_note = ?
          WHERE id = 12`,
    args: ['Vote allowance feature was already implemented in commit d4a0b11. Users get 2 votes per implementation, shown in the VoteAllowanceDisplay component above the suggestions list.'],
  });
  console.log('✓ Suggestion 12 marked as implemented');

  // Add changelog entry
  await db.execute({
    sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [
      12,
      'give users 2 votes every implementation, show how many votes they have left',
      1,
      'd4a0b11',
      'Vote allowance system implemented. Users start with 2 votes, voting uses 1, un-voting refunds 1. All users get 2 new votes after each feature implementation.',
    ],
  });
  console.log('✓ Changelog entry added');

  // Grant 2 votes to all users
  const result = await db.execute({
    sql: `UPDATE vote_allowance SET remaining_votes = remaining_votes + 2, last_grant_at = datetime('now')`,
    args: [],
  });
  console.log(`✓ Granted 2 votes to ${result.rowsAffected} users`);

  // Set status back to idle
  await db.execute({
    sql: `UPDATE status SET current_suggestion_id = NULL, state = 'idle', message = 'Awaiting next suggestion...', updated_at = datetime('now') WHERE id = 1`,
    args: [],
  });
  console.log('✓ Status set to idle');
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
