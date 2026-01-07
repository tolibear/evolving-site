import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getComments,
  addCommentWithUser,
  getUserCommentByUserId,
  updateCommentByUser,
} from '@/lib/db'
import { getClientIP, checkRateLimit } from '@/lib/utils'
import { isValidId, isInputSafe, sanitizeInput } from '@/lib/security'
import { validateSessionAndGetUser, SESSION_COOKIE_NAME } from '@/lib/twitter-auth'

export const dynamic = 'force-dynamic'

// GET /api/comments?suggestionId=X - Get comments for a suggestion
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const suggestionId = searchParams.get('suggestionId')

    if (!suggestionId) {
      return NextResponse.json({ error: 'suggestionId is required' }, { status: 400 })
    }

    // Get current user to identify their comment
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value
    const currentUser = await validateSessionAndGetUser(sessionId)

    const comments = await getComments(parseInt(suggestionId, 10))

    return NextResponse.json({
      comments,
      currentUserId: currentUser?.id || null,
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/comments - Add a comment to a suggestion (requires authentication)
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

    const ip = getClientIP(request)

    // Rate limit: 10 comments per hour per user
    const rateLimit = checkRateLimit(`comments:user:${user.id}`, 10, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { suggestionId, content } = body

    // Validate
    if (!isValidId(suggestionId)) {
      return NextResponse.json({ error: 'Valid suggestionId is required' }, { status: 400 })
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 3) {
      return NextResponse.json(
        { error: 'Comment must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 300) {
      return NextResponse.json(
        { error: 'Comment must be less than 300 characters' },
        { status: 400 }
      )
    }

    // Check for dangerous content patterns
    if (!isInputSafe(trimmedContent)) {
      return NextResponse.json({ error: 'Comment contains disallowed content' }, { status: 400 })
    }

    // Sanitize the content
    const sanitizedContent = sanitizeInput(trimmedContent)

    // Check if user already has a comment on this suggestion
    const existingComment = await getUserCommentByUserId(suggestionId, user.id)
    if (existingComment) {
      return NextResponse.json(
        { error: 'You already have a comment on this suggestion. Use edit to update it.' },
        { status: 409 }
      )
    }

    const id = await addCommentWithUser(suggestionId, sanitizedContent, user.id)

    return NextResponse.json(
      {
        id,
        message: 'Comment added successfully',
        remaining: rateLimit.remaining,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}

// PUT /api/comments - Edit user's own comment (requires authentication)
export async function PUT(request: Request) {
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

    const body = await request.json()
    const { commentId, content } = body

    // Validate
    if (!isValidId(commentId)) {
      return NextResponse.json({ error: 'Valid commentId is required' }, { status: 400 })
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length < 3) {
      return NextResponse.json(
        { error: 'Comment must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 300) {
      return NextResponse.json(
        { error: 'Comment must be less than 300 characters' },
        { status: 400 }
      )
    }

    // Check for dangerous content patterns
    if (!isInputSafe(trimmedContent)) {
      return NextResponse.json({ error: 'Comment contains disallowed content' }, { status: 400 })
    }

    // Sanitize the content
    const sanitizedContent = sanitizeInput(trimmedContent)

    const updated = await updateCommentByUser(commentId, sanitizedContent, user.id)
    if (!updated) {
      return NextResponse.json(
        { error: 'Comment not found or you cannot edit this comment' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Comment updated successfully' })
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}
