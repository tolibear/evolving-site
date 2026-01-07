import { createClient } from '@libsql/client'

// Always use Turso production database - no local fallback
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    'Missing required environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set'
  )
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Initialize schema (runs on first import)
const initSchema = async () => {
  await db.executeMultiple(`
    -- Suggestions table
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      votes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      implemented_at DATETIME
    );

    -- Votes table (for deduplication)
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL,
      voter_hash TEXT NOT NULL,
      vote_type TEXT DEFAULT 'up',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(suggestion_id, voter_hash),
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
    );

    -- Status table (singleton for live status)
    CREATE TABLE IF NOT EXISTS status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_suggestion_id INTEGER,
      state TEXT DEFAULT 'idle',
      message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Changelog table
    CREATE TABLE IF NOT EXISTS changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL,
      suggestion_content TEXT NOT NULL,
      votes_when_implemented INTEGER,
      commit_hash TEXT,
      implemented_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
    );

    -- Comments table
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      commenter_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
    );

    -- Vote allowance table (tracks how many votes each user has)
    CREATE TABLE IF NOT EXISTS vote_allowance (
      voter_hash TEXT PRIMARY KEY,
      remaining_votes INTEGER DEFAULT 2,
      last_grant_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Initialize status row if not exists
    INSERT OR IGNORE INTO status (id, state, message) VALUES (1, 'idle', 'Awaiting next suggestion...');
  `)

  // Add ai_note columns (ignore if already exists)
  try {
    await db.execute('ALTER TABLE suggestions ADD COLUMN ai_note TEXT')
  } catch {
    // Column already exists
  }
  try {
    await db.execute('ALTER TABLE changelog ADD COLUMN ai_note TEXT')
  } catch {
    // Column already exists
  }
  // Add automation_mode column (ignore if already exists)
  try {
    await db.execute("ALTER TABLE status ADD COLUMN automation_mode TEXT DEFAULT 'manual'")
  } catch {
    // Column already exists
  }
  // Add author column for Ralph Wiggum suggestions (ignore if already exists)
  try {
    await db.execute('ALTER TABLE suggestions ADD COLUMN author TEXT DEFAULT NULL')
  } catch {
    // Column already exists
  }
  // Add interval_minutes column for configurable check interval (ignore if already exists)
  try {
    await db.execute('ALTER TABLE status ADD COLUMN interval_minutes INTEGER DEFAULT 10')
  } catch {
    // Column already exists
  }
  // Add next_check_at column for countdown sync (ignore if already exists)
  try {
    await db.execute('ALTER TABLE status ADD COLUMN next_check_at TEXT DEFAULT NULL')
  } catch {
    // Column already exists
  }
  // Add submitter_hash column for tracking who submitted each suggestion (ignore if already exists)
  try {
    await db.execute('ALTER TABLE suggestions ADD COLUMN submitter_hash TEXT DEFAULT NULL')
  } catch {
    // Column already exists
  }
  // Add vote_type column for tracking upvotes vs downvotes (ignore if already exists)
  try {
    await db.execute("ALTER TABLE votes ADD COLUMN vote_type TEXT DEFAULT 'up'")
  } catch {
    // Column already exists
  }

  // One-time migration: Mark suggestion #12 as implemented (vote allowance feature)
  // The feature was implemented in commit d4a0b11 but database wasn't updated
  try {
    const aiNote = 'Added vote allowance system. New users start with 2 votes. Voting costs 1 vote, un-voting refunds it. All users receive 2 new votes when a feature is implemented.'
    const content = 'give users 2 votes every implementation, show how many votes they have left'

    // Check if suggestion 12 is still pending
    const checkResult = await db.execute({
      sql: `SELECT status FROM suggestions WHERE id = 12`,
      args: [],
    })

    if (checkResult.rows.length > 0 && checkResult.rows[0].status === 'pending') {
      // Update suggestion status
      await db.execute({
        sql: `UPDATE suggestions SET status = 'implemented', implemented_at = datetime('now'), ai_note = ? WHERE id = 12`,
        args: [aiNote],
      })

      // Add changelog entry (check if exists first)
      const changelogCheck = await db.execute({
        sql: `SELECT id FROM changelog WHERE suggestion_id = 12`,
        args: [],
      })
      if (changelogCheck.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (12, ?, 1, 'd4a0b11', ?)`,
          args: [content, aiNote],
        })
        // Grant 2 votes to all existing users
        await db.execute({
          sql: `UPDATE vote_allowance SET remaining_votes = remaining_votes + 2, last_grant_at = datetime('now')`,
          args: [],
        })
      }
      console.log('Migration: Marked suggestion #12 as implemented with changelog')
    }
  } catch (e) {
    // Suggestion 12 might not exist
    console.log('Migration for suggestion #12 skipped:', e)
  }

  // One-time migration: Mark suggestion #13 as implemented (brown mode)
  // The feature was implemented in commit 4ec78b8 but database wasn't updated
  try {
    const aiNote13 = 'Added brown mode as a third theme option. Click the theme toggle to cycle through light, dark, and brown. Uses warm earth tones with amber/brown color palette.'
    const content13 = 'In addition to light and dark mode, add brown mode'

    // Check if suggestion 13 is still pending
    const checkResult13 = await db.execute({
      sql: `SELECT status FROM suggestions WHERE id = 13`,
      args: [],
    })

    if (checkResult13.rows.length > 0 && checkResult13.rows[0].status === 'pending') {
      // Update suggestion status
      await db.execute({
        sql: `UPDATE suggestions SET status = 'implemented', implemented_at = datetime('now'), ai_note = ? WHERE id = 13`,
        args: [aiNote13],
      })

      // Add changelog entry (check if exists first)
      const changelogCheck13 = await db.execute({
        sql: `SELECT id FROM changelog WHERE suggestion_id = 13`,
        args: [],
      })
      if (changelogCheck13.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note) VALUES (13, ?, 1, '4ec78b8', ?)`,
          args: [content13, aiNote13],
        })
        // Grant 2 votes to all existing users
        await db.execute({
          sql: `UPDATE vote_allowance SET remaining_votes = remaining_votes + 2, last_grant_at = datetime('now')`,
          args: [],
        })
      }
      console.log('Migration: Marked suggestion #13 as implemented with changelog')
    }
  } catch (e) {
    // Suggestion 13 might not exist
    console.log('Migration for suggestion #13 skipped:', e)
  }
}

