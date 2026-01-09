'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { TooltipProvider } from './ui/tooltip'
import { AuthProvider } from './AuthProvider'
import { CreditProvider } from './CreditProvider'
import { TerminalProvider } from './terminal/TerminalProvider'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 5: + TerminalProvider
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <CreditProvider>
            <TerminalProvider>
              <div className="min-h-screen">
                <main className="p-4">
                  <div className="max-w-7xl mx-auto">
                    {children}
                  </div>
                </main>
              </div>
            </TerminalProvider>
          </CreditProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
