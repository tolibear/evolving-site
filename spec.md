# headless-claude-subscription

> Run Claude Code 24/7 on your VPS using your subscription — not the API.

## Overview

A template repository that enables running Claude Code autonomously on a VPS, using your Claude subscription credits instead of API costs. This provides approximately 5-10x more usage for the same spend.

## Core Value Proposition

Three pillars, all equally important:

1. **Cost Arbitrage** — Claude subscription ($20/mo) provides dramatically more usage than equivalent API spend ($200-500+/mo for similar volume)
2. **Autonomous Loop** — Claude Code works continuously without human intervention between triggers
3. **Remote Execution** — Claude Code runs on infrastructure you control, headlessly

## Target Users

- **Indie hackers** — Solo devs wanting cheap autonomous coding for side projects
- **Power users/tinkerers** — People who enjoy setting up infrastructure and customizing
- **Startups/small teams** — Teams wanting CI/CD-like Claude integration

## Technical Architectures

### Package Shape
**Template repository** — Fork it, customize, deploy. Maximum flexibility, minimum abstraction.

### Core Components

```
headless-claude-code/
├── README.md              # Everything: quickstart, config, examples, FAQ
├── setup.sh               # Detects Claude Code, guides installation, configures systemd
├── runner.sh              # Core loop: waits for trigger, runs Claude Code, handles result
├── triggers/              # Example trigger implementations
│   ├── webhook.sh         # HTTP endpoint trigger
│   ├── cron.sh            # Time-based trigger
│   └── database.sh        # Poll database for work items
└── examples/              # Reference implementations
    └── evolving-site/     # Link to Ralph/Evolving Site as full example
```

### Permissions Model
**CLAUDE.md driven** — Same as local Claude Code usage. Users define guardrails in their project's CLAUDE.md file. No additional sandboxing or restrictions imposed by the runner.

### Monitoring
**CLI only** — Logs via journalctl/stdout. No web UI overhead. Keep it simple.

## Setup Flow

**Target: < 30 minutes from discovery to running**

1. **Fork the repo**
2. **Run setup script on VPS**
   - Detects if Claude Code is installed
   - If not, guides user through installation
   - Prompts for one-time authentication (the tricky part)
   - Configures systemd service
3. **Customize CLAUDE.md** for your project
4. **Choose/configure trigger** (webhook, cron, or database polling)
5. **Start the service**

### Authentication
The auth flow requires a one-time interactive step:
- Setup script initiates Claude Code auth
- User receives auth link, completes in browser
- Auth code passed back to VPS
- Session persists until manually revoked

## VPS Provider Support