// Initialize on module load
const schemaPromise = initSchema().catch(console.error)

export interface Suggestion {
  id: number
  content: string
  votes: number
  status: 'pending' | 'in_progress' | 'implemented' | 'denied' | 'needs_input'
  created_at: string
  implemented_at: string | null
  ai_note: string | null
  author: string | null // null = anonymous user, 'ralph' = Ralph Wiggum
  submitter_hash: string | null // hash of IP+UserAgent for identifying the submitter
  comment_count?: number
}

export interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'deploying' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
  interval_minutes: number
  next_check_at: string | null
}

export interface ChangelogEntry {
  id: number
  suggestion_id: number
  suggestion_content: string
  votes_when_implemented: number
  commit_hash: string | null
  implemented_at: string
  ai_note: string | null
}

export interface Comment {
  id: number
  suggestion_id: number
  content: string
  commenter_hash: string
  created_at: string
}

export interface VoteAllowance {
  voter_hash: string
  remaining_votes: number
  last_grant_at: string
}

// Ensure schema is ready before queries
async function ensureSchema() {
  await schemaPromise
}

// Suggestion queries
export async function getSuggestions(): Promise<Suggestion[]> {
  await ensureSchema()
  const result = await db.execute(`
    SELECT s.*, COALESCE(c.comment_count, 0) as comment_count
    FROM suggestions s
    LEFT JOIN (
      SELECT suggestion_id, COUNT(*) as comment_count
      FROM comments
      GROUP BY suggestion_id
    ) c ON s.id = c.suggestion_id
    WHERE s.status = 'pending'
    ORDER BY s.votes DESC, s.created_at ASC
  `)
  return result.rows as unknown as Suggestion[]
}

