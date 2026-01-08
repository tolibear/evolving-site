/**
 * Reputation System
 *
 * Core mechanics:
 * - Rep earned when suggestions you voted on get implemented
 * - Early voter bonus: First 5 voters get 3x rep, next 10 get 2x, rest get 1x
 * - Suggester bonus: Person who submitted gets 50% of total rep pool
 * - Denial visibility: No rep loss, but track backed-denied count
 *
 * Tiers:
 * - Bronze: 0 rep, 1x vote power
 * - Silver: 100 rep, 2x vote power
 * - Gold: 500 rep, 3x vote power
 * - Platinum: 2000 rep, 3x vote power + badge
 *
 * Vote weight formula (logarithmic):
 * voteWeight = 1 + log2(1 + reputation / 100)
 */

import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Constants
export const TIERS = {
  bronze: { minRep: 0, votePower: 1, color: '#CD7F32', icon: '🥉' },
  silver: { minRep: 100, votePower: 2, color: '#C0C0C0', icon: '🥈' },
  gold: { minRep: 500, votePower: 3, color: '#FFD700', icon: '🥇' },
  platinum: { minRep: 2000, votePower: 3, color: '#E5E4E2', icon: '💎' },
} as const

export type TierName = keyof typeof TIERS

export const ACHIEVEMENTS = {
  pioneer: { name: 'Pioneer', description: 'First 100 users', icon: '🚀' },
  kingmaker: { name: 'Kingmaker', description: '10 suggestions you voted on shipped', icon: '👑' },
  visionary: { name: 'Visionary', description: '5 of your suggestions shipped', icon: '🔮' },
  streak_master: { name: 'Streak Master', description: '30-day voting streak', icon: '🔥' },
  whale: { name: 'Whale', description: 'Reached Platinum tier', icon: '🐋' },
  recruiter: { name: 'Recruiter', description: 'Referred 10+ active users', icon: '🎯' },
} as const

export type AchievementType = keyof typeof ACHIEVEMENTS

// Base rep awarded when a suggestion is implemented
const BASE_REP = 10

// Multipliers for early voters
const EARLY_VOTER_MULTIPLIERS = [
  { maxOrder: 5, multiplier: 3 },   // First 5 voters get 3x
  { maxOrder: 15, multiplier: 2 },  // Next 10 (6-15) get 2x
  // Everyone else gets 1x
]

// Suggester gets this percentage of total rep pool
const SUGGESTER_BONUS_PERCENT = 50

// Referral percentage (ongoing)
const REFERRAL_PERCENT = 5

// Underdog threshold (suggestions with fewer than this many votes get bonus)
const UNDERDOG_THRESHOLD = 3
const UNDERDOG_MULTIPLIER = 2

// Streak multipliers (caps at 7 days)
const MAX_STREAK_MULTIPLIER = 1.5
const STREAK_MULTIPLIER_PER_DAY = 0.07 // 1.0 + (days * 0.07), max 1.5 at 7 days

/**
 * Calculate tier based on reputation
 */
export function getTier(rep: number): TierName {
  if (rep >= TIERS.platinum.minRep) return 'platinum'
  if (rep >= TIERS.gold.minRep) return 'gold'
  if (rep >= TIERS.silver.minRep) return 'silver'
  return 'bronze'
}

/**
 * Calculate vote weight based on reputation (logarithmic formula)
 * voteWeight = 1 + log2(1 + reputation / 100)
 */
export function getVoteWeight(rep: number): number {
  return 1 + Math.log2(1 + rep / 100)
}

/**
 * Get vote power based on tier (discrete: 1, 2, or 3)
 */
export function getVotePower(tier: TierName): number {
  return TIERS[tier].votePower
}

/**
 * Calculate early voter multiplier based on vote order
 */
export function getEarlyVoterMultiplier(voteOrder: number): number {
  for (const { maxOrder, multiplier } of EARLY_VOTER_MULTIPLIERS) {
    if (voteOrder <= maxOrder) return multiplier
  }
  return 1
}

/**
 * Calculate streak multiplier based on current streak
 */
