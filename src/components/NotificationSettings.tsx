'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuth } from '@/components/AuthProvider'

export function NotificationSettings() {
  const { isLoggedIn } = useAuth()
  const {
    isSupported,
    permission,
    isSubscribed,
    preferences,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushNotifications()

  if (!isLoggedIn) {
    return null
  }

  if (!isSupported) {
    return (
      <div className="text-xs text-muted">
        Push notifications not supported in this browser
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="text-xs text-amber-600 dark:text-amber-400">
        Notifications blocked. Enable in browser settings.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-muted"
            fill="none"
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
          <span className="text-sm font-medium">Push Notifications</span>
        </div>
        <button
          onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
          disabled={isLoading}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            isSubscribed
              ? 'bg-blue-500'
              : 'bg-neutral-300 dark:bg-neutral-600'
          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isSubscribed ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Notification type toggles (only shown when subscribed) */}
      {isSubscribed && preferences && (
        <div className="pl-6 space-y-2 border-l-2 border-neutral-200 dark:border-neutral-700">
          <NotificationToggle
            label="Your suggestions shipped"
            description="When your suggestion gets implemented"
            checked={preferences.notify_own_shipped}
            onChange={(checked) =>
              updatePreferences({ notify_own_shipped: checked })
            }
            disabled={isLoading}
          />
          <NotificationToggle
            label="Voted suggestions shipped"
            description="When a suggestion you voted on ships"
            checked={preferences.notify_voted_shipped}
            onChange={(checked) =>
              updatePreferences({ notify_voted_shipped: checked })
            }
            disabled={isLoading}
          />
          <NotificationToggle
            label="Vote refills"
            description="When your votes are reset after a deploy"
            checked={preferences.notify_refill}
            onChange={(checked) =>
              updatePreferences({ notify_refill: checked })
            }
            disabled={isLoading}
          />
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500 dark:text-red-400">{error}</div>
      )}
    </div>
  )
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {label}
        </div>
        <div className="text-[10px] text-muted truncate">{description}</div>
      </div>
    </label>
  )
}

/**
 * Compact notification bell button for sidebar
 */
export function NotificationBell() {
  const { isLoggedIn } = useAuth()
  const { isSupported, isSubscribed, isLoading, subscribe } =
    usePushNotifications()

  if (!isLoggedIn || !isSupported) return null

  // Already subscribed - show active bell
  if (isSubscribed) {
    return (
      <div
        className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30"
        title="Notifications enabled"
      >
        <svg
          className="w-4 h-4 text-blue-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    )
  }

  // Not subscribed - show prompt button
  return (
    <button
      onClick={subscribe}
      disabled={isLoading}
      className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
      title="Enable notifications"
    >
      <svg
        className="w-4 h-4 text-muted group-hover:text-foreground"
        fill="none"
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
    </button>
  )
}
