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

    -- Terminal sessions table (one per implementation)
    CREATE TABLE IF NOT EXISTS terminal_sessions (
      id TEXT PRIMARY KEY,
      suggestion_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id)
    );

    -- Terminal output chunks (streamed incrementally)
    CREATE TABLE IF NOT EXISTS terminal_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES terminal_sessions(id)
    );

    -- Index for efficient chunk retrieval
    CREATE INDEX IF NOT EXISTS idx_chunks_session_seq ON terminal_chunks(session_id, sequence);

    -- Rate limits table (for distributed rate limiting)
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      count INTEGER DEFAULT 1,
      reset_time INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Index for rate limit lookups
    CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

    -- Security events table (for audit logging)
    CREATE TABLE IF NOT EXISTS security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      endpoint TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Index for security event queries
    CREATE INDEX IF NOT EXISTS idx_security_events_type_time ON security_events(event_type, created_at);

    -- Users table (Twitter OAuth)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitter_id TEXT UNIQUE NOT NULL,
      twitter_username TEXT NOT NULL,
      twitter_avatar TEXT,
      twitter_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions table (auth sessions)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Index for session lookups
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    -- Initialize status row if not exists
    INSERT OR IGNORE INTO status (id, state, message) VALUES (1, 'idle', 'Awaiting next suggestion...');
  `)

  // Column migrations - each may already exist, so errors are expected
  const columnMigrations = [
    { table: 'suggestions', column: 'ai_note', type: 'TEXT' },
    { table: 'changelog', column: 'ai_note', type: 'TEXT' },
    { table: 'changelog', column: 'icon_type', type: 'TEXT DEFAULT NULL' },
    { table: 'status', column: 'automation_mode', type: "TEXT DEFAULT 'manual'" },
    { table: 'suggestions', column: 'author', type: 'TEXT DEFAULT NULL' },
    { table: 'status', column: 'interval_minutes', type: 'INTEGER DEFAULT 10' },
    { table: 'status', column: 'next_check_at', type: 'TEXT DEFAULT NULL' },
    { table: 'suggestions', column: 'submitter_hash', type: 'TEXT DEFAULT NULL' },
    { table: 'votes', column: 'vote_type', type: "TEXT DEFAULT 'up'" },
    { table: 'suggestions', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
    { table: 'votes', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
    { table: 'comments', column: 'user_id', type: 'INTEGER REFERENCES users(id)' },
    { table: 'suggestions', column: 'expedite_amount_cents', type: 'INTEGER DEFAULT 0' },
    { table: 'votes', column: 'vote_order', type: 'INTEGER' },
    { table: 'users', column: 'referral_code', type: 'TEXT UNIQUE' },
    { table: 'users', column: 'referred_by', type: 'INTEGER REFERENCES users(id)' },
  ]

  for (const { table, column, type } of columnMigrations) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    } catch {
      // Column already exists - expected during normal operation
    }
  }

  // Drop old expedite_payments table if schema is wrong (it's new and empty)
  // Check if the table has all required columns by trying to create an index
  try {
    await db.execute(`SELECT stripe_checkout_session_id FROM expedite_payments LIMIT 1`)
  } catch {
    // Column doesn't exist, drop and recreate table
    await db.execute(`DROP TABLE IF EXISTS expedite_payments`)
  }

  // Create expedite_payments table for Stripe expedite feature
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expedite_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      stripe_payment_intent_id TEXT,
      stripe_checkout_session_id TEXT NOT NULL UNIQUE,
      amount_cents INTEGER NOT NULL DEFAULT 400,
      status TEXT DEFAULT 'pending',
      refund_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      refunded_at DATETIME,
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Create user_credits table for credit system
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_credits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      balance INTEGER NOT NULL DEFAULT 0,
      total_purchased INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Create credit_purchases table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS credit_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credits_amount INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      stripe_checkout_session_id TEXT NOT NULL UNIQUE,
      stripe_payment_intent_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Create indexes for credit tables
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON credit_purchases(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_credit_purchases_session ON credit_purchases(stripe_checkout_session_id)`)

  // Create indexes for expedite_payments
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_expedite_suggestion ON expedite_payments(suggestion_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_expedite_user ON expedite_payments(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_expedite_status ON expedite_payments(status)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_expedite_session ON expedite_payments(stripe_checkout_session_id)`)

  // ===== REPUTATION SYSTEM TABLES =====

  // User reputation tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_reputation (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      total_rep INTEGER DEFAULT 0,
      weekly_rep INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'bronze',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_vote_date DATE,
      suggestions_backed_denied INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Referral tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER REFERENCES users(id),
      referred_id INTEGER REFERENCES users(id),
      activated BOOLEAN DEFAULT false,
      activated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(referred_id)
    )
  `)

  // Achievement tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      achievement_type TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_type)
    )
  `)

  // Push notification subscriptions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      notify_own_shipped BOOLEAN DEFAULT true,
      notify_voted_shipped BOOLEAN DEFAULT true,
      notify_refill BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Weekly leaderboard snapshots
  await db.execute(`
    CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      week_start DATE NOT NULL,
      weekly_rep INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add indexes for reputation tables
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_rep_total ON user_reputation(total_rep DESC)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_rep_weekly ON user_reputation(weekly_rep DESC)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON leaderboard_snapshots(week_start, rank)`)

  // Chat messages table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Index for efficient chat retrieval
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC)`)

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
  submitter_hash: string | null // hash of IP+UserAgent for identifying the submitter (legacy)
  user_id: number | null // Twitter authenticated user ID
  comment_count?: number
  expedite_amount_cents?: number // Total amount paid to expedite this suggestion
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
  icon_type: string | null // Custom icon type to override auto-detection
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

