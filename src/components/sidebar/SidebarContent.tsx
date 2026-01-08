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
import UserInfo from './UserInfo'
import CollapsibleSection from './CollapsibleSection'

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
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <ActiveUserCounter />
      </div>
    </div>
  )
}
