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

  // Fullscreen mode - terminal takes over
  if (state.isFullScreen) {
    return (
      <div className="fixed inset-0 z-40 bg-terminal-bg">
        <TerminalView className="h-full" />
        <TerminalToggle />
      </div>
    )
  }

  return (
    <>
      {/* Main content wrapper with terminal in background */}
      <div className="relative min-h-screen">
        {/* Terminal background layer - faded on right side */}
        <div
          className={`
            fixed top-0 right-0 bottom-0 w-full md:w-[400px] lg:w-[500px]
            transition-opacity duration-200
            ${state.isVisible ? 'opacity-15 hover:opacity-40' : 'opacity-0 pointer-events-none'}
            z-0
          `}
        >
          <TerminalView className="h-full" />
        </div>

        {/* Main body content - overlays terminal on mobile, side-by-side on desktop */}
        <div
          className={`
            relative z-10
            transition-opacity duration-200
            ${state.isFullScreen ? 'hidden' : ''}
          `}
        >
          <div className="md:mr-[400px] lg:mr-[500px]">
            {children}
          </div>
        </div>
      </div>

      <TerminalToggle />
    </>
  )
}
