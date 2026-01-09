'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, type ReactNode } from 'react'

// Dynamically import the actual providers implementation
const ClientProvidersImpl = dynamic(() => import('./ClientProvidersImpl'), {
  ssr: false,
})

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial client render, show nothing
  // This prevents hydration mismatches
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <main className="p-4">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    )
  }

  return <ClientProvidersImpl>{children}</ClientProvidersImpl>
}
