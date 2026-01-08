'use client'

import { TIERS, TierName } from '@/lib/reputation-types'

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
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}

export default function TierBadge({
  tier,
  size = 'md',
  showLabel = false,
  className = '',
}: TierBadgeProps) {
  const tierInfo = TIERS[tier]

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
      title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier (${tierInfo.votePower}x vote power)`}
    >
      <span className={iconSizes[size]}>{tierInfo.icon}</span>
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

  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
      style={{
        backgroundColor: tierInfo.color,
        boxShadow: `0 0 0 2px white, 0 0 0 3px ${tierInfo.color}40`,
      }}
      title={`${tier.charAt(0).toUpperCase() + tier.slice(1)} tier`}
    >
      {tierInfo.icon}
    </span>
  )
}
