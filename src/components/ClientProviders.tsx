'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { TooltipProvider } from './ui/tooltip'
import { AuthProvider } from './AuthProvider'
import { CreditProvider } from './CreditProvider'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 4: + TooltipProvider
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
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
      </TooltipProvider>
    </ThemeProvider>
  )
}
