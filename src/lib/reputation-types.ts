/**
 * Reputation System - Client-safe types and constants
 *
 * This file contains only types and constants that can be safely imported
 * on the client side. Database operations are in reputation.ts (server-only).
 */

// Constants
export const TIERS = {
  bronze: { minRep: 0, color: '#CD7F32', icon: '🥉' },
  silver: { minRep: 100, color: '#C0C0C0', icon: '🥈' },
  gold: { minRep: 500, color: '#FFD700', icon: '🥇' },
  platinum: { minRep: 2000, color: '#E5E4E2', icon: '💎' },
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

/**
 * Calculate tier based on reputation
 */
export function getTier(rep: number): TierName {
  if (rep >= TIERS.platinum.minRep) return 'platinum'
  if (rep >= TIERS.gold.minRep) return 'gold'
  if (rep >= TIERS.silver.minRep) return 'silver'
  return 'bronze'
}


// Type definitions
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

export interface RepDistributionResult {
  suggesterId: number | null
  suggesterRep: number
  voterCount: number
  totalVoterRep: number
  distribution: Map<number, number>
}