export interface TerminalSession {
  id: string
  suggestion_id: number
  started_at: string
  ended_at: string | null
  status: 'active' | 'completed' | 'failed'
}

export interface TerminalChunk {
  id: number
  session_id: string
  sequence: number
  content: string // Base64-encoded raw terminal output
  created_at: string
}

export interface RateLimit {
  id: number
  key: string
  count: number
  reset_time: number
  created_at: string
}

export interface SecurityEvent {
  id: number
  event_type: string
  ip_address: string | null
  endpoint: string | null
  details: string | null
  created_at: string
}

export interface User {
  id: number
  twitter_id: string
  twitter_username: string
  twitter_avatar: string | null
  twitter_name: string | null
  created_at: string
  last_login: string
}

export interface Session {
  id: string
  user_id: number
  expires_at: string
  created_at: string
}

export interface ExpeditePayment {
  id: number
  suggestion_id: number
  user_id: number
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string
  amount_cents: number
  status: 'pending' | 'completed' | 'refunded' | 'failed'
  refund_id: string | null
  created_at: string
  completed_at: string | null
  refunded_at: string | null
}

export interface Contributor {
  id: number
  username: string
  avatar: string | null
  type: 'comment' | 'vote'
}

export interface UserCredits {
  id: number
  user_id: number
  balance: number
  total_purchased: number
  updated_at: string
}

