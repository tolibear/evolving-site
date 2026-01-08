'use client'

import { useCredits } from '@/components/CreditProvider'

export function BoostBadge() {
  const { balance, openCheckout } = useCredits()

  if (balance <= 0) return null

  return (
    <button
      onClick={openCheckout}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300
                 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
      title="Your boost credits"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {balance}
    </button>
  )
}
