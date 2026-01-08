'use client'

import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import VoteButton from './VoteButton'
import ContributorStack from './ContributorStack'
import LoginPrompt from './LoginPrompt'
import ExpediteButton from './ExpediteButton'
import { useAuth } from './AuthProvider'

interface Comment {
  id: number
  content: string
  commenter_hash: string
  user_id: number | null
  created_at: string
}

interface CommentsResponse {
  comments: Comment[]
  currentUserId: number | null
}

interface Submitter {
  id: number
  username: string
  avatar: string | null
  name: string | null
}

interface Contributor {
  id: number
  username: string
  avatar: string | null
  type: 'comment' | 'vote'
}

interface SuggestionCardProps {
  id: number
  content: string
  votes: number
  createdAt: string
  isInProgress?: boolean
  commentCount?: number
  author?: string | null
  isOwner?: boolean
  userVoteType?: 'up' | 'down' | null
  suggestionNumber?: number
  submitter?: Submitter | null
  contributors?: Contributor[]
  contributorCount?: number
  expediteAmountCents?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SuggestionCard({
  id,
  content,
  votes,
  createdAt,
  isInProgress,
  commentCount = 0,
  author,
  isOwner = false,
  userVoteType = null,
  suggestionNumber,
  submitter = null,
  contributors = [],
  contributorCount = 0,
  expediteAmountCents = 0,
}: SuggestionCardProps) {
  const { isLoggedIn, user } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data } = useSWR<CommentsResponse>(
    showComments ? `/api/comments?suggestionId=${id}` : null,
    fetcher
  )

  const comments = data?.comments || []
  const currentUserId = data?.currentUserId
  const userComment = comments.find((c) => c.user_id === currentUserId)

  // When user's comment is found and not editing, pre-fill for edit mode
  useEffect(() => {
    if (userComment && !editingComment && !commentText) {
      setEditingComment(userComment)
      setCommentText(userComment.content)
    }
  }, [userComment, editingComment, commentText])

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
    if (!commentText.trim() || isSubmitting) return

    if (!isLoggedIn) {
      setError('Please sign in with Twitter to comment')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const isEditing = !!editingComment
      const res = await fetch('/api/comments', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { commentId: editingComment.id, content: commentText.trim() }
            : { suggestionId: id, content: commentText.trim() }
        ),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save comment')
      }

      mutate(`/api/comments?suggestionId=${id}`)
      mutate('/api/suggestions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/suggestions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId: id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete suggestion')
      }

      mutate('/api/suggestions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete suggestion')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      className={`card relative ${isInProgress ? 'border-2 border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-900/20' : ''}`}
    >
      {suggestionNumber && (
        <span className="absolute top-2 right-2 text-xs text-neutral-300 dark:text-neutral-600 font-mono select-none">
          #{suggestionNumber}
        </span>
      )}
      <div className="flex gap-3">
        <VoteButton suggestionId={id} votes={votes} initialVoteType={userVoteType} />
        <div className="flex-1 min-w-0 py-0.5">
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
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {author === 'ralph' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                <img
                  src="/ralph-avatar.svg"
                  alt=""
                  className="w-4 h-4"
                  width={16}
                  height={16}
                />
                Ralph
              </span>
            )}
            <span className="text-xs text-muted">{formatDate(createdAt)}</span>
            <button
              onClick={() => setShowComments(!showComments)}
              className="text-xs text-muted hover:text-foreground transition-colors flex items-center gap-1"
              aria-label={
                showComments
                  ? 'Hide comments'
                  : commentCount > 0
                    ? `Show ${commentCount} comment${commentCount > 1 ? 's' : ''}`
                    : 'Add a comment'
              }
              aria-expanded={showComments}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {showComments ? 'Hide' : commentCount > 0 ? `${commentCount}` : 'Comment'}
            </button>
            {isOwner && !isInProgress && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1"
                aria-label="Delete your suggestion"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            )}
            {!isInProgress && (
              <ExpediteButton suggestionId={id} currentAmount={expediteAmountCents} />
            )}
          </div>

          {/* Contributor avatars */}
          {(submitter || contributors.length > 0) && (
            <div className="mt-2">
              <ContributorStack
                submitter={submitter}
                contributors={contributors}
                totalCount={contributorCount}
              />
            </div>
          )}

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                Are you sure you want to delete this suggestion?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="text-xs px-2 py-1 bg-neutral-200 dark:bg-neutral-700 text-foreground rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          {/* Existing comments */}
          {comments.length > 0 && (
            <div className="space-y-2 mb-3">
              {comments.map((comment) => {
                const isOwnComment = comment.user_id === currentUserId
                return (
                  <div
                    key={comment.id}
                    className={`text-sm pl-3 border-l-2 ${
                      isOwnComment
                        ? 'border-accent bg-accent/5 -ml-1 pl-4 py-1 rounded-r'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    <p className="text-foreground">{comment.content}</p>
                    <span className="text-xs text-muted">
                      {isOwnComment && <span className="text-accent mr-1">You</span>}
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Comment form - shows login prompt if not logged in */}
          {!isLoggedIn ? (
            <LoginPrompt action="comment" compact />
          ) : (
            <>
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    editingComment ? 'Edit your comment...' : 'Add context for Claude...'
                  }
                  maxLength={300}
                  className="flex-1 text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !commentText.trim() ||
                    !!(editingComment && commentText === editingComment.content)
                  }
                  className="text-sm px-2 py-1 rounded bg-accent text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {isSubmitting ? '...' : editingComment ? 'Save' : 'Add'}
                </button>
              </form>
              {editingComment && (
                <p className="text-xs text-muted mt-1">
                  1 comment per person. Editing your comment.
                </p>
              )}
            </>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  )
}
