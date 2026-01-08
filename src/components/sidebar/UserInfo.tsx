'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useTheme } from '@/components/ThemeProvider'
import Avatar from '@/components/Avatar'
import LoginPrompt from '@/components/LoginPrompt'

interface UserInfoProps {
  compact?: boolean
}

export default function UserInfo({ compact = false }: UserInfoProps) {
  const { user, isLoading, isLoggedIn, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const { isSupported, isSubscribed, isLoading: notifLoading, subscribe, unsubscribe } = usePushNotifications()
  const { theme, toggleTheme } = useTheme()

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
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 min-w-[160px]">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
              >
                {theme === 'dark' ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="4" strokeWidth={2} />
                    <path strokeWidth={2} strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              {/* Notification toggle */}
              {isSupported && (
                <button
                  onClick={() => {
                    if (isSubscribed) {
                      unsubscribe()
                    } else {
                      subscribe()
                    }
                  }}
                  disabled={notifLoading}
                  className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 ${isSubscribed ? 'text-blue-500' : ''}`}
                    fill={isSubscribed ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span>Notifications {isSubscribed ? 'on' : 'off'}</span>
                </button>
              )}
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
