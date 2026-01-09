'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { TooltipProvider } from './ui/tooltip'
import { AuthProvider } from './AuthProvider'
import { CreditProvider } from './CreditProvider'
import { TerminalProvider } from './terminal/TerminalProvider'
import { TerminalContainer } from './terminal/TerminalContainer'
import { ChatWindow } from './chat/ChatWindow'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 7: + ChatWindow
export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <CreditProvider>
            <TerminalProvider>
              <TerminalContainer>
                <div className="min-h-screen">
                  <main className="p-4">
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </main>
                </div>
                <ChatWindow />
              </TerminalContainer>
            </TerminalProvider>
          </CreditProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
