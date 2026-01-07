'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { mutate } from 'swr'

export default function ExpediteNotification() {
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'cancelled'; text: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    const expedited = searchParams.get('expedited')
    const sessionId = searchParams.get('session_id')
    const cancelled = searchParams.get('expedite_cancelled')

    if (cancelled) {
      setMessage({ type: 'cancelled', text: 'Payment was cancelled.' })
      // Clean URL
      const url = new URL(window.location.href)
      url.searchParams.delete('expedite_cancelled')
      window.history.replaceState({}, '', url.toString())
      return
    }

    if (expedited && sessionId) {
      setIsVerifying(true)
      // Verify the payment was successful
      fetch(`/api/expedite/verify?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMessage({ type: 'success', text: 'Payment successful! Your suggestion has been expedited and will be prioritized.' })
            // Refresh the suggestions list
            mutate('/api/suggestions')
          } else {
            setMessage({ type: 'error', text: 'Payment verification failed. Please contact support if you were charged.' })
          }
        })
        .catch(() => {
          setMessage({ type: 'error', text: 'Failed to verify payment. Please refresh the page.' })
        })
        .finally(() => {
          setIsVerifying(false)
          // Clean URL
          const url = new URL(window.location.href)
          url.searchParams.delete('expedited')
          url.searchParams.delete('session_id')
          window.history.replaceState({}, '', url.toString())
        })
    }
  }, [searchParams])

  if (isVerifying) {
    return (
      <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-blue-700 dark:text-blue-300">Verifying your payment...</span>
        </div>
      </div>
    )
  }

  if (!message) return null

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    cancelled: 'bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-700',
  }

  const textColors = {
    success: 'text-green-700 dark:text-green-300',
    error: 'text-red-700 dark:text-red-300',
    cancelled: 'text-neutral-600 dark:text-neutral-400',
  }

  return (
    <div className={`mb-6 p-4 rounded-lg border ${bgColors[message.type]}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {message.type === 'success' && (
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {message.type === 'error' && (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span className={textColors[message.type]}>{message.text}</span>
        </div>
        <button
          onClick={() => setMessage(null)}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
