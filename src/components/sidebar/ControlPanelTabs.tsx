'use client'

import { useState } from 'react'
import Changelog from '@/components/Changelog'
import NeedsInputList from '@/components/NeedsInputList'
import DeniedList from '@/components/DeniedList'
import Leaderboard from '@/components/Leaderboard'

type MainTab = 'history' | 'leaderboard'
type HistorySubTab = 'implemented' | 'pending' | 'denied'

export function ControlPanelTabs() {
  const [mainTab, setMainTab] = useState<MainTab>('history')
  const [historySubTab, setHistorySubTab] = useState<HistorySubTab>('implemented')

  return (
    <div>
      {/* Main tab bar */}
      <div className="flex border-b border-neutral-100 dark:border-neutral-800 mb-3">
        <MainTabButton
          active={mainTab === 'history'}
          onClick={() => setMainTab('history')}
        >
          History
        </MainTabButton>
        <MainTabButton
          active={mainTab === 'leaderboard'}
          onClick={() => setMainTab('leaderboard')}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Leaderboard
          </span>
        </MainTabButton>
      </div>

      {/* Tab content */}
      {mainTab === 'history' && (
        <div>
          {/* History sub-tabs */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800 mb-3">
            <SubTabButton
              active={historySubTab === 'implemented'}
              onClick={() => setHistorySubTab('implemented')}
            >
              Implemented
            </SubTabButton>
            <SubTabButton
              active={historySubTab === 'pending'}
              onClick={() => setHistorySubTab('pending')}
            >
              Needs Input
            </SubTabButton>
            <SubTabButton
              active={historySubTab === 'denied'}
              onClick={() => setHistorySubTab('denied')}
            >
              Denied
            </SubTabButton>
          </div>

          {/* History sub-tab content */}
          <div className="max-h-[400px] overflow-y-auto">
            {historySubTab === 'implemented' && <Changelog />}
            {historySubTab === 'pending' && <NeedsInputList />}
            {historySubTab === 'denied' && <DeniedList />}
          </div>
        </div>
      )}

      {mainTab === 'leaderboard' && (
        <div className="max-h-[500px] overflow-y-auto">
          <Leaderboard />
        </div>
      )}
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
      className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'border-neutral-900 dark:border-white text-foreground'
          : 'border-transparent text-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function SubTabButton({
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
      className={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'border-neutral-900 dark:border-white text-foreground'
          : 'border-transparent text-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
