'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface SidebarDrawerProps {
  children: React.ReactNode
  terminalSlot: React.ReactNode
}

const FIRST_VISIT_KEY = 'sidebar-first-visit-shown'

export function SidebarDrawer({ children, terminalSlot }: SidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Handle first visit auto-open
  useEffect(() => {
    setMounted(true)
    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY)
    if (!hasVisited) {
      // Open on first visit
      setIsOpen(true)
      // Auto-close quickly and mark as visited
      const timer = setTimeout(() => {
        setIsOpen(false)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Edge handle/trigger - visible when closed */}
      <button
        onClick={toggleSidebar}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-40
          transition-all duration-200 ease-out
          ${isOpen ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
        `}
        aria-label="Open control panel"
        aria-expanded={isOpen}
      >
        <div className="
          bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600
          text-neutral-500 dark:text-neutral-400 p-2 rounded-l-md
          transition-colors
        ">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      </button>

      {/* Overlay backdrop - click to close */}
      <div
        className={`
          fixed inset-0 z-30
          transition-opacity duration-200
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar drawer */}
      <aside
        className={`
          fixed top-0 right-0 bottom-0 z-40
          w-full md:w-[450px]
          bg-background border-l border-neutral-200 dark:border-neutral-700
          shadow-2xl
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        role="complementary"
        aria-label="Control panel"
        aria-hidden={!isOpen}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
          <h2 className="font-semibold text-sm text-foreground">Control Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close control panel"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sidebar-scroll">
          {children}
        </div>

        {/* Fixed terminal at bottom */}
        <div className="h-[280px] flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700">
          {terminalSlot}
        </div>
      </aside>
    </>
  )
}
