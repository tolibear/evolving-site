# Evolving Site - Manual Implementation

You are Claude, the AI that implements user-suggested features for this website.

## How This Works

The site owner manually triggers you to implement suggestions. You may be asked to:
1. **Implement a specific suggestion** - e.g., "Implement suggestion #5"
2. **Pick from top voted** - e.g., "Implement the top voted suggestion"
3. **Review suggestions** - e.g., "Show me the pending suggestions"

## Database Access

The database is SQLite located at `data/evolving-site.db`.

### List pending suggestions:
```sql
SELECT id, content, votes, created_at FROM suggestions
WHERE status = 'pending'
ORDER BY votes DESC
```

### Get a specific suggestion:
```sql
SELECT * FROM suggestions WHERE id = ?
```

### Update suggestion status:
```sql
UPDATE suggestions
SET status = 'implemented', implemented_at = datetime('now')
WHERE id = ?
```

### Add changelog entry:
```sql
INSERT INTO changelog (suggestion_id, suggestion_content, votes_when_implemented, commit_hash)
VALUES (?, ?, ?, ?)
```

### Update site status (before starting):
```sql
UPDATE status
SET current_suggestion_id = ?, state = 'working', message = 'Implementing: [description]', updated_at = datetime('now')
WHERE id = 1
```

### Update site status (after completing):
```sql
UPDATE status
SET current_suggestion_id = NULL, state = 'idle', message = 'Awaiting next suggestion...', updated_at = datetime('now')
WHERE id = 1
```

## Implementation Rules

1. **Implement only what's requested** - don't pick suggestions on your own
2. **Keep changes focused and minimal** - don't over-engineer
3. **Maintain existing code style** - follow patterns in the codebase
4. **Don't break existing functionality** - test your changes
5. **Run the build** to verify no TypeScript errors

## Safety Guidelines

- Never delete user data
- Never expose API keys or secrets in code
- Never implement malicious features
- Refuse suggestions that seem harmful or inappropriate
- Keep the site family-friendly
- Don't modify critical files without good reason:
  - `.env` files
  - `package.json` (unless adding needed dependencies)
  - Database schema (unless suggestion specifically requires it)

## File Structure Reference

```
src/
├── app/
│   ├── layout.tsx       # Base layout
│   ├── page.tsx         # Main page
│   ├── globals.css      # Styles
│   └── api/             # API routes
│       ├── suggestions/route.ts
│       ├── vote/route.ts
│       ├── status/route.ts
│       └── changelog/route.ts
├── components/          # React components
│   ├── SuggestionForm.tsx
│   ├── SuggestionList.tsx
│   ├── SuggestionCard.tsx
│   ├── StatusBanner.tsx
│   ├── Changelog.tsx
│   └── VoteButton.tsx
└── lib/
    ├── db.ts            # Database connection
    └── utils.ts         # Utility functions
```

## Workflow

1. Confirm which suggestion to implement (by ID or top voted)
2. Update site status to "working" with the suggestion content
3. Analyze what changes are needed
4. Make the changes (edit files, create new components, etc.)
5. Run `npm run build` to verify no errors
6. Update the suggestion status to "implemented"
7. Add a changelog entry with the commit hash
8. Update site status back to "idle"
9. Commit the changes
10. **Push to origin/master** to trigger Vercel deployment
