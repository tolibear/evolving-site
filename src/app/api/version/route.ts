import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/version - Returns the current deployed git commit hash
// Used by Ralph to verify when a new deployment is live
export async function GET() {
  // Vercel sets VERCEL_GIT_COMMIT_SHA during builds
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'

  return NextResponse.json({
    commit: commitSha,
    // Also return short hash for display
    shortCommit: commitSha.slice(0, 7),
  })
}
