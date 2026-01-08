'use client'

import useSWR from 'swr'

interface NeedsInputSuggestion {
  id: number
  content: string
  votes: number
  created_at: string
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function NeedsInput() {
  const { data: suggestions } = useSWR<NeedsInputSuggestion[]>(
    '/api/needs-input?limit=3',
    fetcher,
    { refreshInterval: 30000 }
  )

  if (!suggestions || suggestions.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="mt-4">
      <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">
        Needs Input
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="card border-l-2 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10"
          >
            <div className="flex gap-3">
              {/* Info icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                  {suggestion.votes}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Needs Input badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    NEEDS INPUT
                  </span>
                </div>

                {/* Suggestion content */}
                <p className="text-sm text-foreground break-words leading-snug line-clamp-2">
                  {suggestion.content}
                </p>

                {/* AI Note */}
                {suggestion.ai_note && (
                  <p className="text-xs text-muted italic mt-1.5 pl-2 border-l-2 border-amber-300 dark:border-amber-700 line-clamp-2">
                    {suggestion.ai_note}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">{formatDate(suggestion.created_at)}</span>
                  <span className="text-xs text-neutral-300 dark:text-neutral-600 font-mono select-none">
                    #{suggestion.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