export interface CreditPurchase {
  id: number
  user_id: number
  credits_amount: number
  amount_cents: number
  stripe_checkout_session_id: string
  stripe_payment_intent_id: string | null
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  completed_at: string | null
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
    ORDER BY COALESCE(s.expedite_amount_cents, 0) DESC, s.votes DESC, s.created_at ASC
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

export async function getDeniedSuggestions(limit?: number): Promise<Suggestion[]> {
  await ensureSchema()
  const sql = limit
    ? 'SELECT * FROM suggestions WHERE status = \'denied\' ORDER BY implemented_at DESC LIMIT ?'
    : 'SELECT * FROM suggestions WHERE status = \'denied\' ORDER BY implemented_at DESC'
  const result = await db.execute({
    sql,
    args: limit ? [limit] : [],
  })
  return result.rows as unknown as Suggestion[]
}

export async function getNeedsInputSuggestions(limit?: number): Promise<Suggestion[]> {
  await ensureSchema()
  const sql = limit
    ? 'SELECT * FROM suggestions WHERE status = \'needs_input\' ORDER BY votes DESC, created_at ASC LIMIT ?'
    : 'SELECT * FROM suggestions WHERE status = \'needs_input\' ORDER BY votes DESC, created_at ASC'
  const result = await db.execute({
    sql,
    args: limit ? [limit] : [],
  })
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
export async function getChangelog(limit?: number): Promise<ChangelogEntry[]> {
  await ensureSchema()
  // Use subquery to deduplicate by suggestion_id (keep earliest entry per suggestion)
  const sql = limit
    ? `SELECT * FROM changelog
       WHERE id IN (SELECT MIN(id) FROM changelog GROUP BY suggestion_id)
       ORDER BY implemented_at DESC LIMIT ?`
    : `SELECT * FROM changelog
       WHERE id IN (SELECT MIN(id) FROM changelog GROUP BY suggestion_id)
       ORDER BY implemented_at DESC`
  const result = await db.execute({
    sql,
    args: limit ? [limit] : [],
  })
  return result.rows as unknown as ChangelogEntry[]
}

export async function addChangelogEntry(
  suggestionId: number,
  suggestionContent: string,
  votesWhenImplemented: number,
  commitHash: string | null,
  aiNote?: string,
  iconType?: string
): Promise<void> {
  await ensureSchema()
  // Check if entry already exists for this suggestion
  const existing = await db.execute({
    sql: 'SELECT id FROM changelog WHERE suggestion_id = ?',
    args: [suggestionId],
  })
  if (existing.rows.length > 0) {
    // Already exists, skip insertion
    return
  }
  await db.execute({
    sql: `INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash, ai_note, icon_type)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [suggestionId, suggestionContent, votesWhenImplemented, commitHash, aiNote ?? null, iconType ?? null],
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

// Terminal session queries
export async function createTerminalSession(suggestionId: number): Promise<string> {
  await ensureSchema()
  const sessionId = crypto.randomUUID()
  await db.execute({
    sql: 'INSERT INTO terminal_sessions (id, suggestion_id) VALUES (?, ?)',
    args: [sessionId, suggestionId],
  })
  return sessionId
}

export async function getTerminalSession(sessionId: string): Promise<TerminalSession | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM terminal_sessions WHERE id = ?',
    args: [sessionId],
  })
  return (result.rows[0] as unknown as TerminalSession) || null
}

export async function getLatestTerminalSession(): Promise<TerminalSession | null> {
  await ensureSchema()
  const result = await db.execute(
    'SELECT * FROM terminal_sessions ORDER BY started_at DESC LIMIT 1'
  )
  return (result.rows[0] as unknown as TerminalSession) || null
}

export async function getActiveTerminalSession(): Promise<TerminalSession | null> {
  await ensureSchema()
  const result = await db.execute(
    "SELECT * FROM terminal_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
  )
  return (result.rows[0] as unknown as TerminalSession) || null
}

export async function endTerminalSession(
  sessionId: string,
  status: 'completed' | 'failed'
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE terminal_sessions SET status = ?, ended_at = datetime('now') WHERE id = ?`,
    args: [status, sessionId],
  })
}

export async function getTerminalSessions(limit: number = 20): Promise<TerminalSession[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM terminal_sessions ORDER BY started_at DESC LIMIT ?',
    args: [limit],
  })
  return result.rows as unknown as TerminalSession[]
}

// Terminal chunk queries
export async function appendTerminalChunk(
  sessionId: string,
  sequence: number,
  content: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'INSERT INTO terminal_chunks (session_id, sequence, content) VALUES (?, ?, ?)',
    args: [sessionId, sequence, content],
  })
}

export async function getTerminalChunks(
  sessionId: string,
  fromSequence: number = 0
): Promise<TerminalChunk[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM terminal_chunks WHERE session_id = ? AND sequence > ? ORDER BY sequence ASC',
    args: [sessionId, fromSequence],
  })
  return result.rows as unknown as TerminalChunk[]
}

export async function getAllTerminalChunks(sessionId: string): Promise<TerminalChunk[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM terminal_chunks WHERE session_id = ? ORDER BY sequence ASC',
    args: [sessionId],
  })
  return result.rows as unknown as TerminalChunk[]
}

export async function getTerminalChunkCount(sessionId: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM terminal_chunks WHERE session_id = ?',
    args: [sessionId],
  })
  return (result.rows[0] as unknown as { count: number }).count
}

export async function getLatestChunkSequence(sessionId: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT MAX(sequence) as max_seq FROM terminal_chunks WHERE session_id = ?',
    args: [sessionId],
  })
  const maxSeq = (result.rows[0] as unknown as { max_seq: number | null }).max_seq
  return maxSeq ?? -1
}

