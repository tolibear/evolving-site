'use client'

import useSWR from 'swr'

interface ChangelogEntry {
  id: number
  suggestion_id: number
  suggestion_content: string
  votes_when_implemented: number
  implemented_at: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function RecentlyCompleted() {
  const { data: entries } = useSWR<ChangelogEntry[]>(
    '/api/changelog?limit=3',
    fetcher,
    { refreshInterval: 30000 }
  )

  if (!entries || entries.length === 0) {
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
      <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
        Recently Shipped
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30"
          >
            <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground line-clamp-2 leading-snug">
                {entry.suggestion_content}
              </p>
              <span className="text-[10px] text-muted">
                {formatDate(entry.implemented_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
