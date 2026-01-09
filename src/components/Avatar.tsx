'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TierBadgeMini } from './TierBadge'
import type { TierName } from '@/lib/reputation-types'

interface AvatarProps {
  username: string
  avatar: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
  tier?: TierName | null
  disableLink?: boolean
}

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
}

function Tooltip({ username, targetRef }: { username: string; targetRef: React.RefObject<HTMLElement | null> }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect()
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [targetRef])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed z-[9999] px-2 py-1 -translate-x-1/2 -translate-y-full
                 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900
                 text-xs font-medium rounded shadow-lg whitespace-nowrap
                 pointer-events-none animate-fade-in"
      style={{ top: position.top, left: position.left }}
    >
      @{username}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                   border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100"
      />
    </div>,
    document.body
  )
}

export default function Avatar({
  username,
  avatar,
  size = 'md',
  showTooltip = true,
  className = '',
  tier = null,
  disableLink = false,
}: AvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false)
  const [imgError, setImgError] = useState(false)
  const divRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    if (!disableLink) {
      window.open(`https://twitter.com/${username}`, '_blank', 'noopener,noreferrer')
    }
  }

  const sharedClasses = `
    ${sizeClasses[size]}
    rounded-full
    border-2 border-white dark:border-neutral-800
    shadow-sm
    overflow-hidden
    ${!disableLink ? 'cursor-pointer transition-transform hover:scale-110' : ''}
    ${className}
  `

  const avatarContent = (
    <>
      {avatar && !imgError ? (
        <img
          src={avatar}
          alt={`@${username}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
          <svg
            className="w-3/5 h-3/5 text-neutral-400 dark:text-neutral-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}
    </>
  )

  const containerRef = disableLink ? divRef : buttonRef
  const showTierBadge = tier && tier !== 'bronze' && (size === 'sm' || size === 'md' || size === 'lg')

  const wrapperProps = {
    onMouseEnter: () => setShowTooltipState(true),
    onMouseLeave: () => setShowTooltipState(false),
    className: disableLink
      ? sharedClasses
      : `${sharedClasses} focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1`,
  }

  return (
    <div className="relative inline-block">
      {disableLink ? (
        <div ref={divRef} {...wrapperProps}>
          {avatarContent}
        </div>
      ) : (
        <button
          ref={buttonRef}
          onClick={handleClick}
          aria-label={`View @${username}'s Twitter profile`}
          {...wrapperProps}
        >
          {avatarContent}
        </button>
      )}

      {/* Tier badge overlay - only for non-bronze tiers and larger sizes */}
      {showTierBadge && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <TierBadgeMini tier={tier} />
        </div>
      )}

      {/* Tooltip - rendered via portal to escape overflow containers */}
      {showTooltip && showTooltipState && <Tooltip username={username} targetRef={containerRef} />}
    </div>
  )
}