export function getStreakMultiplier(streak: number): number {
  const multiplier = 1 + Math.min(streak, 7) * STREAK_MULTIPLIER_PER_DAY
  return Math.min(multiplier, MAX_STREAK_MULTIPLIER)
}

export interface UserReputation {
  user_id: number
  total_rep: number
  weekly_rep: number
  tier: TierName
  current_streak: number
  longest_streak: number
  last_vote_date: string | null
  suggestions_backed_denied: number
  updated_at: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  avatar: string | null
  total_rep: number
  weekly_rep: number
  tier: TierName
  achievements: AchievementType[]
}

/**
 * Get or create user reputation record
 */
export async function getUserReputation(userId: number): Promise<UserReputation> {
  const result = await db.execute({
    sql: 'SELECT * FROM user_reputation WHERE user_id = ?',
    args: [userId],
  })

  if (result.rows.length === 0) {
    // Create new reputation record
    await db.execute({
      sql: `INSERT INTO user_reputation (user_id, total_rep, weekly_rep, tier)
            VALUES (?, 0, 0, 'bronze')`,
      args: [userId],
    })
    return {
      user_id: userId,
      total_rep: 0,
      weekly_rep: 0,
      tier: 'bronze',
      current_streak: 0,
      longest_streak: 0,
      last_vote_date: null,
      suggestions_backed_denied: 0,
      updated_at: new Date().toISOString(),
    }
  }

  return result.rows[0] as unknown as UserReputation
}

/**
 * Add reputation to a user
 */
