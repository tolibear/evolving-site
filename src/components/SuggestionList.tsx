'use client'

import useSWR from 'swr'
import SuggestionCard from './SuggestionCard'

interface Suggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
}

interface Status {
  current_suggestion_id: number | null
  state: 'idle' | 'working' | 'completed'
  message: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SuggestionList() {
  const { data: suggestions, error, isLoading } = useSWR<Suggestion[]>(
    '/api/suggestions',
    fetcher,
    { refreshInterval: 5000 } // Refresh every 5 seconds
  )

  const { data: status } = useSWR<Status>(
    '/api/status',
    fetcher,
    { refreshInterval: 5000 }
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center text-red-600">
        Failed to load suggestions. Please try again later.
      </div>
    )
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="card text-center text-muted">
        <p className="mb-2">No suggestions yet.</p>
        <p className="text-sm">Be the first to suggest a feature!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Suggestions ({suggestions.length})
      </h2>
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          id={suggestion.id}
          content={suggestion.content}
          votes={suggestion.votes}
          createdAt={suggestion.created_at}
          isInProgress={
            status?.state === 'working' &&
            status?.current_suggestion_id === suggestion.id
          }
        />
      ))}
    </div>
  )
}
