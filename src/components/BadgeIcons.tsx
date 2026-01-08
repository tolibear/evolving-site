'use client'

import { AchievementType, TierName } from '@/lib/reputation-types'

interface IconProps {
  size?: number
  className?: string
}

// Rank Medal Icons
export function RankMedalIcon({ rank, size = 16, className = '' }: { rank: number } & IconProps) {
  if (rank === 1) return <GoldMedalIcon size={size} className={className} />
  if (rank === 2) return <SilverMedalIcon size={size} className={className} />
  if (rank === 3) return <BronzeMedalIcon size={size} className={className} />
  return null
}

export function GoldMedalIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="8" fill="#FFD700" />
      <circle cx="12" cy="14" r="6" fill="#FFC000" />
      <path d="M12 2L14 8H10L12 2Z" fill="#DC143C" />
      <path d="M8 3L10 8H6L8 3Z" fill="#4169E1" />
      <path d="M16 3L18 8H14L16 3Z" fill="#4169E1" />
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#8B6914">1</text>
    </svg>
  )
}

export function SilverMedalIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="8" fill="#C0C0C0" />
      <circle cx="12" cy="14" r="6" fill="#A8A8A8" />
      <path d="M12 2L14 8H10L12 2Z" fill="#DC143C" />
      <path d="M8 3L10 8H6L8 3Z" fill="#4169E1" />
      <path d="M16 3L18 8H14L16 3Z" fill="#4169E1" />
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#666">2</text>
    </svg>
  )
}

export function BronzeMedalIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="14" r="8" fill="#CD7F32" />
      <circle cx="12" cy="14" r="6" fill="#B87333" />
      <path d="M12 2L14 8H10L12 2Z" fill="#DC143C" />
      <path d="M8 3L10 8H6L8 3Z" fill="#4169E1" />
      <path d="M16 3L18 8H14L16 3Z" fill="#4169E1" />
      <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#5C3317">3</text>
    </svg>
  )
}

// Tier Badge Icons
export function TierIcon({ tier, size = 12, className = '' }: { tier: TierName } & IconProps) {
  switch (tier) {
    case 'bronze': return <BronzeTierIcon size={size} className={className} />
    case 'silver': return <SilverTierIcon size={size} className={className} />
    case 'gold': return <GoldTierIcon size={size} className={className} />
    case 'platinum': return <PlatinumTierIcon size={size} className={className} />
    default: return <BronzeTierIcon size={size} className={className} />
  }
}

export function BronzeTierIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#CD7F32" />
      <circle cx="12" cy="12" r="7" fill="#B87333" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#5C3317">B</text>
    </svg>
  )
}

export function SilverTierIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#C0C0C0" />
      <circle cx="12" cy="12" r="7" fill="#D8D8D8" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#666">S</text>
    </svg>
  )
}

export function GoldTierIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FFD700" />
      <circle cx="12" cy="12" r="7" fill="#FFC000" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#8B6914">G</text>
    </svg>
  )
}

export function PlatinumTierIcon({ size = 12, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Diamond shape for platinum */}
      <polygon points="12,2 22,12 12,22 2,12" fill="#E5E4E2" />
      <polygon points="12,5 19,12 12,19 5,12" fill="#F5F5F5" />
      <polygon points="12,8 8,12 12,16 16,12" fill="#B8B8B8" stroke="#E5E4E2" strokeWidth="0.5" />
    </svg>
  )
}

// Achievement Icons
export function AchievementIcon({ type, size = 14, className = '' }: { type: AchievementType } & IconProps) {
  switch (type) {
    case 'pioneer': return <PioneerIcon size={size} className={className} />
    case 'kingmaker': return <KingmakerIcon size={size} className={className} />
    case 'visionary': return <VisionaryIcon size={size} className={className} />
    case 'streak_master': return <StreakMasterIcon size={size} className={className} />
    case 'whale': return <WhaleIcon size={size} className={className} />
    case 'recruiter': return <RecruiterIcon size={size} className={className} />
    default: return null
  }
}

export function PioneerIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Rocket */}
      <path d="M12 2C12 2 8 6 8 12C8 16 10 20 12 22C14 20 16 16 16 12C16 6 12 2 12 2Z" fill="#DC143C" />
      <circle cx="12" cy="10" r="2" fill="#87CEEB" />
      <path d="M8 16L5 20L8 18" fill="#FF6B35" />
      <path d="M16 16L19 20L16 18" fill="#FF6B35" />
      <path d="M10 20L12 24L14 20" fill="#FF6B35" />
    </svg>
  )
}

