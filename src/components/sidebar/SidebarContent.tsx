'use client'

import { Suspense } from 'react'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import ExpediteSuccessToast from '@/components/ExpediteSuccessToast'
import { useCredits } from '@/components/CreditProvider'
import { useAuth } from '@/components/AuthProvider'
import UserInfo from './UserInfo'
import { BoostCheckout } from './BoostCheckout'
import { BoostSuccessAnimation } from './BoostSuccessAnimation'
import { CompactStatusBar } from './CompactStatusBar'
import { HistoryTabs } from './HistoryTabs'
import { LeaderboardSection } from './LeaderboardSection'
import { BoostBadge } from './BoostBadge'

function BoostDisplay() {
  const { isLoggedIn } = useAuth()
  const { balance, hasEverPurchased, openCheckout, showCheckout, closeCheckout, animatingBoosts, clearAnimation } = useCredits()

  // Show success animation if active (renders as overlay)
  if (animatingBoosts) {
    return (
      <BoostSuccessAnimation
        from={animatingBoosts.from}
        to={animatingBoosts.to}
        onComplete={clearAnimation}
      />
    )
  }

  if (!isLoggedIn) return null

  // Show checkout if active
  if (showCheckout) {
    return (
      <div className="card">
        <BoostCheckout onClose={closeCheckout} />
      </div>
    )
  }

  // Only show inline display if user has ever purchased
  if (!hasEverPurchased) return null

  return (
    <div className="flex items-center justify-between text-sm py-2">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-muted">
          <span className="font-medium text-foreground">{balance}</span> {balance === 1 ? 'boost' : 'boosts'}
        </span>
      </div>
      <button
        onClick={openCheckout}
        className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
      >
        Get More
      </button>
    </div>
  )
}

export function SidebarContent() {
  const { isLoggedIn } = useAuth()

  return (
    <div className="flex flex-col h-full">
      {/* Expedite success notification */}
      <Suspense fallback={null}>
        <ExpediteSuccessToast />
      </Suspense>

      {/* Header: Compact status + user info */}
      <div className="flex items-center justify-between mb-4">
        <CompactStatusBar />
        <UserInfo compact />
      </div>

      {/* Boost display (only if has purchased before) */}
      <BoostDisplay />

      {/* Suggestion Form - only when logged in, at top */}
      {isLoggedIn && (
        <div className="mb-4">
          <SuggestionForm />
        </div>
      )}

      {/* Primary section: Suggestions */}
      <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
        {/* Section label */}
        <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
          Up for Vote
        </div>

        {/* Suggestions List */}
        <SuggestionList />
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-100 dark:border-neutral-800 my-4" />

      {/* History tabs (collapsed by default) */}
      <HistoryTabs />

      {/* Leaderboard (collapsed by default) */}
      <LeaderboardSection />

      {/* Footer: Boost badge */}
      {isLoggedIn && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
          <BoostBadge />
        </div>
      )}
    </div>
  )
}
