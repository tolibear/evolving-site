/**
 * Push Notifications System
 *
 * Handles:
 * - Service worker registration
 * - Push subscription management
 * - Sending notifications to users
 */

import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Notification types
export type NotificationType =
  | 'own_shipped'      // Your suggestion was shipped
  | 'voted_shipped'    // A suggestion you voted on shipped
  | 'vote_refill'      // Votes have been refilled

export interface PushSubscription {
  user_id: number
  endpoint: string
  p256dh: string
  auth: string
  notify_own_shipped: boolean
  notify_voted_shipped: boolean
  notify_refill: boolean
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    type?: NotificationType
    suggestionId?: number
  }
}

/**
 * Save or update a push subscription for a user
 */
export async function savePushSubscription(
  userId: number,
  subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
): Promise<void> {
  // Delete any existing subscription for this user
  await db.execute({
    sql: 'DELETE FROM push_subscriptions WHERE user_id = ?',
    args: [userId],
  })

  // Insert new subscription
  await db.execute({
    sql: `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?)`,
    args: [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
  })
}

/**
 * Remove a push subscription
 */
export async function removePushSubscription(userId: number): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM push_subscriptions WHERE user_id = ?',
    args: [userId],
  })
}

/**
 * Get push subscription for a user
 */
export async function getPushSubscription(userId: number): Promise<PushSubscription | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM push_subscriptions WHERE user_id = ?',
    args: [userId],
  })

  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as PushSubscription
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: number,
  preferences: {
    notify_own_shipped?: boolean
    notify_voted_shipped?: boolean
    notify_refill?: boolean
  }
): Promise<void> {
  const updates: string[] = []
  const args: (number | boolean)[] = []

  if (preferences.notify_own_shipped !== undefined) {
    updates.push('notify_own_shipped = ?')
    args.push(preferences.notify_own_shipped)
  }
  if (preferences.notify_voted_shipped !== undefined) {
    updates.push('notify_voted_shipped = ?')
    args.push(preferences.notify_voted_shipped)
  }
  if (preferences.notify_refill !== undefined) {
    updates.push('notify_refill = ?')
    args.push(preferences.notify_refill)
  }

  if (updates.length === 0) return

  args.push(userId)
  await db.execute({
    sql: `UPDATE push_subscriptions SET ${updates.join(', ')} WHERE user_id = ?`,
    args,
  })
}

/**
 * Get all subscriptions that should receive a notification
 */
export async function getSubscriptionsForNotification(
  type: NotificationType,
  userIds?: number[]
): Promise<PushSubscription[]> {
  let sql = 'SELECT * FROM push_subscriptions WHERE '
  const args: (string | number | boolean)[] = []

  // Filter by notification type preference
  switch (type) {
    case 'own_shipped':
      sql += 'notify_own_shipped = true'
      break
    case 'voted_shipped':
      sql += 'notify_voted_shipped = true'
      break
    case 'vote_refill':
      sql += 'notify_refill = true'
      break
  }

  // Optionally filter by user IDs
  if (userIds && userIds.length > 0) {
    sql += ` AND user_id IN (${userIds.map(() => '?').join(', ')})`
    args.push(...userIds)
  }

  const result = await db.execute({ sql, args })
  return result.rows as unknown as PushSubscription[]
}

/**
 * Send a push notification to a single subscription
 * Uses web-push library (must be installed: npm install web-push)
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  // Dynamic import to handle cases where web-push isn't available
  try {
    const webPush = await import('web-push')

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@evolving-site.vercel.app'

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured, skipping push notification')
      return false
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    )

    return true
  } catch (error) {
    console.error('Push notification failed:', error)

    // If subscription is invalid, remove it
    if ((error as { statusCode?: number }).statusCode === 410) {
      await removePushSubscription(subscription.user_id)
    }

    return false
  }
}

/**
 * Notify users when a suggestion is shipped
 */
export async function notifySuggestionShipped(
  suggestionId: number,
  suggestionContent: string,
  suggesterId: number | null,
  voterIds: number[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  // Notify the suggester
  if (suggesterId) {
    const subscriptions = await getSubscriptionsForNotification('own_shipped', [suggesterId])
    for (const sub of subscriptions) {
      const success = await sendPushNotification(sub, {
        title: 'Your feature just shipped!',
        body: `${suggestionContent.substring(0, 50)}${suggestionContent.length > 50 ? '...' : ''}`,
        tag: `shipped-${suggestionId}`,
        data: {
          url: '/?highlight=' + suggestionId,
          type: 'own_shipped',
          suggestionId,
        },
      })
      if (success) sent++
      else failed++
    }
  }

  // Notify voters (excluding the suggester who already got notified)
  const votersToNotify = voterIds.filter(id => id !== suggesterId)
  if (votersToNotify.length > 0) {
    const subscriptions = await getSubscriptionsForNotification('voted_shipped', votersToNotify)
    for (const sub of subscriptions) {
      const success = await sendPushNotification(sub, {
        title: 'A feature you backed shipped!',
        body: `${suggestionContent.substring(0, 50)}${suggestionContent.length > 50 ? '...' : ''}`,
        tag: `shipped-${suggestionId}`,
        data: {
          url: '/?highlight=' + suggestionId,
          type: 'voted_shipped',
          suggestionId,
        },
      })
      if (success) sent++
      else failed++
    }
  }

  return { sent, failed }
}

/**
 * Notify all users that votes have been refilled
 */
export async function notifyVoteRefill(): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  const subscriptions = await getSubscriptionsForNotification('vote_refill')
  for (const sub of subscriptions) {
    const success = await sendPushNotification(sub, {
      title: 'Votes refilled!',
      body: 'A new feature just shipped. Your votes have been reset!',
      tag: 'vote-refill',
      data: {
        url: '/',
        type: 'vote_refill',
      },
    })
    if (success) sent++
    else failed++
  }

  return { sent, failed }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}
