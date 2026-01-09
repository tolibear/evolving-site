'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { AuthProvider } from './AuthProvider'
import { CreditProvider } from './CreditProvider'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 3: ThemeProvider + AuthProvider + CreditProvider
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CreditProvider>
          <div className="min-h-screen">
            <main className="p-4">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </CreditProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
