/**
 * Finalize a suggestion implementation by updating database
 * Usage: npx tsx scripts/finalize-temp.ts <suggestionId> <status> <votes> "<content>" "<aiNote>" <commitHash>
 */
import { updateSuggestionStatus, addChangelogEntry, updateStatus, grantVotesToAllUsers } from '../src/lib/db.js';

async function main() {
  const args = process.argv.slice(2);

  // Default values for suggestion 12
  const suggestionId = parseInt(args[0]) || 12;
  const status = args[1] || 'implemented';
  const votes = parseInt(args[2]) || 1;
  const content = args[3] || 'give users 2 votes every implementation, show how many votes they have left';
  const aiNote = args[4] || 'Added vote allowance system. New users start with 2 votes. Voting costs 1 vote, un-voting refunds it. All users receive 2 new votes when a feature is implemented.';
  const commitHash = args[5] || 'd4a0b11';

  await updateSuggestionStatus(suggestionId, status, aiNote);

  if (status === 'implemented') {
    await addChangelogEntry(suggestionId, content, votes, commitHash, aiNote);
    await grantVotesToAllUsers(2);
    console.log('Granted 2 votes to all users');
  }

  await updateStatus(null, 'idle', 'Awaiting next suggestion...');
  console.log(`Suggestion ${suggestionId} finalized as ${status}`);
}

main().catch(console.error);
