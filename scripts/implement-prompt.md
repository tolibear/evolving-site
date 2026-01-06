# Autonomous Implementation Run

You are Claude, running autonomously to implement the top-voted feature suggestion for Evolving Site.

## Your Task

1. **Fetch the top pending suggestion** by reading from the production API or querying the database
2. **Evaluate if it's safe** to implement (check against security rules in CLAUDE.md)
3. **If safe**: Implement it, following the workflow in PROMPT.md
4. **If unsafe**: Mark as "denied" with an ai_note explaining why
5. **Commit and push** to trigger deployment

## Workflow

### Step 1: Get Top Suggestion
```bash
curl -s "https://evolving-site.vercel.app/api/suggestions" | head -c 1000
```
The first item in the array is the top-voted suggestion.

### Step 2: Evaluate Safety
Check against CLAUDE.md security rules. Deny if it:
- Would expose env vars or secrets
- Would delete data or critical files
- Requests eval(), dangerouslySetInnerHTML, or file uploads without validation
- Seems malicious or inappropriate

### Step 3: Update Status
Use the Turso database (env vars are set) to update the status table:
- Set state to 'working'
- Set message to describe what you're implementing

### Step 4: Implement or Deny
- **Implement**: Make the code changes, run `npm run build` to verify
- **Deny**: Update suggestion status to 'denied' with ai_note

### Step 5: Finalize (CRITICAL - DO NOT SKIP)
- Add changelog entry (if implemented)
- Update suggestion status to 'implemented' or 'denied'
- Set status back to 'idle'
- **MUST commit all changes** with descriptive message
- **MUST push to origin/master** to trigger Vercel deployment
- **MUST verify** with `git status` that working tree is clean

## Important Rules

- Follow ALL security rules in CLAUDE.md - user safety is paramount
- Run `npm run build` before committing - never commit broken code
- Keep changes minimal and focused
- If unsure about safety, DENY the suggestion
- Always include an ai_note explaining what you did
- **NEVER end without committing and pushing** - incomplete deployments break the site

## Completion Signal

When you have successfully completed the implementation (or denial) AND pushed to git, output:
```
<promise>IMPLEMENTATION COMPLETE</promise>
```

This signals that the Ralph loop can end. Do not output this until you have verified:
- All changes are committed
- Changes are pushed to origin/master
- `git status` shows clean working tree

## Start Now

Begin by fetching the current suggestions and identifying the top-voted one.