export function KingmakerIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Crown */}
      <path d="M4 18L2 8L7 12L12 6L17 12L22 8L20 18H4Z" fill="#FFD700" />
      <rect x="4" y="18" width="16" height="3" fill="#FFD700" />
      <circle cx="7" cy="11" r="1.5" fill="#DC143C" />
      <circle cx="12" cy="8" r="1.5" fill="#DC143C" />
      <circle cx="17" cy="11" r="1.5" fill="#DC143C" />
    </svg>
  )
}

export function VisionaryIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Crystal Ball */}
      <circle cx="12" cy="11" r="9" fill="url(#crystalGradient)" />
      <ellipse cx="12" cy="20" rx="6" ry="2" fill="#8B4513" />
      <ellipse cx="9" cy="8" rx="2" ry="3" fill="rgba(255,255,255,0.3)" transform="rotate(-20 9 8)" />
      <defs>
        <radialGradient id="crystalGradient" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="#E6E6FA" />
          <stop offset="50%" stopColor="#9370DB" />
          <stop offset="100%" stopColor="#4B0082" />
        </radialGradient>
      </defs>
    </svg>
  )
}

export function StreakMasterIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Fire */}
      <path d="M12 2C12 2 8 8 8 13C8 17 10 20 12 22C14 20 16 17 16 13C16 8 12 2 12 2Z" fill="#FF6B35" />
      <path d="M12 6C12 6 10 10 10 13C10 15 11 17 12 18C13 17 14 15 14 13C14 10 12 6 12 6Z" fill="#FFD700" />
      <path d="M12 10C12 10 11 12 11 14C11 15 11.5 16 12 16.5C12.5 16 13 15 13 14C13 12 12 10 12 10Z" fill="#FFF5EE" />
    </svg>
  )
}

export function WhaleIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Whale */}
      <ellipse cx="12" cy="13" rx="9" ry="6" fill="#4169E1" />
      <path d="M3 13C3 13 1 10 2 7C3 4 5 5 5 8" fill="#4169E1" />
      <path d="M21 11L23 8V12L21 11Z" fill="#4169E1" />
      <circle cx="6" cy="12" r="1" fill="white" />
      <circle cx="6" cy="12" r="0.5" fill="black" />
      <ellipse cx="12" cy="16" rx="4" ry="1" fill="#1E90FF" />
      {/* Water spout */}
      <path d="M19 6C19 4 20 3 21 3C21 4 21 5 20 6C20 7 19 7 19 6Z" fill="#87CEEB" />
      <path d="M20 4C20 2 21 1 22 2C22 3 21 4 20 4Z" fill="#87CEEB" />
    </svg>
  )
}

export function RecruiterIcon({ size = 14, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Target/Bullseye */}
      <circle cx="12" cy="12" r="10" fill="white" stroke="#DC143C" strokeWidth="2" />
      <circle cx="12" cy="12" r="7" fill="white" stroke="#DC143C" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="white" stroke="#DC143C" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="#DC143C" />
    </svg>
  )
}

// Achievement descriptions for tooltips
export const ACHIEVEMENT_TOOLTIPS: Record<AchievementType, { name: string; description: string }> = {
  pioneer: { name: 'Pioneer', description: 'One of the first 100 users to join' },
  kingmaker: { name: 'Kingmaker', description: '10 suggestions you voted on were shipped' },
  visionary: { name: 'Visionary', description: '5 of your own suggestions were shipped' },
  streak_master: { name: 'Streak Master', description: 'Maintained a 30-day voting streak' },
  whale: { name: 'Whale', description: 'Reached Platinum tier' },
  recruiter: { name: 'Recruiter', description: 'Referred 10+ active users' },
}

// Tier descriptions for tooltips
export const TIER_TOOLTIPS: Record<TierName, { name: string; description: string; votePower: number }> = {
  bronze: { name: 'Bronze', description: 'Starting tier', votePower: 1 },
  silver: { name: 'Silver', description: '100+ reputation', votePower: 2 },
  gold: { name: 'Gold', description: '500+ reputation', votePower: 3 },
  platinum: { name: 'Platinum', description: '2000+ reputation', votePower: 3 },
}
