'use client'

import Avatar from './Avatar'

interface Submitter {
  id: number
  username: string
  avatar: string | null
  name?: string | null
}

interface Contributor {
  id: number
  username: string
  avatar: string | null
  type: 'comment' | 'vote'
}

interface ContributorStackProps {
  submitter: Submitter | null
  contributors: Contributor[]
  totalCount: number
  maxDisplay?: number
}

export default function ContributorStack({
  submitter,
  contributors,
  totalCount,
  maxDisplay = 5,
}: ContributorStackProps) {
  // Filter out the submitter from contributors to avoid showing them twice
  const filteredContributors = submitter
    ? contributors.filter((c) => c.id !== submitter.id)
    : contributors

  const displayedContributors = filteredContributors.slice(0, maxDisplay)
  const remainingCount = totalCount - displayedContributors.length - (submitter ? 1 : 0)

  // If no submitter and no contributors, show nothing
  if (!submitter && filteredContributors.length === 0) {
    return null
  }

  return (
    <div className="flex items-center">
      {/* Main submitter avatar */}
      {submitter ? (
        <Avatar
          username={submitter.username}
          avatar={submitter.avatar}
          size="sm"
          className="relative z-10"
        />
      ) : (
        // Placeholder for anonymous/legacy suggestion
        <div
          className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800
                     bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center
                     shadow-sm relative z-10"
          title="Anonymous user"
        >
          <svg
            className="w-3 h-3 text-neutral-400 dark:text-neutral-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      )}

      {/* Stacked contributor avatars */}
      {displayedContributors.map((contributor, index) => (
        <div
          key={contributor.id}
          className="-ml-1.5"
          style={{ zIndex: 9 - index }}
        >
          <Avatar
            username={contributor.username}
            avatar={contributor.avatar}
            size="xs"
          />
        </div>
      ))}

      {/* "+N more" badge */}
      {remainingCount > 0 && (
        <div
          className="-ml-1.5 w-5 h-5 rounded-full border-2 border-white dark:border-neutral-800
                     bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center
                     text-[9px] font-medium text-muted shadow-sm"
          style={{ zIndex: 0 }}
          title={`${remainingCount} more contributor${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount > 99 ? '99' : remainingCount}
        </div>
      )}
    </div>
  )
}
