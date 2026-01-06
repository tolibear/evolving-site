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
  comment_count?: number
}

export interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
  updated_at: string
  automation_mode: 'manual' | 'automated'
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

export async function createSuggestion(content: string): Promise<number> {
  await ensureSchema()
  const result = await db.execute({
    sql: 'INSERT INTO suggestions (content) VALUES (?)',
    args: [content],
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

export async function addVote(
  suggestionId: number,
  voterHash: string
): Promise<void> {
  await ensureSchema()
  await db.execute({
    sql: 'INSERT INTO votes (suggestion_id, voter_hash) VALUES (?, ?)',
    args: [suggestionId, voterHash],
  })
  await db.execute({
    sql: 'UPDATE suggestions SET votes = votes + 1 WHERE id = ?',
    args: [suggestionId],
  })
}

// Status queries
export async function getStatus(): Promise<Status> {
  await ensureSchema()
  const result = await db.execute(
    "SELECT current_suggestion_id, state, message, updated_at, COALESCE(automation_mode, 'manual') as automation_mode FROM status WHERE id = 1"
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

export default db
