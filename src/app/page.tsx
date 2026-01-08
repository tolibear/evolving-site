import { Suspense } from 'react'
import StatusBanner from '@/components/StatusBanner'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import Changelog from '@/components/Changelog'
import DeniedList from '@/components/DeniedList'
import NeedsInputList from '@/components/NeedsInputList'
import ExpediteSuccessToast from '@/components/ExpediteSuccessToast'

export default function Home() {
  return (
    <div>
      {/* Expedite success notification */}
      <Suspense fallback={null}>
        <ExpediteSuccessToast />
      </Suspense>

      {/* Live Status Banner */}
      <StatusBanner />

      {/* Suggestion Form */}
      <SuggestionForm />

      {/* Suggestions List */}
      <SuggestionList />

      {/* Changelog */}
      <Changelog />

      {/* Needs Developer Input */}
      <NeedsInputList />

      {/* Denied Suggestions */}
      <DeniedList />
    </div>
  )
}
