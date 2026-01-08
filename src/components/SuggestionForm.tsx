'use client'

import { useState, useRef, FormEvent, KeyboardEvent } from 'react'
import { mutate } from 'swr'
import { useAuth } from './AuthProvider'
import LoginPrompt from './LoginPrompt'
import Avatar from './Avatar'

// Fetch with timeout helper
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error')

      // Don't retry on abort (timeout) or if it's the last attempt
      if (lastError.name === 'AbortError' || attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying (exponential backoff: 500ms, 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }

  throw lastError || new Error('Failed after retries')
}

export default function SuggestionForm() {
  const { user, isLoading, isLoggedIn } = useAuth()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const submitRef = useRef(false) // Prevent double-submit

  // Show login prompt if not authenticated
  if (!isLoading && !isLoggedIn) {
    return (
      <div className="py-3">
        <LoginPrompt action="submit" />
      </div>
    )
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="py-3 animate-pulse">
        <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
      </div>
    )
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, allow Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (content.trim().length >= 10 && !isSubmitting) {
        if (showConfirm) {
          // If already confirming, submit
          handleSubmit(e as unknown as FormEvent)
        } else {
          // Show confirm state
          setShowConfirm(true)
        }
      }
    } else if (e.key === 'Escape' && showConfirm) {
      e.preventDefault()
      setShowConfirm(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Prevent double-submit
    if (submitRef.current || isSubmitting) {
      return
    }

    setError(null)
    setSuccess(false)

    const trimmedContent = content.trim()
    if (trimmedContent.length < 10) {
      setError('Suggestion must be at least 10 characters')
      return
    }

    submitRef.current = true
    setIsSubmitting(true)

    try {
      const response = await fetchWithRetry('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmedContent }),
      })

      // Handle non-JSON responses gracefully
      let data
      try {
        data = await response.json()
      } catch {
        if (!response.ok) {
          throw new Error(`Server error (${response.status})`)
        }
        // If response is ok but not JSON, treat as success
        data = { success: true }
      }

      if (!response.ok) {
        throw new Error(data.error || `Failed to submit (${response.status})`)
      }

      setContent('')
      setSuccess(true)
      setShowConfirm(false)
      // Play success sound
            // Refresh suggestions list
      mutate('/api/suggestions')

      // Clear success message after 5 seconds (longer for better visibility)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
            if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.')
        } else if (err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.')
        } else {
          setError(err.message)
        }
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
      submitRef.current = false
    }
  }

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (content.trim().length >= 10 && !isSubmitting && !showConfirm) {
            setShowConfirm(true)
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        {user && (
          <Avatar username={user.username} avatar={user.avatar} size="xs" showTooltip={false} />
        )}
        <span className="text-xs text-muted">@{user?.username}</span>
      </div>
      <textarea
        id="suggestion"
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          if (showConfirm) setShowConfirm(false)
        }}
        onKeyDown={handleKeyDown}
        placeholder="What feature would you like to see?"
        rows={2}
        maxLength={500}
        className={`w-full px-3 py-2 text-sm border bg-white dark:bg-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors ${
          showConfirm
            ? 'border-green-500 dark:border-green-400 focus:ring-green-500'
            : 'border-neutral-200 dark:border-neutral-700 focus:ring-accent'
        }`}
        disabled={isSubmitting}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {content.length}/500
        </span>
        {showConfirm ? (
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as FormEvent)}
            disabled={isSubmitting}
            className="px-3 py-1 text-sm rounded-lg bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm ↵'}
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting || content.trim().length < 10}
            className="px-3 py-1 text-sm rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mt-2 text-sm text-success">Suggestion submitted successfully!</p>
      )}
    </form>
  )
}
