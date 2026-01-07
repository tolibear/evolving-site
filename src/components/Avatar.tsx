'use client'

import { useState } from 'react'

interface AvatarProps {
  username: string
  avatar: string | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

export default function Avatar({
  username,
  avatar,
  size = 'md',
  showTooltip = true,
  className = '',
}: AvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleClick = () => {
    window.open(`https://twitter.com/${username}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-2 border-white dark:border-neutral-800
          shadow-sm
          overflow-hidden
          cursor-pointer
          transition-transform hover:scale-110
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1
          ${className}
        `}
        aria-label={`View @${username}'s Twitter profile`}
      >
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
      </button>

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                     bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900
                     text-xs font-medium rounded shadow-lg whitespace-nowrap
                     pointer-events-none animate-fade-in"
        >
          @{username}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                       border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100"
          />
        </div>
      )}
    </div>
  )
}
