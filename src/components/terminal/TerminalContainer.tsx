'use client'

import React from 'react'
import { useTerminal } from './TerminalProvider'
import { TerminalView } from './TerminalView'
import { TerminalToggle } from './TerminalToggle'

interface TerminalContainerProps {
  children: React.ReactNode
}

export function TerminalContainer({ children }: TerminalContainerProps) {
  const { state } = useTerminal()

  // Fullscreen mode - terminal takes over the entire screen
  if (state.isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-terminal-bg">
        <TerminalView className="h-full" />
        <TerminalToggle />
      </div>
    )
  }

  // Normal mode - just render children, terminal is handled by sidebar
  return <>{children}</>
}
