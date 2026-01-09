'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface SidebarDrawerProps {
  children: React.ReactNode
  terminalSlot: React.ReactNode
}

const FIRST_VISIT_KEY = 'sidebar-first-visit-shown'
const TERMINAL_HEIGHT_KEY = 'terminal-height'
const TERMINAL_COLLAPSED_KEY = 'terminal-collapsed-mobile'
const MIN_TERMINAL_HEIGHT = 150
const MAX_TERMINAL_HEIGHT = 600
const DEFAULT_TERMINAL_HEIGHT = 280

export function SidebarDrawer({ children, terminalSlot }: SidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT)
  const [isDragging, setIsDragging] = useState(false)
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  // Handle first visit auto-open and load saved terminal height
  useEffect(() => {
    setMounted(true)

    // Load saved terminal height
    const savedHeight = localStorage.getItem(TERMINAL_HEIGHT_KEY)
    if (savedHeight) {
      const height = parseInt(savedHeight, 10)
      if (height >= MIN_TERMINAL_HEIGHT && height <= MAX_TERMINAL_HEIGHT) {
        setTerminalHeight(height)
      }
    }

    // Load saved terminal collapsed state (mobile only)
    const savedCollapsed = localStorage.getItem(TERMINAL_COLLAPSED_KEY)
    if (savedCollapsed === 'true') {
      setIsTerminalCollapsed(true)
    }

    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY)
    if (!hasVisited) {
      // Open on first visit
      setIsOpen(true)
      // Auto-close after 1 second and mark as visited
      const timer = setTimeout(() => {
        setIsOpen(false)
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Handle drag to resize terminal
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    dragStartHeight.current = terminalHeight
  }, [terminalHeight])

  useEffect(() => {
    if (!isDragging) return

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const delta = dragStartY.current - clientY // Negative = dragging down, Positive = dragging up
      const newHeight = Math.min(MAX_TERMINAL_HEIGHT, Math.max(MIN_TERMINAL_HEIGHT, dragStartHeight.current + delta))
      setTerminalHeight(newHeight)
    }

    const handleDragEnd = () => {
      setIsDragging(false)
      localStorage.setItem(TERMINAL_HEIGHT_KEY, terminalHeight.toString())
    }

    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
    window.addEventListener('touchmove', handleDragMove)
    window.addEventListener('touchend', handleDragEnd)

    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('touchmove', handleDragMove)
      window.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, terminalHeight])

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

  const toggleTerminalCollapsed = useCallback(() => {
    setIsTerminalCollapsed(prev => {
      const newValue = !prev
      localStorage.setItem(TERMINAL_COLLAPSED_KEY, String(newValue))
      return newValue
    })
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
          bg-black/50 backdrop-blur-sm
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
        {/* Close button for mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 z-10 md:hidden p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-4 pt-14 md:pt-4 sidebar-scroll">
          {children}
        </div>

        {/* Resizable terminal at bottom */}
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* Mobile: Collapsible header */}
          <button
            onClick={toggleTerminalCollapsed}
            className="md:hidden flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            aria-expanded={!isTerminalCollapsed}
            aria-label={isTerminalCollapsed ? 'Show terminal' : 'Hide terminal'}
          >
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Terminal
            </span>
            <svg
              className={`w-4 h-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${isTerminalCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          {/* Drag handle - desktop only when not collapsed, or always on mobile when expanded */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`
              h-2 cursor-ns-resize flex items-center justify-center
              hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors
              ${isDragging ? 'bg-neutral-300 dark:bg-neutral-600' : ''}
              ${isTerminalCollapsed ? 'hidden md:flex' : ''}
            `}
            title="Drag to resize terminal"
          >
            <div className="w-8 h-0.5 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
          </div>
          {/* Terminal content - hidden on mobile when collapsed */}
          <div
            style={{ height: isTerminalCollapsed ? 0 : terminalHeight }}
            className={`overflow-hidden transition-[height] duration-200 ${isTerminalCollapsed ? 'md:!h-auto' : ''}`}
          >
            <div style={{ height: terminalHeight }} className="md:h-full">
              {terminalSlot}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