export async function addReputation(
  userId: number,
  amount: number,
  updateWeekly: boolean = true
): Promise<void> {
  const rep = await getUserReputation(userId)
  const newTotal = rep.total_rep + amount
  const newWeekly = updateWeekly ? rep.weekly_rep + amount : rep.weekly_rep
  const newTier = getTier(newTotal)

  await db.execute({
    sql: `UPDATE user_reputation
          SET total_rep = ?,
              weekly_rep = ?,
              tier = ?,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [newTotal, newWeekly, newTier, userId],
  })

  // Check for tier-based achievements
  if (newTier === 'platinum' && rep.tier !== 'platinum') {
    await grantAchievement(userId, 'whale')
  }
}

export interface RepDistributionResult {
  suggesterId: number | null
  suggesterRep: number
  voterCount: number
  totalVoterRep: number
  distribution: Map<number, number>
}

/**
 * Distribute reputation when a suggestion is implemented
 * Looks up suggestion details and distributes rep to suggester and voters
 */
export async function distributeRepForImplementation(
  suggestionId: number
): Promise<RepDistributionResult> {
  // Look up suggestion details
  const suggestionResult = await db.execute({
    sql: 'SELECT user_id, votes FROM suggestions WHERE id = ?',
    args: [suggestionId],
  })

  if (suggestionResult.rows.length === 0) {
    return {
      suggesterId: null,
      suggesterRep: 0,
      voterCount: 0,
      totalVoterRep: 0,
      distribution: new Map(),
    }
  }

  const suggestion = suggestionResult.rows[0] as unknown as {
    user_id: number | null
    votes: number
  }

  const suggesterId = suggestion.user_id
  const votesWhenImplemented = suggestion.votes
  const repDistribution = new Map<number, number>()

  // Get all upvoters with their vote order and user info
  const votersResult = await db.execute({
    sql: `SELECT v.user_id, v.vote_order, ur.current_streak
          FROM votes v
          LEFT JOIN user_reputation ur ON v.user_id = ur.user_id
          WHERE v.suggestion_id = ? AND v.vote_type = 'up' AND v.user_id IS NOT NULL
          ORDER BY v.vote_order ASC`,
    args: [suggestionId],
  })

  const voters = votersResult.rows as unknown as Array<{
    user_id: number
    vote_order: number | null
    current_streak: number | null
  }>

  // Check if this was an underdog pick
  const isUnderdog = votesWhenImplemented < UNDERDOG_THRESHOLD

  // Calculate rep for each voter
  for (const voter of voters) {
    if (!voter.user_id) continue

    let rep = BASE_REP

    // Early voter bonus
    if (voter.vote_order) {
      rep *= getEarlyVoterMultiplier(voter.vote_order)
    }

    // Streak bonus
    const streak = voter.current_streak || 0
    rep *= getStreakMultiplier(streak)

    // Underdog bonus
    if (isUnderdog) {
      rep *= UNDERDOG_MULTIPLIER
    }

    rep = Math.round(rep)
    repDistribution.set(voter.user_id, rep)

    // Add rep to user
    await addReputation(voter.user_id, rep)

    // Check for kingmaker achievement (10 suggestions voted on shipped)
    await checkKingmakerAchievement(voter.user_id)
  }

  // Calculate voter stats before suggester bonus
  const voterCount = voters.filter(v => v.user_id).length
  let totalVoterRep = 0
  for (const [, rep] of repDistribution) {
    totalVoterRep += rep
  }

  // Suggester bonus (50% of base rep, separate from voter pool)
  let suggesterRepAwarded = 0
  if (suggesterId) {
    suggesterRepAwarded = Math.round(BASE_REP * (SUGGESTER_BONUS_PERCENT / 100) * (isUnderdog ? UNDERDOG_MULTIPLIER : 1))
    const existingRep = repDistribution.get(suggesterId) || 0
    repDistribution.set(suggesterId, existingRep + suggesterRepAwarded)
    await addReputation(suggesterId, suggesterRepAwarded)

    // Check for visionary achievement (5 of your suggestions shipped)
    await checkVisionaryAchievement(suggesterId)
  }

  // Distribute referral bonuses (5% of each user's earned rep goes to their referrer)
  for (const [userId, earnedRep] of repDistribution) {
    const referralResult = await db.execute({
      sql: 'SELECT referrer_id FROM referrals WHERE referred_id = ? AND activated = true',
      args: [userId],
    })
    if (referralResult.rows.length > 0) {
      const referrerId = (referralResult.rows[0] as unknown as { referrer_id: number }).referrer_id
      const referralRep = Math.round(earnedRep * (REFERRAL_PERCENT / 100))
      if (referralRep > 0) {
        await addReputation(referrerId, referralRep)
      }
    }
  }

  return {
    suggesterId,
    suggesterRep: suggesterRepAwarded,
    voterCount,
    totalVoterRep,
    distribution: repDistribution,
  }
}

/**
 * Record when a user backed a denied suggestion
 * Returns the number of users affected
 */
export async function incrementBackedDenied(suggestionId: number): Promise<number> {
  // Get all upvoters
  const votersResult = await db.execute({
    sql: `SELECT user_id FROM votes
          WHERE suggestion_id = ? AND vote_type = 'up' AND user_id IS NOT NULL`,
    args: [suggestionId],
  })

  let count = 0
  for (const row of votersResult.rows) {
    const userId = (row as unknown as { user_id: number }).user_id
    // Ensure user has a reputation record
    await getUserReputation(userId)
    await db.execute({
      sql: `UPDATE user_reputation
            SET suggestions_backed_denied = suggestions_backed_denied + 1,
                updated_at = datetime('now')
            WHERE user_id = ?`,
      args: [userId],
    })
    count++
  }
  return count
}

/**
 * Update user's voting streak
 */
export async function updateVotingStreak(userId: number): Promise<void> {
  const rep = await getUserReputation(userId)
  const today = new Date().toISOString().split('T')[0]
  const lastVote = rep.last_vote_date

  let newStreak = rep.current_streak

  if (!lastVote) {
    // First vote ever
    newStreak = 1
  } else {
    const lastDate = new Date(lastVote)
    const todayDate = new Date(today)
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Same day, no change
      return
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      newStreak = rep.current_streak + 1
    } else {
      // Streak broken
      newStreak = 1
    }
  }

  const newLongest = Math.max(newStreak, rep.longest_streak)

  await db.execute({
    sql: `UPDATE user_reputation
          SET current_streak = ?,
              longest_streak = ?,
              last_vote_date = ?,
              updated_at = datetime('now')
          WHERE user_id = ?`,
    args: [newStreak, newLongest, today, userId],
  })

  // Check for streak master achievement
  if (newStreak >= 30) {
    await grantAchievement(userId, 'streak_master')
  }
}

/**
 * Get leaderboard (all-time or weekly)
 */
export async function getLeaderboard(
  type: 'all_time' | 'weekly' = 'all_time',
  limit: number = 50,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const orderBy = type === 'weekly' ? 'ur.weekly_rep' : 'ur.total_rep'

  const result = await db.execute({
    sql: `SELECT
            ur.user_id,
            u.twitter_username as username,
            u.twitter_avatar as avatar,
            ur.total_rep,
            ur.weekly_rep,
            ur.tier
          FROM user_reputation ur
          JOIN users u ON ur.user_id = u.id
          WHERE ur.total_rep > 0
          ORDER BY ${orderBy} DESC
          LIMIT ? OFFSET ?`,
    args: [limit, offset],
  })

  const entries: LeaderboardEntry[] = []
  let rank = offset + 1

  for (const row of result.rows) {
    const r = row as unknown as {
      user_id: number
      username: string
      avatar: string | null
      total_rep: number
      weekly_rep: number
      tier: TierName
    }

    // Get achievements for this user
    const achievementsResult = await db.execute({
      sql: 'SELECT achievement_type FROM user_achievements WHERE user_id = ?',
      args: [r.user_id],
    })
    const achievements = achievementsResult.rows.map(
      (a) => (a as unknown as { achievement_type: AchievementType }).achievement_type
    )

    entries.push({
      rank: rank++,
      user_id: r.user_id,
      username: r.username,
      avatar: r.avatar,
      total_rep: r.total_rep,
      weekly_rep: r.weekly_rep,
      tier: r.tier,
      achievements,
    })
  }

  return entries
}

/**
 * Get user's rank on leaderboard
 */
export async function getUserRank(userId: number, type: 'all_time' | 'weekly' = 'all_time'): Promise<number | null> {
  const rep = await getUserReputation(userId)
  const repField = type === 'weekly' ? rep.weekly_rep : rep.total_rep

  if (repField === 0) return null

  const result = await db.execute({
    sql: `SELECT COUNT(*) + 1 as rank
          FROM user_reputation
          WHERE ${type === 'weekly' ? 'weekly_rep' : 'total_rep'} > ?`,
    args: [repField],
  })

  return (result.rows[0] as unknown as { rank: number }).rank
}

/**
 * Grant an achievement to a user
 */
export async function grantAchievement(userId: number, achievementType: AchievementType): Promise<boolean> {
  try {
    await db.execute({
      sql: 'INSERT INTO user_achievements (user_id, achievement_type) VALUES (?, ?)',
      args: [userId, achievementType],
    })
    return true
  } catch {
    // Already has this achievement
    return false
  }
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(userId: number): Promise<AchievementType[]> {
  const result = await db.execute({
    sql: 'SELECT achievement_type FROM user_achievements WHERE user_id = ?',
    args: [userId],
  })
  return result.rows.map((r) => (r as unknown as { achievement_type: AchievementType }).achievement_type)
}

/**
 * Check and grant kingmaker achievement (10 suggestions voted on shipped)
 */
async function checkKingmakerAchievement(userId: number): Promise<void> {
  const result = await db.execute({
    sql: `SELECT COUNT(DISTINCT v.suggestion_id) as count
          FROM votes v
          JOIN suggestions s ON v.suggestion_id = s.id
          WHERE v.user_id = ? AND v.vote_type = 'up' AND s.status = 'implemented'`,
    args: [userId],
  })
  const count = (result.rows[0] as unknown as { count: number }).count
  if (count >= 10) {
    await grantAchievement(userId, 'kingmaker')
  }
}

/**
 * Check and grant visionary achievement (5 of your suggestions shipped)
 */
async function checkVisionaryAchievement(userId: number): Promise<void> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM suggestions
          WHERE user_id = ? AND status = 'implemented'`,
    args: [userId],
  })
  const count = (result.rows[0] as unknown as { count: number }).count
  if (count >= 5) {
    await grantAchievement(userId, 'visionary')
  }
}

