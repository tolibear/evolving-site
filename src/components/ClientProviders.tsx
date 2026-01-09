'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from './AuthProvider'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 2: ThemeProvider + AuthProvider
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen">
          <main className="p-4">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