export async function createSuggestion(content: string, submitterHash?: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO suggestions (content, submitter_hash) VALUES (?, ?)',
    args: [content, submitterHash ?? null],
  })
  return Number(result.lastInsertRowid)
}

export async function createSuggestionWithAuthor(
  content: string,
  author: string | null
): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO suggestions (content, author) VALUES (?, ?)',
    args: [content, author],
  })
  return Number(result.lastInsertRowid)
}

export async function getTopSuggestion(): Promise<Suggestion | null> {
  await ensureSchema()
  const result = await db.execute(`
    SELECT * FROM suggestions
    WHERE status = 'pending'
    ORDER BY votes DESC
    LIMIT 1
  `)
  return (result.rows[0] as unknown as Suggestion) || null
}

export async function updateSuggestionStatus(
  id: number,
  status: string,
  aiNote?: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE suggestions
          SET status = ?,
              implemented_at = CASE WHEN ? = 'implemented' OR ? = 'denied' THEN datetime('now') ELSE implemented_at END,
              ai_note = COALESCE(?, ai_note)
          WHERE id = ?`,
    args: [status, status, status, aiNote ?? null, id],
  })
}

export async function getDeniedSuggestions(): Promise<Suggestion[]> {
  await ensureSchema()
  const result = await db.execute(`
    SELECT * FROM suggestions
    WHERE status = 'denied'
    ORDER BY implemented_at DESC
  `)
  return result.rows as unknown as Suggestion[]
}

export async function getNeedsInputSuggestions(): Promise<Suggestion[]> {
  await ensureSchema()
  const result = await db.execute(`
    SELECT * FROM suggestions
    WHERE status = 'needs_input'
    ORDER BY votes DESC, created_at ASC
  `)
  return result.rows as unknown as Suggestion[]
}

export async function getSuggestionById(id: number): Promise<Suggestion | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM suggestions WHERE id = ?',
    args: [id],
  })
  return (result.rows[0] as unknown as Suggestion) || null
}

export async function deleteSuggestion(id: number, submitterHash: string): Promise<boolean> {
  await ensureSchema()
  // Only delete if the submitter_hash matches AND status is 'pending'
  // This ensures users can only delete their own pending suggestions
  const result = await db.execute({
    sql: `DELETE FROM suggestions WHERE id = ? AND submitter_hash = ? AND status = 'pending'`,
    args: [id, submitterHash],
  })
  // Also clean up any associated votes and comments
  if (result.rowsAffected > 0) {
    await db.execute({
      sql: 'DELETE FROM votes WHERE suggestion_id = ?',
      args: [id],
    })
    await db.execute({
      sql: 'DELETE FROM comments WHERE suggestion_id = ?',
      args: [id],
    })
    return true
  }
  return false
}

// Vote queries
export async function hasVoted(
  suggestionId: number,
  voterHash: string
): Promise<boolean> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM votes WHERE suggestion_id = ? AND voter_hash = ?',
    args: [suggestionId, voterHash],
  })
  return (result.rows[0] as unknown as { count: number }).count > 0
}

export async function getVoteType(
  suggestionId: number,
  voterHash: string
): Promise<'up' | 'down' | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT vote_type FROM votes WHERE suggestion_id = ? AND voter_hash = ?',
    args: [suggestionId, voterHash],
  })
  if (result.rows.length === 0) return null
  return (result.rows[0] as unknown as { vote_type: 'up' | 'down' }).vote_type
}

export async function addVote(
  suggestionId: number,
  voterHash: string,
  voteType: 'up' | 'down' = 'up'
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'INSERT INTO votes (suggestion_id, voter_hash, vote_type) VALUES (?, ?, ?)',
    args: [suggestionId, voterHash, voteType],
  })
  if (voteType === 'up') {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 1 WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    // Downvote - decrease but don't go below 0
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 1) WHERE id = ?',
      args: [suggestionId],
    })
  }
}

export async function removeVote(
  suggestionId: number,
  voterHash: string
): Promise<'up' | 'down' | null> {
  await ensureSchema()
  // Get the vote type before removing
  const voteType = await getVoteType(suggestionId, voterHash)
  if (!voteType) return null

  await db.execute({
    sql: 'DELETE FROM votes WHERE suggestion_id = ? AND voter_hash = ?',
    args: [suggestionId, voterHash],
  })

  if (voteType === 'up') {
    // Removing upvote decreases the count
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 1) WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    // Removing downvote increases the count
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 1 WHERE id = ?',
      args: [suggestionId],
    })
  }

  return voteType
}

export async function changeVote(
  suggestionId: number,
  voterHash: string,
  newVoteType: 'up' | 'down'
): Promise<void> {
  await ensureSchema()
  const currentVoteType = await getVoteType(suggestionId, voterHash)
  if (!currentVoteType || currentVoteType === newVoteType) return

  // Update the vote type
  await db.execute({
    sql: 'UPDATE votes SET vote_type = ? WHERE suggestion_id = ? AND voter_hash = ?',
    args: [newVoteType, suggestionId, voterHash],
  })

  // Adjust the vote count: changing from up to down loses 2 (one for removing upvote, one for adding downvote)
  // and vice versa
  if (newVoteType === 'up') {
    // Changed from down to up: +2 total change
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 2 WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    // Changed from up to down: -2 total change, but not below 0
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 2) WHERE id = ?',
      args: [suggestionId],
    })
  }
}

// Status queries
export async function getStatus(): Promise<Status> {
  await ensureSchema()
  const result = await db.execute(
    "SELECT current_suggestion_id, state, message, updated_at, COALESCE(automation_mode, 'manual') as automation_mode, COALESCE(interval_minutes, 10) as interval_minutes, next_check_at FROM status WHERE id = 1"
  )
  return result.rows[0] as unknown as Status
}

export async function updateStatus(
  currentSuggestionId: number | null,
  state: string,
  message: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE status
          SET current_suggestion_id = ?, state = ?, message = ?, updated_at = datetime('now')
          WHERE id = 1`,
    args: [currentSuggestionId, state, message],
  })
}

