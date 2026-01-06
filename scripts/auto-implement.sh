#!/bin/bash

# Evolving Site - Autonomous Implementation Script
# Runs hourly via launchd to implement top-voted suggestions

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/implement_$TIMESTAMP.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Cleanup old logs (keep last 7 days)
cleanup_logs() {
    find "$LOG_DIR" -name "implement_*.log" -mtime +7 -delete 2>/dev/null || true
}

# Main execution
main() {
    log "=== Starting autonomous implementation ==="

    cd "$PROJECT_DIR"
    log "Working directory: $PROJECT_DIR"

    # Pull latest changes
    log "Pulling latest from git..."
    git pull --rebase origin master 2>&1 | tee -a "$LOG_FILE"

    # Check for pending suggestions via production API
    log "Checking for pending suggestions..."
    SUGGESTIONS=$(curl -s "https://evolving-site.vercel.app/api/suggestions")

    # Check if there are any suggestions with votes > 0
    HAS_VOTABLE=$(echo "$SUGGESTIONS" | node -e "
        const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        const top = Array.isArray(data) ? data.find(s => s.votes > 0) : null;
        if (top) {
            console.log(JSON.stringify(top));
        } else {
            console.log('none');
        }
    ")

    if [ "$HAS_VOTABLE" = "none" ] || [ -z "$HAS_VOTABLE" ]; then
        log "No suggestions with votes > 0. Skipping this run."
        cleanup_logs
        exit 0
    fi

    log "Found suggestion to implement: $HAS_VOTABLE"

    # Run Claude Code with the implementation prompt
    log "Running Claude Code..."

    # Use --print to show output, -p for prompt from file
    claude -p "$(cat "$SCRIPT_DIR/implement-prompt.md")" \
        --allowedTools "Bash(npm run build:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Read,Write,Edit,Glob,Grep" \
        2>&1 | tee -a "$LOG_FILE"

    EXIT_CODE=${PIPESTATUS[0]}

    if [ $EXIT_CODE -eq 0 ]; then
        log "=== Implementation completed successfully ==="
    else
        log "=== Implementation failed with exit code $EXIT_CODE ==="
    fi

    cleanup_logs
    exit $EXIT_CODE
}

# Run main
main "$@"
