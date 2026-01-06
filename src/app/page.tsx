import StatusBanner from '@/components/StatusBanner'
import SuggestionForm from '@/components/SuggestionForm'
import SuggestionList from '@/components/SuggestionList'
import Changelog from '@/components/Changelog'

export default function Home() {
  return (
    <div>
      {/* Live Status Banner */}
      <StatusBanner />

      {/* Suggestion Form */}
      <SuggestionForm />

      {/* Suggestions List */}
      <SuggestionList />

      {/* Changelog */}
      <Changelog />
    </div>
  )
}
