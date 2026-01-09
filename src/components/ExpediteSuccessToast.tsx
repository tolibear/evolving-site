'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ExpediteSuccessToast() {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [suggestionId, setSuggestionId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything during SSR - useSearchParams needs client
  if (!mounted) return null

  return <ExpediteSuccessToastInner show={show} setShow={setShow} suggestionId={suggestionId} setSuggestionId={setSuggestionId} />
}

function ExpediteSuccessToastInner({
  show,
  setShow,
  suggestionId,
  setSuggestionId
}: {
  show: boolean
  setShow: (show: boolean) => void
  suggestionId: string | null
  setSuggestionId: (id: string | null) => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const expedited = searchParams.get('expedited')
    const id = searchParams.get('suggestionId')

    if (expedited === 'true' && id) {
      setShow(true)
      setSuggestionId(id)

      // Clean up the URL
      const url = new URL(window.location.href)
      url.searchParams.delete('expedited')
      url.searchParams.delete('suggestionId')
      router.replace(url.pathname + url.search, { scroll: false })

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShow(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, router, setShow, setSuggestionId])

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              Payment successful!
            </h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Suggestion #{suggestionId} has been expedited and moved up in the queue.
            </p>
          </div>
          <button
            onClick={() => setShow(false)}
            className="flex-shrink-0 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