export async function cleanupOldTerminalSessions(keepCount: number = 20): Promise<number> {
  await ensureSchema()
  // Get IDs of sessions to keep (most recent N)
  const keepResult = await db.execute({
    sql: 'SELECT id FROM terminal_sessions ORDER BY started_at DESC LIMIT ?',
    args: [keepCount],
  })
  const keepIds = keepResult.rows.map((row) => (row as unknown as { id: string }).id)

  if (keepIds.length === 0) return 0

  // Get IDs of sessions to DELETE (those NOT in the keep list)
  // This approach avoids dynamic SQL construction with user-controllable placeholders
  const deleteResult = await db.execute({
    sql: 'SELECT id FROM terminal_sessions ORDER BY started_at DESC LIMIT -1 OFFSET ?',
    args: [keepCount],
  })
  const deleteIds = deleteResult.rows.map((row) => (row as unknown as { id: string }).id)

  if (deleteIds.length === 0) return 0

  // Delete chunks and sessions one by one using parameterized queries
  // This is safer than dynamic IN clause construction
  let deletedCount = 0
  for (const sessionId of deleteIds) {
    await db.execute({
      sql: 'DELETE FROM terminal_chunks WHERE session_id = ?',
      args: [sessionId],
    })
    const result = await db.execute({
      sql: 'DELETE FROM terminal_sessions WHERE id = ?',
      args: [sessionId],
    })
    deletedCount += result.rowsAffected
  }

  return deletedCount
}

// Security event logging
export async function logSecurityEvent(
  eventType: string,
  ipAddress: string | null,
  endpoint: string | null,
  details?: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'INSERT INTO security_events (event_type, ip_address, endpoint, details) VALUES (?, ?, ?, ?)',
    args: [eventType, ipAddress, endpoint, details ?? null],
  })
}

export async function getSecurityEvents(
  limit: number = 100,
  eventType?: string
): Promise<SecurityEvent[]> {
  await ensureSchema()
  if (eventType) {
    const result = await db.execute({
      sql: 'SELECT * FROM security_events WHERE event_type = ? ORDER BY created_at DESC LIMIT ?',
      args: [eventType, limit],
    })
    return result.rows as unknown as SecurityEvent[]
  }
  const result = await db.execute({
    sql: 'SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?',
    args: [limit],
  })
  return result.rows as unknown as SecurityEvent[]
}

// Count auth failures for rate limiting on authentication attempts
export async function countRecentAuthFailures(
  ipAddress: string,
  windowMs: number = 5 * 60 * 1000 // 5 minutes
): Promise<number> {
  await ensureSchema()
  const cutoffTime = new Date(Date.now() - windowMs).toISOString()
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM security_events
          WHERE event_type = 'auth_failure'
          AND ip_address = ?
          AND created_at > ?`,
    args: [ipAddress, cutoffTime],
  })
  return (result.rows[0] as unknown as { count: number }).count
}

// Database-backed rate limiting (distributed across server instances)
export async function checkRateLimitDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  await ensureSchema()
  const now = Date.now()
  const resetTime = now + windowMs

  // Try to get existing rate limit record
  const existing = await db.execute({
    sql: 'SELECT count, reset_time FROM rate_limits WHERE key = ?',
    args: [key],
  })

  if (existing.rows.length === 0) {
    // No record exists - create new one
    await db.execute({
      sql: 'INSERT INTO rate_limits (key, count, reset_time) VALUES (?, 1, ?)',
      args: [key, resetTime],
    })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }

  const record = existing.rows[0] as unknown as { count: number; reset_time: number }

  // Check if window has expired
  if (now > record.reset_time) {
    // Window expired - reset the counter
    await db.execute({
      sql: 'UPDATE rate_limits SET count = 1, reset_time = ? WHERE key = ?',
      args: [resetTime, key],
    })
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }

  // Window still active - check if limit exceeded
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.reset_time - now,
    }
  }

  // Increment counter
  await db.execute({
    sql: 'UPDATE rate_limits SET count = count + 1 WHERE key = ?',
    args: [key],
  })

  return {
    allowed: true,
    remaining: limit - record.count - 1,
    resetIn: record.reset_time - now,
  }
}

// Clean up expired rate limit records
export async function cleanupExpiredRateLimits(): Promise<number> {
  await ensureSchema()
  const now = Date.now()
  const result = await db.execute({
    sql: 'DELETE FROM rate_limits WHERE reset_time < ?',
    args: [now],
  })
  return result.rowsAffected
}

// Clean up old security events (keep last 30 days)
export async function cleanupOldSecurityEvents(daysToKeep: number = 30): Promise<number> {
  await ensureSchema()
  const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString()
  const result = await db.execute({
    sql: 'DELETE FROM security_events WHERE created_at < ?',
    args: [cutoffTime],
  })
  return result.rowsAffected
}

// User queries
export async function getUserByTwitterId(twitterId: string): Promise<User | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE twitter_id = ?',
    args: [twitterId],
  })
  return (result.rows[0] as unknown as User) || null
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  })
  return (result.rows[0] as unknown as User) || null
}

export async function createUser(
  twitterId: string,
  twitterUsername: string,
  twitterAvatar: string | null,
  twitterName: string | null
): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: `INSERT INTO users (twitter_id, twitter_username, twitter_avatar, twitter_name)
          VALUES (?, ?, ?, ?)`,
    args: [twitterId, twitterUsername, twitterAvatar, twitterName],
  })
  return Number(result.lastInsertRowid)
}

export async function updateUser(
  id: number,
  twitterUsername: string,
  twitterAvatar: string | null,
  twitterName: string | null
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE users SET
          twitter_username = ?,
          twitter_avatar = ?,
          twitter_name = ?,
          last_login = datetime('now')
          WHERE id = ?`,
    args: [twitterUsername, twitterAvatar, twitterName, id],
  })
}