export async function setAutomationMode(mode: 'manual' | 'automated'): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE status SET automation_mode = ?, updated_at = datetime('now') WHERE id = 1`,
    args: [mode],
  })
}

export async function setIntervalMinutes(minutes: number): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE status SET interval_minutes = ?, updated_at = datetime('now') WHERE id = 1`,
    args: [minutes],
  })
}

export async function setNextCheckAt(nextCheckAt: string | null): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE status SET next_check_at = ?, updated_at = datetime('now') WHERE id = 1`,
    args: [nextCheckAt],
  })
}

// Changelog queries
export async function getChangelog(): Promise<ChangelogEntry[]> {
  await ensureSchema()
  const result = await db.execute(
    'SELECT * FROM changelog ORDER BY implemented_at DESC'
  )
  return result.rows as unknown as ChangelogEntry[]
}

export async function addChangelogEntry(
  suggestionId: number,
  suggestionContent: string,
  votesWhenImplemented: number,
  commitHash: string | null,
  aiNote?: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note)
          VALUES (?, ?, ?, ?, ?)`,
    args: [suggestionId, suggestionContent, votesWhenImplemented, commitHash, aiNote ?? null],
  })
}

// Comment queries
export async function getComments(suggestionId: number): Promise<Comment[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE suggestion_id = ? ORDER BY created_at ASC',
    args: [suggestionId],
  })
  return result.rows as unknown as Comment[]
}

