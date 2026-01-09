'use client'

import { useState } from 'react'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import RecentlyCompleted from '@/components/RecentlyCompleted'
import RecentlyDenied from '@/components/RecentlyDenied'
import NeedsInput from '@/components/NeedsInput'
import ExpediteSuccessToast from '@/components/ExpediteSuccessToast'
import Leaderboard from '@/components/Leaderboard'
import { useCredits } from '@/components/CreditProvider'
import { useAuth } from '@/components/AuthProvider'
import UserInfo from './UserInfo'
import ThemeToggle from '@/components/ThemeToggle'
import { BoostCheckout } from './BoostCheckout'
import { BoostSuccessAnimation } from './BoostSuccessAnimation'
import { CompactStatusBar } from './CompactStatusBar'
import { HistoryTabs } from './HistoryTabs'
import { BoostBadge } from './BoostBadge'

type MainTab = 'build' | 'leaderboard'

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

function MainTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-neutral-900 dark:border-white text-foreground'
          : 'border-transparent text-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function SidebarContent() {
  const { isLoggedIn } = useAuth()
  const [mainTab, setMainTab] = useState<MainTab>('build')

  return (
    <div className="flex flex-col h-full">
      {/* Expedite success notification */}
      <ExpediteSuccessToast />

      {/* Header: Compact status + theme toggle + user info */}
      <div className="flex items-center justify-between mb-4">
        <CompactStatusBar />
        <div className="flex items-center gap-1">
          <ThemeToggle size={16} className="p-1.5" />
          <UserInfo compact />
        </div>
      </div>

      {/* Main tab bar */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
        <MainTabButton
          active={mainTab === 'build'}
          onClick={() => setMainTab('build')}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Build
          </span>
        </MainTabButton>
        <MainTabButton
          active={mainTab === 'leaderboard'}
          onClick={() => setMainTab('leaderboard')}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Leaderboard
          </span>
        </MainTabButton>
      </div>

      {/* Tab content */}
      {mainTab === 'build' ? (
        <>
          {/* Boost display temporarily hidden */}
          {/* <BoostDisplay /> */}

          {/* Suggestion Form - always show, handles login internally */}
          <div className="mb-4">
            <SuggestionForm />
          </div>

          {/* Primary section: Suggestions */}
          <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
            {/* Section label */}
            <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Up for Vote
            </div>

            {/* Suggestions List */}
            <SuggestionList />

            {/* Recently Completed */}
            <RecentlyCompleted />

            {/* Recently Denied */}
            <RecentlyDenied />

            {/* Needs Input */}
            <NeedsInput />
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 my-4" />

          {/* History tabs */}
          <HistoryTabs />

          {/* Footer: Boost badge temporarily hidden */}
          {/* {isLoggedIn && (
            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
              <BoostBadge />
            </div>
          )} */}
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
          <Leaderboard />
        </div>
      )}
    </div>
  )
}