export async function upsertUser(
  twitterId: string,
  twitterUsername: string,
  twitterAvatar: string | null,
  twitterName: string | null
): Promise<User> {
  await ensureSchema()
  const existing = await getUserByTwitterId(twitterId)
  if (existing) {
    await updateUser(existing.id, twitterUsername, twitterAvatar, twitterName)
    return { ...existing, twitter_username: twitterUsername, twitter_avatar: twitterAvatar, twitter_name: twitterName }
  }
  const id = await createUser(twitterId, twitterUsername, twitterAvatar, twitterName)
  return {
    id,
    twitter_id: twitterId,
    twitter_username: twitterUsername,
    twitter_avatar: twitterAvatar,
    twitter_name: twitterName,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  }
}

// Session queries
export async function createSession(userId: number, expiresInMs: number = 30 * 24 * 60 * 60 * 1000): Promise<string> {
  await ensureSchema()
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString()
  await db.execute({
    sql: 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    args: [sessionId, userId, expiresAt],
  })
  return sessionId
}

export async function getSession(sessionId: string): Promise<(Session & { user: User }) | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT s.*, u.id as u_id, u.twitter_id, u.twitter_username, u.twitter_avatar, u.twitter_name, u.created_at as u_created_at, u.last_login
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ? AND s.expires_at > datetime('now')`,
    args: [sessionId],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0] as unknown as {
    id: string
    user_id: number
    expires_at: string
    created_at: string
    u_id: number
    twitter_id: string
    twitter_username: string
    twitter_avatar: string | null
    twitter_name: string | null
    u_created_at: string
    last_login: string
  }
  return {
    id: row.id,
    user_id: row.user_id,
    expires_at: row.expires_at,
    created_at: row.created_at,
    user: {
      id: row.u_id,
      twitter_id: row.twitter_id,
      twitter_username: row.twitter_username,
      twitter_avatar: row.twitter_avatar,
      twitter_name: row.twitter_name,
      created_at: row.u_created_at,
      last_login: row.last_login,
    },
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    args: [sessionId],
  })
}

export async function deleteExpiredSessions(): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: "DELETE FROM sessions WHERE expires_at < datetime('now')",
    args: [],
  })
  return result.rowsAffected
}

// Contributor queries for suggestions
export async function getContributors(
  suggestionId: number,
  limit: number = 5
): Promise<{ contributors: Contributor[]; totalCount: number }> {
  await ensureSchema()

  // Get commenters first (ordered by comment time)
  const commentersResult = await db.execute({
    sql: `SELECT DISTINCT u.id, u.twitter_username as username, u.twitter_avatar as avatar, 'comment' as type
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.suggestion_id = ?
          ORDER BY c.created_at ASC`,
    args: [suggestionId],
  })
  const commenters = commentersResult.rows as unknown as Contributor[]

  // Get voters (excluding those who already commented)
  const commenterIds = commenters.map((c) => c.id)
  const votersResult = await db.execute({
    sql: `SELECT DISTINCT u.id, u.twitter_username as username, u.twitter_avatar as avatar, 'vote' as type
          FROM votes v
          JOIN users u ON v.user_id = u.id
          WHERE v.suggestion_id = ? AND v.vote_type = 'up'
          ORDER BY v.created_at ASC`,
    args: [suggestionId],
  })
  const allVoters = votersResult.rows as unknown as Contributor[]
  const voters = allVoters.filter((v) => !commenterIds.includes(v.id))

  // Combine: commenters first, then voters
  const allContributors = [...commenters, ...voters]
  const totalCount = allContributors.length
  const contributors = allContributors.slice(0, limit)

  return { contributors, totalCount }
}

// Create suggestion with user_id
export async function createSuggestionWithUser(content: string, userId: number): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO suggestions (content, user_id) VALUES (?, ?)',
    args: [content, userId],
  })
  return Number(result.lastInsertRowid)
}

// Add vote with user_id
export async function addVoteWithUser(
  suggestionId: number,
  userId: number,
  voteType: 'up' | 'down' = 'up'
): Promise<void> {
  await ensureSchema()
  // Check if user already voted (by user_id)
  const existing = await db.execute({
    sql: 'SELECT id FROM votes WHERE suggestion_id = ? AND user_id = ?',
    args: [suggestionId, userId],
  })
  if (existing.rows.length > 0) {
    throw new Error('Already voted on this suggestion')
  }

  // Get next vote order for early voter bonus tracking
  const orderResult = await db.execute({
    sql: 'SELECT COALESCE(MAX(vote_order), 0) + 1 as next_order FROM votes WHERE suggestion_id = ?',
    args: [suggestionId],
  })
  const voteOrder = (orderResult.rows[0] as unknown as { next_order: number }).next_order

  await db.execute({
    sql: 'INSERT INTO votes (suggestion_id, user_id, vote_type, voter_hash, vote_order) VALUES (?, ?, ?, ?, ?)',
    args: [suggestionId, userId, voteType, `user:${userId}`, voteOrder],
  })
  if (voteType === 'up') {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 1 WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 1) WHERE id = ?',
      args: [suggestionId],
    })
  }
}

// Get vote type by user_id
export async function getVoteTypeByUser(
  suggestionId: number,
  userId: number
): Promise<'up' | 'down' | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT vote_type FROM votes WHERE suggestion_id = ? AND user_id = ?',
    args: [suggestionId, userId],
  })
  if (result.rows.length === 0) return null
  return (result.rows[0] as unknown as { vote_type: 'up' | 'down' }).vote_type
}

// Remove vote by user_id
export async function removeVoteByUser(
  suggestionId: number,
  userId: number
): Promise<'up' | 'down' | null> {
  await ensureSchema()
  const voteType = await getVoteTypeByUser(suggestionId, userId)
  if (!voteType) return null

  await db.execute({
    sql: 'DELETE FROM votes WHERE suggestion_id = ? AND user_id = ?',
    args: [suggestionId, userId],
  })

  if (voteType === 'up') {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 1) WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 1 WHERE id = ?',
      args: [suggestionId],
    })
  }

  return voteType
}

// Change vote by user_id
export async function changeVoteByUser(
  suggestionId: number,
  userId: number,
  newVoteType: 'up' | 'down'
): Promise<void> {
  await ensureSchema()
  const currentVoteType = await getVoteTypeByUser(suggestionId, userId)
  if (!currentVoteType || currentVoteType === newVoteType) return

  await db.execute({
    sql: 'UPDATE votes SET vote_type = ? WHERE suggestion_id = ? AND user_id = ?',
    args: [newVoteType, suggestionId, userId],
  })

  if (newVoteType === 'up') {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = votes + 2 WHERE id = ?',
      args: [suggestionId],
    })
  } else {
    await db.execute({
      sql: 'UPDATE suggestions SET votes = MAX(0, votes - 2) WHERE id = ?',
      args: [suggestionId],
    })
  }
}

// Add comment with user_id
export async function addCommentWithUser(
  suggestionId: number,
  content: string,
  userId: number
): Promise<number> {
  await ensureSchema()
  // Check if user already commented
  const existing = await db.execute({
    sql: 'SELECT id FROM comments WHERE suggestion_id = ? AND user_id = ?',
    args: [suggestionId, userId],
  })
  if (existing.rows.length > 0) {
    throw new Error('Already commented on this suggestion')
  }
  const result = await db.execute({
    sql: 'INSERT INTO comments (suggestion_id, content, user_id, commenter_hash) VALUES (?, ?, ?, ?)',
    args: [suggestionId, content, userId, `user:${userId}`],
  })
  return Number(result.lastInsertRowid)
}

// Update comment by user_id
export async function updateCommentByUser(
  commentId: number,
  content: string,
  userId: number
): Promise<boolean> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'UPDATE comments SET content = ? WHERE id = ? AND user_id = ?',
    args: [content, commentId, userId],
  })
  return result.rowsAffected > 0
}

// Get user's comment on a suggestion
export async function getUserCommentByUserId(
  suggestionId: number,
  userId: number
): Promise<Comment | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM comments WHERE suggestion_id = ? AND user_id = ?',
    args: [suggestionId, userId],
  })
  return (result.rows[0] as unknown as Comment) || null
}

// Delete suggestion by user_id
export async function deleteSuggestionByUser(id: number, userId: number): Promise<boolean> {
  await ensureSchema()
  const result = await db.execute({
    sql: `DELETE FROM suggestions WHERE id = ? AND user_id = ? AND status = 'pending'`,
    args: [id, userId],
  })
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

// Expedite payment functions
export async function createExpeditePayment(
  suggestionId: number,
  userId: number,
  checkoutSessionId: string,
  amountCents: number = 400
): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: `INSERT INTO expedite_payments (suggestion_id, user_id, stripe_checkout_session_id, amount_cents)
          VALUES (?, ?, ?, ?)`,
    args: [suggestionId, userId, checkoutSessionId, amountCents],
  })
  return Number(result.lastInsertRowid)
}

export async function completeExpeditePayment(
  checkoutSessionId: string,
  paymentIntentId: string
): Promise<ExpeditePayment | null> {
  await ensureSchema()
  // Get the payment record first
  const result = await db.execute({
    sql: 'SELECT * FROM expedite_payments WHERE stripe_checkout_session_id = ?',
    args: [checkoutSessionId],
  })
  if (result.rows.length === 0) return null
  const payment = result.rows[0] as unknown as ExpeditePayment

  // Update payment to completed
  await db.execute({
    sql: `UPDATE expedite_payments
          SET status = 'completed', stripe_payment_intent_id = ?, completed_at = datetime('now')
          WHERE stripe_checkout_session_id = ?`,
    args: [paymentIntentId, checkoutSessionId],
  })

  // Update suggestion's cached expedite amount
  await updateSuggestionExpediteAmount(payment.suggestion_id)

  return { ...payment, status: 'completed', stripe_payment_intent_id: paymentIntentId }
}

export async function failExpeditePayment(checkoutSessionId: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE expedite_payments SET status = 'failed' WHERE stripe_checkout_session_id = ?`,
    args: [checkoutSessionId],
  })
}