export async function getUserComment(
  suggestionId: number,
  commenterHash: string
): Promise<Comment | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE suggestion_id = ? AND commenter_hash = ?',
    args: [suggestionId, commenterHash],
  })
  return (result.rows[0] as unknown as Comment) || null
}

export async function addComment(
  suggestionId: number,
  content: string,
  commenterHash: string
): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO comments (suggestion_id, content, commenter_hash) VALUES (?, ?, ?)',
    args: [suggestionId, content, commenterHash],
  })
  return Number(result.lastInsertRowid)
}

export async function updateComment(
  id: number,
  content: string,
  commenterHash: string
): Promise<boolean> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'UPDATE comments SET content = ? WHERE id = ? AND commenter_hash = ?',
    args: [content, id, commenterHash],
  })
  return result.rowsAffected > 0
}

export async function getCommentCount(suggestionId: number): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM comments WHERE suggestion_id = ?',
    args: [suggestionId],
  })
  return (result.rows[0] as unknown as { count: number }).count
}

// Vote allowance queries
export async function getVoteAllowance(voterHash: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT remaining_votes FROM vote_allowance WHERE voter_hash = ?',
    args: [voterHash],
  })
  if (result.rows.length === 0) {
    // New user - initialize with 2 votes
    await db.execute({
      sql: 'INSERT INTO vote_allowance (voter_hash, remaining_votes) VALUES (?, 2)',
      args: [voterHash],
    })
    return 2
  }
  return (result.rows[0] as unknown as { remaining_votes: number }).remaining_votes
}

export async function decrementVoteAllowance(voterHash: string): Promise<boolean> {
  await ensureSchema()
  // First ensure the user exists
  const remaining = await getVoteAllowance(voterHash)
  if (remaining <= 0) {
    return false
  }
  await db.execute({
    sql: 'UPDATE vote_allowance SET remaining_votes = remaining_votes - 1 WHERE voter_hash = ?',
    args: [voterHash],
  })
  return true
}

export async function incrementVoteAllowance(voterHash: string): Promise<void> {
  await ensureSchema()
  // Ensure the user exists first
  await getVoteAllowance(voterHash)
  await db.execute({
    sql: 'UPDATE vote_allowance SET remaining_votes = remaining_votes + 1 WHERE voter_hash = ?',
    args: [voterHash],
  })
}

export async function grantVotesToAllUsers(votesPerUser: number): Promise<number> {
  await ensureSchema()
  // Reset votes to the cap instead of adding to existing votes
  const result = await db.execute({
    sql: `UPDATE vote_allowance SET remaining_votes = ?, last_grant_at = datetime('now')`,
    args: [votesPerUser],
  })
  return result.rowsAffected
}

export async function getUpvoterHashes(suggestionId: number): Promise<string[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: "SELECT voter_hash FROM votes WHERE suggestion_id = ? AND vote_type = 'up'",
    args: [suggestionId],
  })
  return result.rows.map((row) => (row as unknown as { voter_hash: string }).voter_hash)
}

export async function grantBonusVoteToSupporters(suggestionId: number): Promise<number> {
  await ensureSchema()
  // Get all users who upvoted this suggestion
  const upvoterHashes = await getUpvoterHashes(suggestionId)
  if (upvoterHashes.length === 0) return 0

  // Grant +1 bonus vote to each supporter
  let count = 0
  for (const voterHash of upvoterHashes) {
    // Get current vote allowance (ensures user exists)
    await getVoteAllowance(voterHash)
    await db.execute({
      sql: 'UPDATE vote_allowance SET remaining_votes = remaining_votes + 1 WHERE voter_hash = ?',
      args: [voterHash],
    })
    count++
  }
  return count
}

export default db
