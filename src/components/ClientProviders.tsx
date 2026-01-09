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

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <CreditProvider>
            <TerminalProvider>
              <TerminalContainer>
                {/* Main body - the evolving canvas */}
                <div className="min-h-screen">
                  {/* Main content area - the blank canvas */}
                  <main className="p-4">
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </main>
                </div>

                {/* Chat window (Windows 96 style) on left side */}
                <ChatWindow />

                {/* Sidebar drawer with all control panel components */}
                <SidebarDrawer
                  terminalSlot={<TerminalView className="h-full" />}
                >
                  <SidebarContent />
                </SidebarDrawer>
              </TerminalContainer>
            </TerminalProvider>
          </CreditProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  )
}
