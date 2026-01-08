'use client'

import { TIERS, TierName } from '@/lib/reputation-types'
import { TierIcon, TIER_TOOLTIPS } from './BadgeIcons'

interface TierBadgeProps {
  tier: TierName
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-1 py-0.5',
  md: 'text-xs px-1.5 py-0.5',
  lg: 'text-sm px-2 py-1',
}

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14,
}

export default function TierBadge({
  tier,
  size = 'md',
  showLabel = false,
  className = '',
}: TierBadgeProps) {
  const tierInfo = TIERS[tier]
  const tooltip = TIER_TOOLTIPS[tier]

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 rounded font-medium
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        backgroundColor: `${tierInfo.color}20`,
        color: tierInfo.color,
        border: `1px solid ${tierInfo.color}40`,
      }}
      title={`${tooltip.name} Tier: ${tooltip.description} (${tooltip.votePower}x vote power)`}
    >
      <TierIcon tier={tier} size={iconSizes[size]} />
      {showLabel && (
        <span className="capitalize">{tier}</span>
      )}
    </span>
  )
}

/**
 * Mini badge for use in tight spaces (e.g., next to avatars)
 */
export function TierBadgeMini({ tier }: { tier: TierName }) {
  const tierInfo = TIERS[tier]
  const tooltip = TIER_TOOLTIPS[tier]

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full"
      style={{
        backgroundColor: tierInfo.color,
        boxShadow: `0 0 0 2px white, 0 0 0 3px ${tierInfo.color}40`,
      }}
      title={`${tooltip.name} Tier: ${tooltip.description}`}
    >
      <TierIcon tier={tier} size={10} />
    </span>
  )
}
