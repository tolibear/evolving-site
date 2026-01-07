# Evolving Site

A self-evolving website where users submit feature suggestions, vote on them, and an AI agent (Ralph) implements the winners autonomously.

**Live site**: https://evolving-site.vercel.app

## How It Works

1. Users submit feature suggestions on the website
2. Users vote on suggestions they want implemented
3. Ralph (the AI agent) monitors for top-voted suggestions
4. When a suggestion has enough votes, Ralph implements it using Claude Code
5. Changes are automatically deployed to production

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   AWS VPS       │     │   Turso         │
│   (Website)     │◄───►│   (Ralph)       │◄───►│   (Database)    │
│   Next.js       │     │   Claude Code   │     │   libSQL        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       │
        │                       │
        └───────────────────────┘
              git push triggers
              Vercel deployment
```

- **Website**: Next.js 14 app deployed on Vercel
- **Ralph Agent**: Runs 24/7 on AWS VPS as a systemd service
- **Database**: Turso (libSQL) for suggestions, votes, and changelog

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Turso credentials

# Start development server
npm run dev
```

### Running Ralph Locally

```bash
npm run ralph           # Start Ralph (uses current mode from database)
npm run ralph:auto      # Start in automated mode
npm run ralph:manual    # Start in manual mode (monitoring only)
```

## VPS Deployment

Ralph runs on an AWS VPS for 24/7 autonomous operation.

### Deploy Changes

```bash
./deploy-ralph.sh    # Push to git and restart Ralph on VPS
```

### Monitor Logs

```bash
./ralph-logs.sh      # Stream live logs from VPS
```

### Manual VPS Access

See `~/Ralph/VPS-SECRETS.md` for connection details (not tracked in git).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run ralph` | Run Ralph locally |
| `npm run finalize` | Update database after implementation |
| `./deploy-ralph.sh` | Deploy to VPS |
| `./ralph-logs.sh` | Stream VPS logs |

## Environment Variables

### Required

```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
RALPH_API_SECRET=...
```

### Optional

```bash
RALPH_INTERVAL_MINUTES=10    # Check interval (default: 10)
RALPH_API_URL=https://...    # Override API URL
```

## Security

- Rate limiting on all user-facing endpoints
- Vote deduplication by IP+UserAgent hash
- Parameterized database queries
- Input sanitization on all user content

See `CLAUDE.md` for full security guidelines.

## License

MIT
