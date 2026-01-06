'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import VoteButton from './VoteButton'

interface Comment {
  id: number
  content: string
  commenter_hash: string
  created_at: string
}

interface SuggestionCardProps {
  id: number
  content: string
  votes: number
  createdAt: string
  isInProgress?: boolean
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SuggestionCard({
  id,
  content,
  votes,
  createdAt,
  isInProgress
}: SuggestionCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: comments } = useSWR<Comment[]>(
    showComments ? `/api/comments?suggestionId=${id}` : null,
    fetcher
  )

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: id, content: newComment.trim() })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add comment')
      }

      setNewComment('')
      mutate(`/api/comments?suggestionId=${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`card ${isInProgress ? 'border-2 border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}`}>
      <div className="flex gap-4">
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
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted">
              {formatDate(createdAt)}
            </span>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {showComments ? 'Hide' : 'Comments'}
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          {/* Existing comments */}
          {comments && comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm pl-3 border-l-2 border-neutral-300 dark:border-neutral-600">
                  <p className="text-foreground">{comment.content}</p>
                  <span className="text-xs text-muted">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add comment form */}
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add context for Claude..."
              maxLength={300}
              className="flex-1 text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="text-sm px-2 py-1 rounded bg-accent text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? '...' : 'Add'}
            </button>
          </form>
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
