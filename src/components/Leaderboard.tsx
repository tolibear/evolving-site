'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Avatar from './Avatar'
import TierBadge from './TierBadge'
import { NotificationSettings } from './NotificationSettings'
import { TierName, AchievementType, TIERS } from '@/lib/reputation-types'
import { RankMedalIcon, AchievementIcon, ACHIEVEMENT_TOOLTIPS } from './BadgeIcons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Achievement badge with tooltip
function AchievementBadge({ type, size = 14 }: { type: AchievementType; size?: number }) {
  const tooltip = ACHIEVEMENT_TOOLTIPS[type]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center cursor-help">
          <AchievementIcon type={type} size={size} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{tooltip.name}</p>
        <p className="text-xs opacity-90">{tooltip.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  avatar: string | null
  total_rep: number
  weekly_rep: number
  tier: TierName
  achievements: AchievementType[]
}

interface CurrentUser {
  user_id: number
  username: string
  avatar: string | null
  total_rep: number
  weekly_rep: number
  tier: TierName
  rank: number | null
  current_streak: number
  longest_streak: number
  suggestions_backed_denied: number
  achievements: AchievementType[]
  referral_code: string
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  currentUser: CurrentUser | null
  type: 'all_time' | 'weekly'
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`)
  }
  return res.json()
}

export default function Leaderboard() {
  const [type, setType] = useState<'all_time' | 'weekly'>('all_time')
  const [copied, setCopied] = useState(false)

  const { data, error, isLoading } = useSWR<LeaderboardData>(
    `/api/leaderboard?type=${type}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnMount: true,
      revalidateOnFocus: true,
    }
  )

  const copyReferralLink = async () => {
    if (!data?.currentUser?.referral_code) return
    const url = `${window.location.origin}?ref=${data.currentUser.referral_code}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex-1 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">
        Failed to load leaderboard: {error.message}
      </div>
    )
  }

  // Handle case where data might be an error response
  if (data && 'error' in data) {
    return (
      <div className="text-sm text-red-500 dark:text-red-400">
        Error: {(data as { error: string }).error}
      </div>
    )
  }

  const leaderboard = Array.isArray(data?.leaderboard) ? data.leaderboard : []
  const currentUser = data?.currentUser || null

  // If no data yet and not loading, show a message
  if (!data && !isLoading && !error) {
    return (
      <div className="text-sm text-muted text-center py-4">
        Loading leaderboard...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Your Stats (if logged in) */}
      {currentUser && (
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted">Your Stats</span>
            <TierBadge tier={currentUser.tier} showLabel size="sm" />
          </div>

          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div>
              <div className="text-lg font-bold text-foreground">
                {currentUser.rank ? `#${currentUser.rank}` : '-'}
              </div>
              <div className="text-[10px] text-muted">Rank</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {type === 'weekly' ? currentUser.weekly_rep : currentUser.total_rep}
              </div>
              <div className="text-[10px] text-muted">Rep</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">
                {currentUser.current_streak}
              </div>
              <div className="text-[10px] text-muted">Streak</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground" style={{ color: TIERS[currentUser.tier].color }}>
                {TIERS[currentUser.tier].votePower}x
              </div>
              <div className="text-[10px] text-muted">Vote Power</div>
            </div>
          </div>

          {/* Achievements */}
          {currentUser.achievements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {currentUser.achievements.map((a) => (
                <AchievementBadge key={a} type={a} size={18} />
              ))}
            </div>
          )}

          {/* Referral Link */}
          <button
            onClick={copyReferralLink}
            className="w-full text-xs py-1.5 px-2 rounded bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors flex items-center justify-center gap-1"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy referral link (earn 5% of their rep!)
              </>
            )}
          </button>

          {/* Backed-denied count if any */}
          {currentUser.suggestions_backed_denied > 0 && (
            <div className="mt-2 text-[10px] text-muted text-center">
              Backed {currentUser.suggestions_backed_denied} denied suggestion{currentUser.suggestions_backed_denied !== 1 ? 's' : ''}
            </div>
          )}

          {/* Notification Settings */}
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
            <NotificationSettings />
          </div>
        </div>
      )}

      {/* Type Toggle */}
      <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5">
        <button
          onClick={() => setType('all_time')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            type === 'all_time'
              ? 'bg-white dark:bg-neutral-700 shadow-sm font-medium'
              : 'text-muted hover:text-foreground'
          }`}
        >
          All Time
        </button>
        <button
          onClick={() => setType('weekly')}
          className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
            type === 'weekly'
              ? 'bg-white dark:bg-neutral-700 shadow-sm font-medium'
              : 'text-muted hover:text-foreground'
          }`}
        >
          This Week
        </button>
      </div>

      {/* Leaderboard List */}
      {leaderboard.length === 0 ? (
        <div className="text-sm text-muted text-center py-4">
          No rankings yet. Be the first!
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="flex items-center gap-2 py-1 px-2 text-[10px] font-medium text-muted uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-700">
            <span className="w-5 text-center">#</span>
            <span className="w-6"></span>
            <span className="flex-1">User</span>
            <span>Rep</span>
          </div>
          {leaderboard.map((entry) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                currentUser?.user_id === entry.user_id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
              }`}
            >
              {/* Rank */}
              <span className="w-5 flex items-center justify-center">
                {entry.rank <= 3 ? (
                  <RankMedalIcon rank={entry.rank} size={18} />
                ) : (
                  <span className="text-xs font-bold text-muted">#{entry.rank}</span>
                )}
              </span>

              {/* Avatar */}
              <Avatar
                username={entry.username}
                avatar={entry.avatar}
                size="xs"
                showTooltip={false}
              />

              {/* Name + Tier */}
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="text-xs font-medium truncate">
                  @{entry.username}
                </span>
                <TierBadge tier={entry.tier} size="sm" />
                {/* Achievement badges */}
                {entry.achievements.slice(0, 2).map((a) => (
                  <AchievementBadge key={a} type={a} size={14} />
                ))}
              </div>

              {/* Rep */}
              <span className="text-xs font-semibold text-muted">
                {type === 'weekly' ? entry.weekly_rep : entry.total_rep}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
