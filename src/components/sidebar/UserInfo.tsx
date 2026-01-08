'use client'

import { useAuth } from '@/components/AuthProvider'
import Avatar from '@/components/Avatar'
import LoginPrompt from '@/components/LoginPrompt'

export default function UserInfo() {
  const { user, isLoading, isLoggedIn, logout } = useAuth()

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