Explicitly documented:
- **AWS EC2** — Proven, what Ralph runs on
- **Hostinger** — Has a [Claude Code VPS template](https://www.hostinger.com/support/11970152-how-to-use-the-claude-code-vps-template/) (easiest path)

Generic Linux instructions work for any provider.

## Trigger Patterns

### 1. Webhook Trigger
External system POSTs to an endpoint on the VPS to initiate work.
```
POST /trigger
{ "task": "Fix issue #123", "repo": "/path/to/repo" }
```

### 2. Cron Trigger
Time-based execution on a schedule.
```
# Run every hour to check for work
0 * * * * /opt/headless-claude/runner.sh --check-queue
```

### 3. Database Polling
Check a table for pending work items on an interval.
```
SELECT * FROM tasks WHERE status = 'pending' ORDER BY priority LIMIT 1
```

## Use Case Examples

1. **GitHub Issue Triage Bot** — Automatically investigate and fix issues
2. **PR Reviewer** — Review PRs and suggest improvements
3. **Webhook Responder** — React to external events (Stripe webhooks, form submissions)
4. **Staging Deployer** — Deploy to staging, run Claude Code, validate before prod
5. **Feature Suggestion Implementer** — (Evolving Site/Ralph) Users vote, Claude implements

## Failure Handling

### Philosophy
**Git is the safety net.** If Claude makes a mistake, revert. Don't over-engineer recovery.

### Quota Exhaustion
Fail gracefully — detect quota errors, log them, pause until reset. No alerts or complex monitoring in MVP.

### Mid-Task Failures
Log the error, leave task in "in_progress" state for manual review.

## Terms of Service Compliance

### Position
Mentioned but not emphasized. Document responsibility.

### Implementation
- Default examples use **human-triggered** workflows (webhook, manual cron)
- Clear disclaimer: users are responsible for TOS compliance
- Note that fully automated systems may violate TOS; human-in-the-loop is recommended

### Disclaimer Text
```
This tool enables running Claude Code on remote infrastructure. Users are
responsible for ensuring their usage complies with Anthropic's Terms of Service.
We recommend human-in-the-loop triggers rather than fully automated systems.
```

## Abuse Prevention

**Nothing built in.** This is a neutral tool. Users decide how to use it responsibly. The CLAUDE.md guardrails and git history provide accountability.

## Launch Plan

### Timeline
**This week** — MVP focus, polish later based on feedback.

### Deliverables

1. **GitHub Repository**
   - Name: `headless-claude-code`
   - License: MIT
   - Everything in README (no separate docs folder)

2. **Demo Video**
   - Full setup walkthrough
   - SSH into VPS → run setup → watch it work
   - Show a task being completed autonomously

3. **Tweet Thread**
   - Hook: Cost comparison
     > "I run Claude Code 24/7 for $20/mo instead of $500+ in API costs"
   - Show the demo video
   - Explain the architecture briefly
   - Link to repo
   - Include use case examples

### Reference Example
Evolving Site (this repo) serves as a full working example. Link to it from the headless-claude-code README.

## Success Metrics

Primary: **GitHub stars**

Secondary:
- People actually running it and sharing setups
- Forks/derivatives for specific use cases

## Risk Mitigation

### Primary Risk: Too Complex to Set Up
This is the failure mode to avoid. Mitigation:
- Sub-30-minute setup target
- Setup script does the heavy lifting
- Clear, comprehensive README
- Hostinger template as "easiest path" option
- Demo video shows exactly what to expect

### Secondary Risk: Anthropic Reaction
Mitigation:
- Document user responsibility for TOS compliance
- Default to human-in-the-loop examples
- Position as "Claude Code on your infrastructure" not "automated Claude army"

### Tertiary Risk: Abuse Potential
Mitigation:
- It's a tool, like any other. Can't prevent all misuse.
- CLAUDE.md guardrails encourage responsible use
- Community norms will develop

## What's NOT in MVP

- Web UI / dashboard
- Built-in rate limiting
- Sandboxed execution
- Multi-user support
- Notification/alerting system
- Automatic rollback

These can be added later based on community feedback and PRs.

## README Structure

Single comprehensive README with:

1. **Hero** — One-liner pitch, badge for stars
2. **What This Does** — 2-3 sentences
3. **Why** — Cost comparison, autonomy benefits
4. **Prerequisites** — VPS, Claude subscription
5. **Quick Start** — 5-step setup
6. **Configuration** — Environment variables, CLAUDE.md guidance
7. **Trigger Patterns** — The 3 examples with code
8. **Use Cases** — Brief descriptions of 5 examples
9. **How It Works** — Architecture diagram/explanation
10. **FAQ** — Auth issues, quota, TOS, troubleshooting
11. **Examples** — Links to Evolving Site and community examples
12. **Contributing** — How to add trigger patterns, improvements
13. **License** — MIT
14. **Disclaimer** — TOS responsibility

## Next Steps

1. [ ] Create new repo `headless-claude-code`
2. [ ] Extract and genericize runner from Ralph
3. [ ] Write setup.sh with Claude Code detection
4. [ ] Create trigger examples (webhook, cron, database)
5. [ ] Write comprehensive README
6. [ ] Record demo video
7. [ ] Write tweet thread
8. [ ] Ship it
