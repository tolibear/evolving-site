'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { TooltipProvider } from './ui/tooltip'
import { AuthProvider } from './AuthProvider'
import { CreditProvider } from './CreditProvider'
import { TerminalProvider } from './terminal/TerminalProvider'
import { TerminalContainer } from './terminal/TerminalContainer'
import { TerminalView } from './terminal/TerminalView'
import { SidebarDrawer } from './sidebar/SidebarDrawer'
import { ChatWindow } from './chat/ChatWindow'
import { SidebarContent } from './sidebar'

interface ClientProvidersProps {
  children: ReactNode
}

// TEST 8c: + TerminalView (SidebarContent still placeholder)
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
                <SidebarDrawer terminalSlot={<TerminalView className="h-full" />}>
                  <div>Content placeholder</div>
                </SidebarDrawer>
              </TerminalContainer>
            </TerminalProvider>
          </CreditProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
