'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'brown' | 'lemon' | 'leaf' | 'neon'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme: Theme = stored || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    document.documentElement.classList.remove('dark', 'brown', 'lemon', 'leaf', 'neon')
    if (newTheme !== 'light') {
      document.documentElement.classList.add(newTheme)
    }
  }

  const cycleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'neon', 'brown', 'lemon', 'leaf']
    const currentIndex = themeOrder.indexOf(theme)
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length]
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
  }

  if (!mounted) {
    return <div className="w-9 h-9" /> // Placeholder to prevent layout shift
  }

  const getAriaLabel = () => {
    switch (theme) {
      case 'light': return 'Switch to dark mode'
      case 'dark': return 'Switch to neon mode'
      case 'neon': return 'Switch to brown mode'
      case 'brown': return 'Switch to lemon mode'
      case 'lemon': return 'Switch to leaf mode'
      case 'leaf': return 'Switch to light mode'
    }
  }

  return (
    <button
        onClick={cycleTheme}
        className={`p-2 rounded-lg transition-colors ${
          theme === 'neon'
            ? 'hover:bg-orange-500/20'
            : theme === 'brown'
            ? 'hover:bg-amber-900'
            : theme === 'lemon'
            ? 'hover:bg-yellow-200'
            : theme === 'leaf'
            ? 'hover:bg-emerald-200'
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'
        }`}
        aria-label={getAriaLabel()}
      >
        {theme === 'light' && (
          <svg className="w-5 h-5 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
        {theme === 'dark' && (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {theme === 'neon' && (
          <svg className="w-5 h-5 text-orange-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        )}
        {theme === 'brown' && (
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
          </svg>
        )}
        {theme === 'lemon' && (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <ellipse cx="10" cy="10" rx="6" ry="8" transform="rotate(-30 10 10)" />
            <ellipse cx="10" cy="10" rx="4" ry="6" transform="rotate(-30 10 10)" fill="#fef08a" />
          </svg>
        )}
        {theme === 'leaf' && (
          <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15.5 2.5c-3 0-6 1.5-8 4.5-1.5 2.5-2 5-1.5 7.5.5 2.5 2 4.5 4 5.5.5-1 1-2 1.5-3 .5-1 1.5-2 2.5-2.5 1-.5 2.5-1 3.5-1 1 0 2 0 3 .5-1-3-3-5.5-5-7.5 2 0 4 .5 5.5 1.5-1-2.5-3-4-5.5-5z" />
            <path d="M4.5 17.5c0-1 .5-2 1-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </svg>
        )}
    </button>
  )
}
