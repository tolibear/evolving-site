'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Avatar from '@/components/Avatar'
import LoginPrompt from '@/components/LoginPrompt'

interface UserInfoProps {
  compact?: boolean
}

export default function UserInfo({ compact = false }: UserInfoProps) {
  const { user, isLoading, isLoggedIn, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  // Compact mode: just avatar + dropdown
  if (compact) {
    if (isLoading) {
      return <div className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
    }

    if (!isLoggedIn) {
      return <LoginPrompt action="submit" compact />
    }

    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          title={`@${user!.username}`}
        >
          <Avatar username={user!.username} avatar={user!.avatar} size="xs" />
          <span className="text-xs text-muted hidden sm:inline">@{user!.username}</span>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 min-w-[120px]">
              <button
                onClick={() => {
                  logout()
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // Full mode: card-based display
  if (isLoading) {
    return (
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 mb-2" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
        <p className="text-sm text-muted mb-2">Sign in to submit and vote</p>
        <LoginPrompt action="submit" />
      </div>
    )
  }

  return (
    <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar username={user!.username} avatar={user!.avatar} size="md" />
          <div>
            <p className="font-medium text-sm text-foreground">@{user!.username}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