export async function getExpeditePaymentBySession(
  checkoutSessionId: string
): Promise<ExpeditePayment | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM expedite_payments WHERE stripe_checkout_session_id = ?',
    args: [checkoutSessionId],
  })
  return (result.rows[0] as unknown as ExpeditePayment) || null
}

export async function getCompletedExpeditePayments(
  suggestionId: number
): Promise<ExpeditePayment[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT * FROM expedite_payments
          WHERE suggestion_id = ? AND status = 'completed'
          ORDER BY created_at ASC`,
    args: [suggestionId],
  })
  return result.rows as unknown as ExpeditePayment[]
}

export async function markExpediteRefunded(
  paymentId: number,
  refundId: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE expedite_payments
          SET status = 'refunded', refund_id = ?, refunded_at = datetime('now')
          WHERE id = ?`,
    args: [refundId, paymentId],
  })
}

export async function updateSuggestionExpediteAmount(suggestionId: number): Promise<void> {
  await ensureSchema()
  // Calculate total from completed payments
  const result = await db.execute({
    sql: `SELECT COALESCE(SUM(amount_cents), 0) as total
          FROM expedite_payments
          WHERE suggestion_id = ? AND status = 'completed'`,
    args: [suggestionId],
  })
  const total = (result.rows[0] as unknown as { total: number }).total

  // Update suggestion's cached amount
  await db.execute({
    sql: 'UPDATE suggestions SET expedite_amount_cents = ? WHERE id = ?',
    args: [total, suggestionId],
  })
}

