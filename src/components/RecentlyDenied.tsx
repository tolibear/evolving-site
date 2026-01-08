'use client'

import useSWR from 'swr'

interface DeniedSuggestion {
  id: number
  content: string
  votes: number
  implemented_at: string
  ai_note: string | null
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function RecentlyDenied() {
  const { data: suggestions } = useSWR<DeniedSuggestion[]>(
    '/api/denied?limit=3',
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
        Recently Denied
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="card border-l-2 border-l-red-500 bg-red-50/30 dark:bg-red-900/10"
          >
            <div className="flex gap-3">
              {/* X icon */}
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
                  <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 mt-0.5">
                  {suggestion.votes}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Denied badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                    DENIED
                  </span>
                </div>

                {/* Suggestion content */}
                <p className="text-sm text-foreground break-words leading-snug line-clamp-2 line-through opacity-75">
                  {suggestion.content}
                </p>

                {/* AI Note */}
                {suggestion.ai_note && (
                  <p className="text-xs text-muted italic mt-1.5 pl-2 border-l-2 border-red-300 dark:border-red-700 line-clamp-2">
                    {suggestion.ai_note}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted">{formatDate(suggestion.implemented_at)}</span>
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
