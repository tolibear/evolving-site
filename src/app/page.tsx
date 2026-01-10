'use client'

// The main page is now a blank canvas for user-suggested features
// All interactive components have moved to the sidebar
// Ralph/Claude should ONLY modify this area when implementing suggestions

import { useState } from 'react'
import { SnakeGame } from '@/components/SnakeGame'
import { DuckHuntGame } from '@/components/DuckHuntGame'

type ActiveGame = 'none' | 'snake' | 'duckhunt'

export default function Home() {
  const [activeGame, setActiveGame] = useState<ActiveGame>('none')

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      {activeGame === 'snake' ? (
        <div className="flex flex-col items-center gap-4">
          <SnakeGame onClose={() => setActiveGame('none')} />
          <p className="text-xs text-muted">A classic retro Snake game suggested by the community</p>
        </div>
      ) : activeGame === 'duckhunt' ? (
        <div className="flex flex-col items-center gap-4">
          <DuckHuntGame onClose={() => setActiveGame('none')} />
          <p className="text-xs text-muted">A Duck Hunt game suggested by the community</p>
        </div>
      ) : (
        <>
          {/* This is where user-suggested features will be implemented */}
          <div className="text-center text-muted max-w-md">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-foreground mb-2">
              Welcome to the evolving canvas
            </h2>
            <p className="text-sm mb-4">
              This site evolves based on your suggestions. Open the control panel on the right to submit ideas and vote.
            </p>
            <p className="text-xs opacity-60 mb-6">
              Click the &ldquo;Control Panel&rdquo; tab on the right edge to get started
            </p>

            {/* Games Section */}
            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-medium text-foreground mb-3">Games</h3>
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => setActiveGame('snake')}
                  className="win96-btn flex items-center gap-2 px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                >
                  <span>🐍</span>
                  <span>Snake</span>
                </button>
                <button
                  onClick={() => setActiveGame('duckhunt')}
                  className="win96-btn flex items-center gap-2 px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                >
                  <span>🦆</span>
                  <span>Duck Hunt</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