// Increment suggestion's expedite amount directly (used when spending credits)
export async function incrementSuggestionExpediteAmount(
  suggestionId: number,
  amountCents: number = 100
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'UPDATE suggestions SET expedite_amount_cents = COALESCE(expedite_amount_cents, 0) + ? WHERE id = ?',
    args: [amountCents, suggestionId],
  })
}

export async function getExpediteAmount(suggestionId: number): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT expedite_amount_cents FROM suggestions WHERE id = ?',
    args: [suggestionId],
  })
  if (result.rows.length === 0) return 0
  return (result.rows[0] as unknown as { expedite_amount_cents: number | null }).expedite_amount_cents || 0
}

// Get all pending suggestions with expedite amounts (for Ralph selection)
export async function getSuggestionsWithExpedite(): Promise<Suggestion[]> {
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
    ORDER BY s.expedite_amount_cents DESC, s.votes DESC, s.created_at ASC
  `)
  return result.rows as unknown as Suggestion[]
}

// Credit system functions
export async function getUserCredits(userId: number): Promise<UserCredits> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM user_credits WHERE user_id = ?',
    args: [userId],
  })
  if (result.rows.length === 0) {
    // Initialize credits record for new user
    await db.execute({
      sql: 'INSERT INTO user_credits (user_id, balance, total_purchased) VALUES (?, 0, 0)',
      args: [userId],
    })
    return {
      id: 0,
      user_id: userId,
      balance: 0,
      total_purchased: 0,
      updated_at: new Date().toISOString(),
    }
  }
  return result.rows[0] as unknown as UserCredits
}

export async function hasEverPurchased(userId: number): Promise<boolean> {
  await ensureSchema()
  const credits = await getUserCredits(userId)
  return credits.total_purchased > 0
}

export async function addCredits(userId: number, amount: number): Promise<void> {
  await ensureSchema()
  // Ensure user credits record exists
  await getUserCredits(userId)
  await db.execute({
    sql: `UPDATE user_credits
          SET balance = balance + ?,
              total_purchased = total_purchased + ?,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [amount, amount, userId],
  })
}