/**
 * Reset weekly reputation (call at start of each week)
 */
export async function resetWeeklyRep(): Promise<void> {
  // First, snapshot current weekly standings
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of current week
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const standings = await db.execute({
    sql: `SELECT user_id, weekly_rep
          FROM user_reputation
          WHERE weekly_rep > 0
          ORDER BY weekly_rep DESC`,
    args: [],
  })

  let rank = 1
  for (const row of standings.rows) {
    const r = row as unknown as { user_id: number; weekly_rep: number }
    await db.execute({
      sql: `INSERT INTO leaderboard_snapshots (user_id, week_start, weekly_rep, rank)
            VALUES (?, ?, ?, ?)`,
      args: [r.user_id, weekStartStr, r.weekly_rep, rank++],
    })
  }

  // Reset weekly rep
  await db.execute({
    sql: `UPDATE user_reputation SET weekly_rep = 0, updated_at = datetime('now')`,
    args: [],
  })
}

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(userId: number): Promise<string> {
  // Check if user already has a code
  const existing = await db.execute({
    sql: 'SELECT referral_code FROM users WHERE id = ? AND referral_code IS NOT NULL',
    args: [userId],
  })

  if (existing.rows.length > 0) {
    return (existing.rows[0] as unknown as { referral_code: string }).referral_code
  }

  // Generate a unique code
  const code = `REF${userId.toString(36).toUpperCase()}${Date.now().toString(36).toUpperCase().slice(-4)}`

  await db.execute({
    sql: 'UPDATE users SET referral_code = ? WHERE id = ?',
    args: [code, userId],
  })

  return code
}

