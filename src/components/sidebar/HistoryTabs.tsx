'use client'

import { useState } from 'react'
// TEMP: Comment out to test if child components are the issue
// import Changelog from '@/components/Changelog'
// import NeedsInputList from '@/components/NeedsInputList'
// import DeniedList from '@/components/DeniedList'

type Tab = 'implemented' | 'pending' | 'denied'

export function HistoryTabs() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('implemented')

  return (
    <div>
      {/* Collapse trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <span>History</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2">
          {/* Tab bar */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800 mb-3">
            <TabButton
              active={activeTab === 'implemented'}
              onClick={() => setActiveTab('implemented')}
            >
              Implemented
            </TabButton>
            <TabButton
              active={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
            >
              Needs Input
            </TabButton>
            <TabButton
              active={activeTab === 'denied'}
              onClick={() => setActiveTab('denied')}
            >
              Denied
            </TabButton>
          </div>

          {/* Tab content - placeholder */}
          <div className="max-h-[400px] overflow-y-auto text-sm">
            {activeTab === 'implemented' && <div>Implemented placeholder</div>}
            {activeTab === 'pending' && <div>Needs Input placeholder</div>}
            {activeTab === 'denied' && <div>Denied placeholder</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({
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
