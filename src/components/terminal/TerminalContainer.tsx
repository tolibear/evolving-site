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
      {/* Main content wrapper with terminal on right side */}
      <div className="relative min-h-screen">
        {/* Terminal panel - fixed on right side */}
        <div
          className={`
            fixed top-0 right-0 bottom-0 w-full md:w-[400px] lg:w-[500px]
            transition-all duration-300 ease-out
            ${state.isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}
            z-30 shadow-2xl
          `}
        >
          <TerminalView className="h-full" />
        </div>

        {/* Main body content */}
        <div
          className={`
            relative z-10
            transition-all duration-200
            ${state.isFullScreen ? 'hidden' : ''}
          `}
        >
          <div className={`${state.isVisible ? 'md:mr-[400px] lg:mr-[500px]' : ''}`}>
            {children}
          </div>
        </div>
      </div>

      <TerminalToggle />
    </>
  )
}
