'use client'

import { useState, useEffect, useCallback } from 'react'

interface NotificationPreferences {
  notify_own_shipped: boolean
  notify_voted_shipped: boolean
  notify_refill: boolean
}

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  isSubscribed: boolean
  preferences: NotificationPreferences | null
  isLoading: boolean
  error: string | null
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    preferences: null,
    isLoading: true,
    error: null,
  })

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window

      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          permission: 'unsupported',
          isLoading: false,
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
      }))

      // Register service worker
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (err) {
        console.error('Service worker registration failed:', err)
      }

      // Check current subscription status
      await checkSubscription()
    }

    checkSupport()
  }, [])

  const checkSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/subscribe')
      if (response.ok) {
        const data = await response.json()
        setState((prev) => ({
          ...prev,
          isSubscribed: data.subscribed,
          preferences: data.preferences,
          isLoading: false,
        }))
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: 'Push notifications not supported' }))
      return false
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Request permission
      const permission = await Notification.requestPermission()
      setState((prev) => ({ ...prev, permission }))

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
        }))
        return false
      }

      // Get VAPID public key from server
      const keyResponse = await fetch('/api/notifications/subscribe')
      const keyData = await keyResponse.json()

      if (!keyData.vapidPublicKey) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Push notifications not configured on server',
        }))
        return false
      }

      // Get push subscription
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.vapidPublicKey) as BufferSource,
      })

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        preferences: {
          notify_own_shipped: true,
          notify_voted_shipped: true,
          notify_refill: true,
        },
        isLoading: false,
      }))

      return true
    } catch (err) {
      console.error('Subscription error:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to subscribe',
      }))
      return false
    }
  }, [state.isSupported])

  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Unsubscribe from push manager
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }

      // Remove from server
      await fetch('/api/notifications/subscribe', { method: 'DELETE' })

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        preferences: null,
        isLoading: false,
      }))

      return true
    } catch (err) {
      console.error('Unsubscribe error:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to unsubscribe',
      }))
      return false
    }
  }, [])

  const updatePreferences = useCallback(
    async (preferences: Partial<NotificationPreferences>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const response = await fetch('/api/notifications/subscribe', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        })

        if (!response.ok) {
          throw new Error('Failed to update preferences')
        }

        setState((prev) => ({
          ...prev,
          preferences: prev.preferences
            ? { ...prev.preferences, ...preferences }
            : null,
          isLoading: false,
        }))

        return true
      } catch (err) {
        console.error('Update preferences error:', err)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to update',
        }))
        return false
      }
    },
    []
  )

  return {
    ...state,
    subscribe,
    unsubscribe,
    updatePreferences,
    checkSubscription,
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
