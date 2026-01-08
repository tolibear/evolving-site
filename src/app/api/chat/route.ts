import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getChatMessages, addChatMessage, getChatMessagesSince } from '@/lib/db'
import { checkRateLimit } from '@/lib/utils'
import { isInputSafe, sanitizeInput } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

// GET /api/chat - Get chat messages
// Query params:
// - sinceId: Get messages after this ID (for polling)
// - limit: Max messages to return (default 50)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sinceId = searchParams.get('sinceId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    let messages
    if (sinceId) {
      messages = await getChatMessagesSince(parseInt(sinceId, 10), limit)
    } else {
      messages = await getChatMessages(limit)
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/chat - Send a chat message (requires authentication)
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const user = await validateSessionAndGetUser(sessionId)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in with Twitter.' },
        { status: 401 }
      )
    }

    // Rate limit: 30 messages per minute per user
    const rateLimit = checkRateLimit(`chat:user:${user.id}`, 30, 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Slow down! You can send more messages soon.',
          resetIn: Math.ceil(rateLimit.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    // Validate content
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 1) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { error: 'Message must be less than 500 characters' },
        { status: 400 }
      )
    }

    // Check for dangerous content patterns
    if (!isInputSafe(trimmedContent)) {
      return NextResponse.json({ error: 'Message contains disallowed content' }, { status: 400 })
    }

    // Sanitize the content
    const sanitizedContent = sanitizeInput(trimmedContent)

    const id = await addChatMessage(user.id, sanitizedContent)

    return NextResponse.json(
      {
        id,
        message: {
          id,
          user_id: user.id,
          content: sanitizedContent,
          created_at: new Date().toISOString(),
          username: user.twitter_username,
          avatar: user.twitter_avatar,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error sending chat message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
