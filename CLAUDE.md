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
4. Commit and push changes to trigger deployment
5. **CRITICAL: Run the finalize script** to update the database:
   ```bash
   npm run finalize -- <suggestionId> <status> "<content>" <votes> "<aiNote>" <commitHash> [iconType]
   ```
   Example:
   ```bash
   npm run finalize -- 12 implemented "Add dark mode" 5 "Added toggle with CSS variables" abc1234 theme
   ```

   Available icon types for `iconType` (optional - auto-detected from content if not specified):
   - UI: `theme`, `layout`, `image`, `button`, `form`
   - Features: `search`, `notification`, `settings`, `user`, `chat`
   - Data: `list`, `chart`, `file`, `link`, `code`
   - Actions: `add`, `edit`, `delete`, `share`, `vote`
   - System: `security`, `speed`, `mobile`, `terminal`
   - Creative: `animation`, `sound`, `time`, `magic`, `globe`, `bookmark`, `eye`, `puzzle`, `trophy`, `heart`, `rocket`, `palette`, `brain`, `shield`, `compass`, `zap`, `tag`, `cursor`, `refresh`, `icon`
   - Fallbacks: `star`, `sparkle`, `dot`, `diamond`, `hexagon`, `flower`

The finalize script:
- Updates suggestion status to "implemented" or "denied"
- Adds changelog entry (if implemented)
- Grants 2 votes to all users (if implemented)
- Sets status back to "idle"

**CRITICAL**: Never end implementation without:
1. Pushing to origin/master (triggers Vercel deployment)
2. Running `npm run finalize` (removes suggestion from pending list)

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

## Ralph Agent (VPS Deployment)

Ralph is the autonomous implementation agent that runs 24/7 on an AWS VPS.

### Architecture

- **Website**: Next.js deployed on Vercel (auto-deploys on git push)
- **Ralph Agent**: Runs as a systemd service on AWS VPS
- **Database**: Turso (shared between website and Ralph)

### VPS Commands

```bash
./deploy-ralph.sh    # Push changes and restart Ralph on VPS
./ralph-logs.sh      # Stream live logs from VPS
```

### Local Development Commands

```bash
npm run ralph           # Start Ralph locally (respects current mode)
npm run ralph:auto      # Start locally in automated mode
npm run ralph:manual    # Start locally in manual mode
```

### How It Works

1. Ralph runs continuously on the VPS as a systemd service
2. Every N minutes (configurable), it checks for top-voted suggestions
3. If a suggestion has votes > 0 and mode is "automated":
   - Pulls latest git changes
   - Runs Claude Code to implement the suggestion
   - Commits and pushes (triggers Vercel deployment)
   - Updates the database (finalizes the suggestion)
4. Logs are available via `journalctl` on the VPS
5. On errors, automatically switches to manual mode

### Configuration

Set in `.env` on the VPS:
```bash
RALPH_INTERVAL_MINUTES=10    # Check interval (1-60 minutes, default: 10)
RALPH_API_SECRET=xxx         # Required: API secret for authentication
RALPH_API_URL=https://...    # Optional: Override production URL
```

### VPS Management

```bash
# SSH into VPS (see ~/Ralph/VPS-SECRETS.md for connection details)
ssh -i "$KEY" "$HOST"

# On VPS: Service management
sudo systemctl status ralph    # Check status
sudo systemctl restart ralph   # Restart service
sudo systemctl stop ralph      # Stop service
sudo journalctl -u ralph -f    # Stream logs
```

### Mode Switching

**From Web UI:**
The status banner shows the current mode. Mode can be toggled via the `/api/ralph` endpoint.

**From VPS:**
Restart the service with `--auto` or `--manual` flags by editing the systemd unit file.

### Visual Feedback

When running, Ralph logs:
- Startup banner and configuration
- Current mode and interval
- Real-time implementation progress
- Countdown timer between checks
- Success/failure notifications
