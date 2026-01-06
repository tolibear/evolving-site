'use client'

import { useState, FormEvent } from 'react'
import { mutate } from 'swr'

export default function SuggestionForm() {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (content.trim().length < 10) {
      setError('Suggestion must be at least 10 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit suggestion')
      }

      setContent('')
      setSuccess(true)
      // Refresh suggestions list
      mutate('/api/suggestions')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
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
