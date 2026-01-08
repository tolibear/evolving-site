/**
 * Twitter Bot (@RalphTheBuilder)
 *
 * Personality: Hype/excited tone, celebratory, uses emojis
 *
 * Post triggers:
 * 1. Feature implemented - Tag suggester, show feature name, vote count
 * 2. Weekly leaderboard - Top 3 users of the week
 * 3. Milestone achievements - When users hit major rep milestones
 */

import { TwitterApi } from 'twitter-api-v2'

// Initialize Twitter client
function getTwitterClient(): TwitterApi | null {
  const apiKey = process.env.TWITTER_API_KEY
  const apiSecret = process.env.TWITTER_API_SECRET
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn('Twitter API credentials not configured')
    return null
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  })
}

export interface FeatureShippedData {
  suggestionId: number
  featureName: string
  suggesterTwitterHandle: string | null
  voteCount: number
  implementationTimeMinutes?: number
}

export interface LeaderboardData {
  weekOf: string
  topUsers: Array<{
    rank: number
    username: string
    twitterHandle: string | null
    rep: number
  }>
}

export interface MilestoneData {
  userId: number
  username: string
  twitterHandle: string | null
  milestone: 'silver' | 'gold' | 'platinum' | 'visionary' | 'kingmaker'
  totalRep: number
}

/**
 * Tweet when a feature is shipped
 */
export async function tweetFeatureShipped(data: FeatureShippedData): Promise<string | null> {
  const client = getTwitterClient()
  if (!client) return null

  try {
    // Build the tweet text
    const suggesterMention = data.suggesterTwitterHandle
      ? `@${data.suggesterTwitterHandle.replace('@', '')}`
      : 'a community member'

    const timeStr = data.implementationTimeMinutes
      ? ` Built by AI in ${data.implementationTimeMinutes} minutes!`
      : ' Built by AI!'

    // Truncate feature name if needed (leave room for rest of tweet)
    const maxFeatureLength = 100
    const featureName = data.featureName.length > maxFeatureLength
      ? data.featureName.substring(0, maxFeatureLength - 3) + '...'
      : data.featureName

    const tweetText = `🚀 SHIPPED!

${suggesterMention} suggested "${featureName}" and ${data.voteCount} believer${data.voteCount !== 1 ? 's' : ''} backed it.${timeStr}

Who's next? 👇
https://evolving-site.vercel.app`

    const response = await client.v2.tweet(tweetText)
    console.log('✓ Posted feature shipped tweet:', response.data.id)
    return response.data.id
  } catch (error) {
    console.error('Failed to post feature shipped tweet:', error)
    return null
  }
}

/**
 * Tweet weekly leaderboard
 */
export async function tweetWeeklyLeaderboard(data: LeaderboardData): Promise<string | null> {
  const client = getTwitterClient()
  if (!client) return null

  try {
    const medals = ['🥇', '🥈', '🥉']

    const rankings = data.topUsers
      .slice(0, 3)
      .map((user, i) => {
        const handle = user.twitterHandle
          ? `@${user.twitterHandle.replace('@', '')}`
          : user.username
        return `${medals[i]} ${handle} - ${user.rep} rep`
      })
      .join('\n')

    const tweetText = `📊 Weekly Leaderboard (${data.weekOf})

Top contributors this week:

${rankings}

Keep voting, keep building! 💪
https://evolving-site.vercel.app`

    const response = await client.v2.tweet(tweetText)
    console.log('✓ Posted weekly leaderboard tweet:', response.data.id)
    return response.data.id
  } catch (error) {
    console.error('Failed to post weekly leaderboard tweet:', error)
    return null
  }
}

/**
 * Tweet when user hits a milestone
 */
export async function tweetMilestone(data: MilestoneData): Promise<string | null> {
  const client = getTwitterClient()
  if (!client) return null

  try {
    const handle = data.twitterHandle
      ? `@${data.twitterHandle.replace('@', '')}`
      : data.username

    let milestoneText: string
    let emoji: string

    switch (data.milestone) {
      case 'silver':
        emoji = '🥈'
        milestoneText = `just hit Silver tier with ${data.totalRep} rep!`
        break
      case 'gold':
        emoji = '🥇'
        milestoneText = `just hit Gold tier with ${data.totalRep} rep!`
        break
      case 'platinum':
        emoji = '💎'
        milestoneText = `just hit Platinum tier with ${data.totalRep} rep! A true whale!`
        break
      case 'visionary':
        emoji = '🔮'
        milestoneText = `earned the Visionary badge! 5 of their suggestions have shipped!`
        break
      case 'kingmaker':
        emoji = '👑'
        milestoneText = `earned the Kingmaker badge! 10 suggestions they backed have shipped!`
        break
    }

    const tweetText = `${emoji} Congrats to ${handle}!

They ${milestoneText}

Join the competition 👇
https://evolving-site.vercel.app`

    const response = await client.v2.tweet(tweetText)
    console.log('✓ Posted milestone tweet:', response.data.id)
    return response.data.id
  } catch (error) {
    console.error('Failed to post milestone tweet:', error)
    return null
  }
}

/**
 * Check if Twitter is configured
 */
export function isTwitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  )
}

/**
 * Get feature shipped data from database
 */
export async function getFeatureShippedData(
  suggestionId: number,
  voteCount: number
): Promise<FeatureShippedData | null> {
  try {
    const { createClient } = await import('@libsql/client')
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Get suggestion and suggester info
    const result = await db.execute({
      sql: `SELECT s.content, u.twitter_username
            FROM suggestions s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.id = ?`,
      args: [suggestionId],
    })

    if (result.rows.length === 0) return null

    const row = result.rows[0] as unknown as {
      content: string
      twitter_username: string | null
    }

    return {
      suggestionId,
      featureName: row.content,
      suggesterTwitterHandle: row.twitter_username,
      voteCount,
    }
  } catch (error) {
    console.error('Failed to get feature shipped data:', error)
    return null
  }
}
