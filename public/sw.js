/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks
 */

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const { title, body, icon, badge, tag, data: notificationData } = data

  const options = {
    body,
    icon: icon || '/icon.png',
    badge: badge || '/icon.png',
    tag: tag || 'default',
    data: notificationData || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})
