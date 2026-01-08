'use client'

import { Suspense } from 'react'
import StatusBanner from '@/components/StatusBanner'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import Changelog from '@/components/Changelog'
import NeedsInputList from '@/components/NeedsInputList'
import DeniedList from '@/components/DeniedList'
import ActiveUserCounter from '@/components/ActiveUserCounter'
import ExpediteSuccessToast from '@/components/ExpediteSuccessToast'
import { useCredits } from '@/components/CreditProvider'
import { useAuth } from '@/components/AuthProvider'
import UserInfo from './UserInfo'
import CollapsibleSection from './CollapsibleSection'
import { CreditCheckout } from './CreditCheckout'

function CreditDisplay() {
  const { isLoggedIn } = useAuth()
  const { balance, hasEverPurchased, openCheckout, showCheckout, closeCheckout } = useCredits()

  if (!isLoggedIn) return null

  // Show checkout if active
  if (showCheckout) {
    return (
      <div className="card">
        <CreditCheckout onClose={closeCheckout} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-muted">
          Credits: <span className="font-medium text-foreground">{balance}</span>
        </span>
      </div>
      {hasEverPurchased && (
        <button
          onClick={openCheckout}
          className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
        >
          Buy Credits
        </button>
      )}
    </div>
  )
}

export function SidebarContent() {
  return (
    <div className="space-y-4">
      {/* Expedite success notification */}
      <Suspense fallback={null}>
        <ExpediteSuccessToast />
      </Suspense>

      {/* Live Status Banner - always visible */}
      <StatusBanner />

      {/* User info / Login area */}
      <UserInfo />

      {/* Credit display */}
      <CreditDisplay />

      {/* Suggestion Form */}
      <SuggestionForm />

      {/* Suggestions List */}
      <SuggestionList />

      {/* Collapsible: Changelog */}
      <CollapsibleSection title="Changelog" defaultOpen={false}>
        <Changelog />
      </CollapsibleSection>

      {/* Collapsible: Needs Input */}
      <CollapsibleSection title="Needs Developer Input" defaultOpen={false}>
        <NeedsInputList />
      </CollapsibleSection>

      {/* Collapsible: Denied */}
      <CollapsibleSection title="Denied Suggestions" defaultOpen={false}>
        <DeniedList />
      </CollapsibleSection>

      {/* Active users */}
      <div className="pt-4 border-t border-neutral-200">
        <ActiveUserCounter />
      </div>
    </div>
  )
}
