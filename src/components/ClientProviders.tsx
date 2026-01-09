'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 1: Just ThemeProvider
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <main className="p-4">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
