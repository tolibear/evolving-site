'use client'

import { useState } from 'react'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import RecentlyCompleted from '@/components/RecentlyCompleted'
import RecentlyDenied from '@/components/RecentlyDenied'
import NeedsInput from '@/components/NeedsInput'
import UserInfo from './UserInfo'
import ThemeToggle from '@/components/ThemeToggle'
import { CompactStatusBar } from './CompactStatusBar'

type MainTab = 'build' | 'leaderboard'

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
  const [mainTab, setMainTab] = useState<MainTab>('build')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <CompactStatusBar />
        <div className="flex items-center gap-1">
          <ThemeToggle size={16} className="p-1.5" />
          <UserInfo compact />
        </div>
      </div>

      {/* Main tab bar */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-4">
        <MainTabButton active={mainTab === 'build'} onClick={() => setMainTab('build')}>
          Build
        </MainTabButton>
        <MainTabButton active={mainTab === 'leaderboard'} onClick={() => setMainTab('leaderboard')}>
          Leaderboard
        </MainTabButton>
      </div>

      {/* Tab content */}
      {mainTab === 'build' ? (
        <>
          <div className="mb-4">
            <SuggestionForm />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto sidebar-scroll">
            <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Up for Vote
            </div>
            <SuggestionList />
            <RecentlyCompleted />
            <RecentlyDenied />
            <NeedsInput />
          </div>
        </>
      ) : (
        <div className="text-sm">Leaderboard placeholder</div>
      )}
    </div>
  )
}
