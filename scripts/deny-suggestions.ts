import { updateStatus, updateSuggestionStatus } from '../src/lib/db'

async function main() {
  // Update status to working
  await updateStatus(6, 'working', 'Reviewing top suggestions for safety and feasibility...')

  // Deny suggestion #6 - Twitter login is too complex for autonomous implementation
  await updateSuggestionStatus(
    6,
    'denied',
    'This suggestion requires implementing Twitter OAuth authentication, which is a complex architectural change that should be planned carefully with the site owner. Additionally, restricting suggestions to only logged-in Twitter users would exclude people who don\'t use Twitter - the site works better as an open platform. Consider submitting a simpler version, like "Add optional Twitter sharing for implemented features".'
  )

  // Deny suggestion #10 - test submission is not a real feature
  await updateSuggestionStatus(
    10,
    'denied',
    'This is a test submission, not a feature request.'
  )

  // Set status back to idle
  await updateStatus(null, 'idle', 'Denied 2 suggestions: Twitter login (too complex/restrictive) and test submission. Awaiting next suggestion...')

  console.log('Done!')
}

main().catch(console.error)
