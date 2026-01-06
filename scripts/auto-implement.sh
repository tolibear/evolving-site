#!/bin/bash

# Evolving Site - Autonomous Implementation Script
# Runs hourly via launchd to implement top-voted suggestions

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/implement_$TIMESTAMP.log"
API_URL="https://evolving-site.vercel.app"

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

# Switch to manual mode via API
switch_to_manual() {
    log "Switching to manual mode due to failure..."
    curl -s -X POST "$API_URL/api/status" \
        -H "Content-Type: application/json" \
        -d '{"automationMode": "manual", "message": "Automation paused - manual review required"}' \
        > /dev/null 2>&1 || true
}

# Main execution
main() {
    log "=== Starting autonomous implementation ==="

    cd "$PROJECT_DIR"
    log "Working directory: $PROJECT_DIR"

    # Check if automation mode is enabled
    log "Checking automation mode..."
    STATUS=$(curl -s "$API_URL/api/status")
    MODE=$(echo "$STATUS" | node -e "
        const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
        console.log(data.automation_mode || 'manual');
    " 2>/dev/null || echo "manual")

    if [ "$MODE" != "automated" ]; then
        log "Automation mode is '$MODE', not 'automated'. Skipping."
        cleanup_logs
        exit 0
    fi

    # Pull latest changes
    log "Pulling latest from git..."
    if ! git pull --rebase origin master 2>&1 | tee -a "$LOG_FILE"; then
        log "Git pull failed!"
        switch_to_manual
        cleanup_logs
        exit 1
    fi

    # Check for pending suggestions via production API
    log "Checking for pending suggestions..."
    SUGGESTIONS=$(curl -s "$API_URL/api/suggestions")

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
        switch_to_manual
    fi

    cleanup_logs
    exit $EXIT_CODE
}

# Run main
main "$@"
