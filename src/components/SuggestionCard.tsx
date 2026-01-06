import VoteButton from './VoteButton'

interface SuggestionCardProps {
  id: number
  content: string
  votes: number
  createdAt: string
  isInProgress?: boolean
}

export default function SuggestionCard({
  id,
  content,
  votes,
  createdAt,
  isInProgress
}: SuggestionCardProps) {
  // Format the date
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
    <div className={`card flex gap-4 ${isInProgress ? 'border-2 border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}`}>
      <VoteButton suggestionId={id} votes={votes} />
      <div className="flex-1 min-w-0">
        {isInProgress && (
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              In Progress
            </span>
          </div>
        )}
        <p className="text-foreground break-words">{content}</p>
        <span className="text-xs text-muted mt-2 block">
          {formatDate(createdAt)}
        </span>
      </div>
    </div>
  )
}
