'use client'

import type { ReactNode } from 'react'

interface ClientProvidersProps {
  children: ReactNode
}

// TEMPORARY: Completely stripped down - no providers, no client features
// Just to test if the base page loads
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      <main className="p-4">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 p-4 rounded shadow">
        <p className="text-sm">Debug mode: All features disabled to test base render</p>
      </div>
    </div>
  )
}
