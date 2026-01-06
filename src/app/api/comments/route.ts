import { NextResponse } from 'next/server'
import { getComments, addComment, getUserComment, updateComment } from '@/lib/db'
import { getClientIP, createVoterHash, checkRateLimit } from '@/lib/utils'
import { isValidId } from '@/lib/security'

// Force dynamic
export const dynamic = 'force-dynamic'

// GET /api/comments?suggestionId=X - Get comments for a suggestion
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const suggestionId = searchParams.get('suggestionId')

    if (!suggestionId) {
      return NextResponse.json(
        { error: 'suggestionId is required' },
        { status: 400 }
      )
    }

    // Get current user's hash so frontend can identify their comment
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''
    const currentUserHash = createVoterHash(ip, userAgent)

    const comments = await getComments(parseInt(suggestionId, 10))
    return NextResponse.json({ comments, currentUserHash })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/comments - Add a comment to a suggestion (1 per user per suggestion)
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''

    // Rate limit: 10 comments per hour
    const rateLimit = checkRateLimit(`comments:${ip}`, 10, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetIn: Math.ceil(rateLimit.resetIn / 1000)
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { suggestionId, content } = body

    // Validate
    if (!isValidId(suggestionId)) {
      return NextResponse.json(
        { error: 'Valid suggestionId is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
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

    // Create commenter hash
    const commenterHash = createVoterHash(ip, userAgent)

    // Check if user already has a comment on this suggestion
    const existingComment = await getUserComment(suggestionId, commenterHash)
    if (existingComment) {
      return NextResponse.json(
        { error: 'You already have a comment on this suggestion. Use edit to update it.' },
        { status: 409 }
      )
    }

    const id = await addComment(suggestionId, trimmedContent, commenterHash)

    return NextResponse.json(
      {
        id,
        message: 'Comment added successfully',
        remaining: rateLimit.remaining
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}

// PUT /api/comments - Edit user's own comment
export async function PUT(request: Request) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || ''

    const body = await request.json()
    const { commentId, content } = body

    // Validate
    if (!isValidId(commentId)) {
      return NextResponse.json(
        { error: 'Valid commentId is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
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

    // Create commenter hash - only allows editing own comments
    const commenterHash = createVoterHash(ip, userAgent)

    const updated = await updateComment(commentId, trimmedContent, commenterHash)
    if (!updated) {
      return NextResponse.json(
        { error: 'Comment not found or you cannot edit this comment' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Comment updated successfully' })
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}