/**
 * Process a referral signup
 */
export async function processReferral(referralCode: string, newUserId: number): Promise<boolean> {
  // Find referrer by code
  const referrerResult = await db.execute({
    sql: 'SELECT id FROM users WHERE referral_code = ?',
    args: [referralCode],
  })

  if (referrerResult.rows.length === 0) return false

  const referrerId = (referrerResult.rows[0] as unknown as { id: number }).id

  // Don't allow self-referral
  if (referrerId === newUserId) return false

  // Check if user was already referred
  const existingResult = await db.execute({
    sql: 'SELECT id FROM referrals WHERE referred_id = ?',
    args: [newUserId],
  })

  if (existingResult.rows.length > 0) return false

  // Create referral record
  await db.execute({
    sql: `INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)`,
    args: [referrerId, newUserId],
  })

  // Update user's referred_by field
  await db.execute({
    sql: 'UPDATE users SET referred_by = ? WHERE id = ?',
    args: [referrerId, newUserId],
  })

  return true
}

/**
 * Activate a referral (when referred user casts first vote AND has been active 7+ days)
 */
export async function activateReferralIfEligible(userId: number): Promise<boolean> {
  // Check if user has a pending referral
  const referralResult = await db.execute({
    sql: `SELECT r.id, r.referrer_id, u.created_at
          FROM referrals r
          JOIN users u ON r.referred_id = u.id
          WHERE r.referred_id = ? AND r.activated = false`,
    args: [userId],
  })

  if (referralResult.rows.length === 0) return false

  const referral = referralResult.rows[0] as unknown as {
    id: number
    referrer_id: number
    created_at: string
  }

  // Check if account is 7+ days old
  const createdAt = new Date(referral.created_at)
  const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceCreation < 7) return false

  // Activate the referral
  await db.execute({
    sql: `UPDATE referrals SET activated = true, activated_at = datetime('now') WHERE id = ?`,
    args: [referral.id],
  })

  // Check for recruiter achievement (10+ active referrals)
  const activeReferralsResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND activated = true',
    args: [referral.referrer_id],
  })
  const count = (activeReferralsResult.rows[0] as unknown as { count: number }).count
  if (count >= 10) {
    await grantAchievement(referral.referrer_id, 'recruiter')
  }

  return true
}

/**
 * Get next vote order for a suggestion
 */
export async function getNextVoteOrder(suggestionId: number): Promise<number> {
  const result = await db.execute({
    sql: 'SELECT COALESCE(MAX(vote_order), 0) + 1 as next_order FROM votes WHERE suggestion_id = ?',
    args: [suggestionId],
  })
  return (result.rows[0] as unknown as { next_order: number }).next_order
}
