import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/db'
import {
  savePushSubscription,
  removePushSubscription,
  getPushSubscription,
  updateNotificationPreferences,
} from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// GET - Get current subscription status and preferences
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const subscription = await getPushSubscription(session.user.id)
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || null

    return NextResponse.json({
      subscribed: !!subscription,
      preferences: subscription
        ? {
            notify_own_shipped: subscription.notify_own_shipped,
            notify_voted_shipped: subscription.notify_voted_shipped,
            notify_refill: subscription.notify_refill,
          }
        : null,
      vapidPublicKey,
    })
  } catch (error) {
    console.error('Error getting subscription:', error)
    return NextResponse.json({ error: 'Failed to get subscription' }, { status: 500 })
  }
}

// POST - Subscribe to push notifications
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }

    await savePushSubscription(session.user.id, subscription)

    return NextResponse.json({ success: true, message: 'Subscribed to notifications' })
  } catch (error) {
    console.error('Error subscribing:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

// PUT - Update notification preferences
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { notify_own_shipped, notify_voted_shipped, notify_refill } = body

    await updateNotificationPreferences(session.user.id, {
      notify_own_shipped,
      notify_voted_shipped,
      notify_refill,
    })

    return NextResponse.json({ success: true, message: 'Preferences updated' })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    await removePushSubscription(session.user.id)

    return NextResponse.json({ success: true, message: 'Unsubscribed from notifications' })
  } catch (error) {
    console.error('Error unsubscribing:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
