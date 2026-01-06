'use client'

import useSWR from 'swr'

interface DeniedSuggestion {
  id: number
  content: string
  votes: number
  status: string
  created_at: string
  implemented_at: string
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DeniedList() {
  const { data: suggestions, error, isLoading } = useSWR<DeniedSuggestion[]>(
    '/api/denied',
    fetcher,
    { refreshInterval: 30000 }
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Denied
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return null
  }

  if (!suggestions || suggestions.length === 0) {
    return null // Don't show section if no denied suggestions
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Denied ({suggestions.length})
      </h2>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-foreground break-words line-through opacity-75">
                  {suggestion.content}
                </p>
                {suggestion.ai_note && (
                  <p className="text-sm text-muted italic mt-2 pl-3 border-l-2 border-red-300 dark:border-red-700">
                    {suggestion.ai_note}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {suggestion.votes} votes
                  </span>
                  <span>{formatDate(suggestion.implemented_at)}</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
