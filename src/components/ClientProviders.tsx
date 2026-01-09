'use client'

import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react'

// Lazy load the full provider tree so it's not imported during SSR
const FullProviderTree = lazy(() => import('./FullProviderTree'))

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial hydration, render ONLY the page content
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    )
  }

  // After mount, lazy load and render the full provider tree
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <main className="p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    }>
      <FullProviderTree>{children}</FullProviderTree>
    </Suspense>
  )
}
