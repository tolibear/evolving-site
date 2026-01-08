'use client'

import { useState, ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 flex items-center justify-between
                   bg-neutral-50 dark:bg-neutral-800/50
                   hover:bg-neutral-100 dark:hover:bg-neutral-800
                   transition-colors text-left"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-sm text-foreground">{title}</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-out
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3">
          {children}
        </div>
      </div>
    </div>
  )
}