export async function useCredit(userId: number): Promise<boolean> {
  await ensureSchema()
  const credits = await getUserCredits(userId)
  if (credits.balance <= 0) {
    return false
  }
  await db.execute({
    sql: `UPDATE user_credits
          SET balance = balance - 1,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [userId],
  })
  return true
}

export async function createCreditPurchase(
  userId: number,
  creditsAmount: number,
  amountCents: number,
  sessionId: string
): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: `INSERT INTO credit_purchases (user_id, credits_amount, amount_cents, stripe_checkout_session_id)
          VALUES (?, ?, ?, ?)`,
    args: [userId, creditsAmount, amountCents, sessionId],
  })
  return Number(result.lastInsertRowid)
}

export async function completeCreditPurchase(
  sessionId: string,
  paymentIntentId: string
): Promise<CreditPurchase | null> {
  await ensureSchema()
  // Get the purchase record
  const result = await db.execute({
    sql: 'SELECT * FROM credit_purchases WHERE stripe_checkout_session_id = ?',
    args: [sessionId],
  })
  if (result.rows.length === 0) return null
  const purchase = result.rows[0] as unknown as CreditPurchase

  // Update purchase to completed
  await db.execute({
    sql: `UPDATE credit_purchases
          SET status = 'completed', stripe_payment_intent_id = ?, completed_at = datetime('now')
          WHERE stripe_checkout_session_id = ?`,
    args: [paymentIntentId, sessionId],
  })

  // Add credits to user balance
  await addCredits(purchase.user_id, purchase.credits_amount)

  return { ...purchase, status: 'completed', stripe_payment_intent_id: paymentIntentId }
}

export async function getCreditPurchaseBySession(
  sessionId: string
): Promise<CreditPurchase | null> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'SELECT * FROM credit_purchases WHERE stripe_checkout_session_id = ?',
    args: [sessionId],
  })
  return (result.rows[0] as unknown as CreditPurchase) || null
}

export async function failCreditPurchase(sessionId: string): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: `UPDATE credit_purchases SET status = 'failed' WHERE stripe_checkout_session_id = ?`,
    args: [sessionId],
  })
}

// Chat message interface
export interface ChatMessage {
  id: number
  user_id: number
  content: string
  created_at: string
  // Joined from users table
  username?: string
  avatar?: string
}

// Chat message functions
export async function getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT m.id, m.user_id, m.content, m.created_at,
                 u.twitter_username as username, u.twitter_avatar as avatar
          FROM chat_messages m
          JOIN users u ON m.user_id = u.id
          ORDER BY m.created_at DESC
          LIMIT ?`,
    args: [limit],
  })
  // Reverse to get oldest first for display
  return (result.rows as unknown as ChatMessage[]).reverse()
}

export async function addChatMessage(userId: number, content: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO chat_messages (user_id, content) VALUES (?, ?)',
    args: [userId, content],
  })
  return Number(result.lastInsertRowid)
}

export async function getChatMessagesSince(sinceId: number, limit: number = 50): Promise<ChatMessage[]> {
  await ensureSchema()
  const result = await db.execute({
    sql: `SELECT m.id, m.user_id, m.content, m.created_at,
                 u.twitter_username as username, u.twitter_avatar as avatar
          FROM chat_messages m
          JOIN users u ON m.user_id = u.id
          WHERE m.id > ?
          ORDER BY m.created_at ASC
          LIMIT ?`,
    args: [sinceId, limit],
  })
  return result.rows as unknown as ChatMessage[]
}

export { ensureSchema }
export default db
