#!/bin/bash

# Ralph Wiggum - Chaotic Suggestion Generator Script
# Runs hourly to have Ralph explore the codebase and generate suggestions
# Uses /ralph-loop for iterative exploration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/ralph-suggest_$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_logs() {
    find "$LOG_DIR" -name "ralph-suggest_*.log" -mtime +7 -delete 2>/dev/null || true
}

main() {
    log "=== Ralph Wiggum Suggestion Generator Starting ==="
    cd "$PROJECT_DIR"

    # Load environment variables
    if [ -f "$PROJECT_DIR/.env.local" ]; then
        set -a
        source "$PROJECT_DIR/.env.local"
        set +a
    fi

    # Verify RALPH_API_SECRET is set
    if [ -z "$RALPH_API_SECRET" ]; then
        log "ERROR: RALPH_API_SECRET not set in .env.local"
        exit 1
    fi

    # Run Ralph loop with the suggestion prompt
    log "Starting Ralph suggestion loop..."

    PROMPT=$(cat "$SCRIPT_DIR/ralph-suggest-prompt.md")

    claude "/ralph-loop \"$PROMPT\" --completion-promise \"SUGGESTION SUBMITTED\" --max-iterations 5" \
        --allowedTools "Read,Glob,Grep,Bash(curl:*)" \
        2>&1 | tee -a "$LOG_FILE"

    EXIT_CODE=${PIPESTATUS[0]}

    if [ $EXIT_CODE -eq 0 ]; then
        log "=== Ralph suggestion completed successfully ==="
    else
        log "=== Ralph suggestion failed with exit code $EXIT_CODE ==="
    fi

    cleanup_logs
    exit $EXIT_CODE
}

main "$@"
