# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

"Evolving Site" is a self-evolving website where users submit feature suggestions, vote on them, and Claude implements the winners. The site owner manually triggers Claude to implement specific suggestions.

**Live site**: https://evolving-site.vercel.app

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build (run before committing to verify no errors)
npm run lint     # ESLint check
```

## Architecture

### Database
- **Turso (libSQL)** - requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars
- Always connects to production database (no local fallback)
- Database client: `@libsql/client`
- Schema initialized automatically in `src/lib/db.ts`

### Data Flow
1. Users submit suggestions via `SuggestionForm` → `POST /api/suggestions`
2. Users vote via `VoteButton` → `POST /api/vote` (deduplicated by IP+UserAgent hash)
3. Site owner triggers Claude to implement top-voted suggestions
4. Implemented suggestions move to `Changelog`; rejected ones to `DeniedList`

### Key Tables
- `suggestions` - user-submitted features with votes, status (pending/in_progress/implemented/denied), and optional `ai_note`
- `votes` - deduplication tracking via voter_hash
- `changelog` - implemented features with commit hashes
- `status` - singleton row tracking current work state for live status banner

### Dark Mode
Uses CSS variables defined in `globals.css` with Tailwind's `darkMode: 'class'`. Theme toggle persists to localStorage.

## Implementing Suggestions

When asked to implement a suggestion:

1. Update status to "working" via `updateStatus()` in `src/lib/db.ts`
2. Make the changes
3. Run `npm run build` to verify
4. Update suggestion status to "implemented" or "denied" with `updateSuggestionStatus()`
5. Add changelog entry with `addChangelogEntry()`
6. Set status back to "idle"
7. Commit changes
8. **Push to origin/master** to trigger Vercel deployment

Use `ai_note` parameter to add implementation notes visible in the UI.

**CRITICAL**: Never end implementation without pushing. Changes must reach production for users to see them.

## Rate Limits
- Suggestions: 5 per hour per IP
- Votes: 50 per day per IP

## Security Rules (CRITICAL)

When implementing suggestions, Claude MUST follow these security rules. Violations could compromise user data or destroy the site.

### NEVER Do These Things
1. **Never expose environment variables** - Do not log, return in API responses, or display `process.env` values
2. **Never delete database tables** - Do not use DROP TABLE or DELETE without WHERE clauses
3. **Never delete critical files** - Especially: `src/lib/db.ts`, `src/app/api/*`, `next.config.js`, `package.json`
4. **Never disable security headers** - The CSP and other headers in `next.config.js` must remain
5. **Never add routes that bypass rate limiting** - All user-facing POST endpoints need rate limits
6. **Never commit secrets** - No API keys, tokens, or credentials in code
7. **Never add eval() or dangerouslySetInnerHTML** - Unless absolutely necessary with proper sanitization
8. **Never add file upload without validation** - Check file types, sizes, and sanitize names

### Always Do These Things
1. **Sanitize user input** - Use `sanitizeInput()` from `src/lib/security.ts` for user-provided strings
2. **Use parameterized queries** - Always use prepared statements with args, never string concatenation
3. **Validate on server** - Never trust client-side validation alone
4. **Check types** - Validate typeof for all user inputs before using them
5. **Keep rate limits** - Maintain or strengthen existing rate limiting

### If Unsure
If a suggestion asks for something that might violate these rules, mark it as "denied" with an `ai_note` explaining the security concern. User security > feature requests.

## Autonomous Mode

The site can run autonomously, implementing the top-voted suggestion every hour.

### Setup (macOS)

1. **Install the launchd agent:**
```bash
cp scripts/com.evolving-site.auto-implement.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.evolving-site.auto-implement.plist
```

2. **Verify it's running:**
```bash
launchctl list | grep evolving-site
```

3. **Check logs:**
```bash
tail -f logs/launchd-stdout.log
```

### How It Works

1. `scripts/auto-implement.sh` runs every hour via launchd
2. Checks production API for suggestions with votes > 0
3. If found, runs Claude Code with `scripts/implement-prompt.md`
4. Claude implements or denies the suggestion following security rules
5. Pushes to git, triggering Vercel deployment

### Stop Autonomous Mode

```bash
launchctl unload ~/Library/LaunchAgents/com.evolving-site.auto-implement.plist
```

### Manual Test

```bash
./scripts/auto-implement.sh
```
