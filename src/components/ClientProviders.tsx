'use client'

import { useState, useEffect, type ReactNode } from 'react'

interface ClientProvidersProps {
  children: ReactNode
}

// Completely separate component that only loads after mount
function ClientApp({ children }: { children: ReactNode }) {
  // These imports happen ONLY after we're mounted on the client
  const [Component, setComponent] = useState<React.ComponentType<{ children: ReactNode }> | null>(null)

  useEffect(() => {
    // Dynamically import all providers only on the client
    import('./ClientAppInner').then((mod) => {
      setComponent(() => mod.default)
    })
  }, [])

  if (!Component) {
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

  return <Component>{children}</Component>
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR, render nothing - just the basic shell
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

  return <ClientApp>{children}</ClientApp>
}
