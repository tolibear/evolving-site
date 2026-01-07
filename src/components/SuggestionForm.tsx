'use client'

import { useState, useRef, FormEvent } from 'react'
import { mutate } from 'swr'

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
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const submitRef = useRef(false) // Prevent double-submit

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

  return (
    <form onSubmit={handleSubmit} className="card mb-8">
      <label htmlFor="suggestion" className="block text-sm font-medium mb-2">
        Suggest a feature
      </label>
      <textarea
        id="suggestion"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What feature would you like to see? Be specific..."
        rows={3}
        maxLength={500}
        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-muted">
          {content.length}/500 characters
        </span>
        <button
          type="submit"
          disabled={isSubmitting || content.trim().length < 10}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-sm text-success">Suggestion submitted successfully!</p>
      )}
    </form>
  )
}
