#!/usr/bin/env node

import { getRalphConfig, validateConfig } from './config'
import { RalphApiClient } from './api-client'
import { implementSuggestion, gitPull } from './implementation'
import { printBanner, printStatus, printHelp, log, clearLine, printCountdown } from './ui'
import { initializeStream, closeStream } from './stream-manager'

// Parse command line arguments
const args = process.argv.slice(2)
const forceMode: 'manual' | 'automated' | null = args.includes('--auto')
  ? 'automated'
  : args.includes('--manual')
    ? 'manual'
    : null

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sleepWithCountdown(ms: number, client?: RalphApiClient): Promise<boolean> {
  const startTime = Date.now()
  const endTime = startTime + ms

  // Update API with next check time
  if (client) {
    const nextCheckAt = new Date(endTime).toISOString()
    try {
      await client.updateStatus({ nextCheckAt })
    } catch {
      // Ignore errors when updating next check time
    }
  }

  // Check for interruption every second
  while (Date.now() < endTime) {
    if (!running) return false
    const remaining = endTime - Date.now()
    printCountdown(remaining)
    await sleep(1000)
  }
  clearLine()

  // Clear the next check time when countdown finishes
  if (client) {
    try {
      await client.updateStatus({ nextCheckAt: null })
    } catch {
      // Ignore errors
    }
  }

  return true
}

let running = true

async function main(): Promise<void> {
  printBanner()

  // Load and validate configuration
  const config = getRalphConfig()
  const errors = validateConfig(config)

  if (errors.length > 0) {
    errors.forEach((e) => log(e, 'error'))
    printHelp()
    process.exit(1)
  }

  const client = new RalphApiClient(config)

  // If force mode specified, update it
  if (forceMode) {
    log(`Setting mode to ${forceMode}...`, 'info')
    try {
      await client.setMode(forceMode)
      log(`Mode set to ${forceMode}`, 'success')
    } catch (err) {
      log(`Failed to set mode: ${err instanceof Error ? err.message : err}`, 'error')
    }
  }

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    log('\nShutting down Ralph...', 'warn')
    running = false
  })

  process.on('SIGTERM', () => {
    log('\nReceived SIGTERM, shutting down...', 'warn')
    running = false
  })

  log('Ralph is now running. Press Ctrl+C to stop.', 'success')

  while (running) {
    try {
      // Check current status from API
      const status = await client.getStatus()
      const intervalMinutes = status.interval_minutes || config.intervalMinutes

      printStatus(status.automation_mode, intervalMinutes)

      // Only process if in automated mode
      if (status.automation_mode !== 'automated') {
        log('Mode is MANUAL - waiting for mode change...', 'info')
        log('Switch to automated mode with: npm run ralph:auto', 'info')
        // Check every 30 seconds when in manual mode
        const shouldContinue = await sleepWithCountdown(30 * 1000, client)
        if (!shouldContinue) break
        continue
      }

      // Check if already working on something
      if (status.state === 'working') {
        log('Already working on a suggestion. Waiting...', 'warn')
        const shouldContinue = await sleepWithCountdown(30 * 1000, client)
        if (!shouldContinue) break
        continue
      }

      // Get top suggestion with votes > 0
      const suggestion = await client.getTopSuggestion()

      if (!suggestion) {
        log('No suggestions with votes > 0. Waiting...', 'info')
        const shouldContinue = await sleepWithCountdown(intervalMinutes * 60 * 1000, client)
        if (!shouldContinue) break
        continue
      }

      log(`Found suggestion #${suggestion.id} with ${suggestion.votes} votes`, 'success')

      // Initialize terminal streaming session BEFORE any implementation work
      // This ensures all output (git pull, implementation, etc.) is streamed
      const sessionId = await initializeStream(suggestion.id)
      if (sessionId) {
        log(`Terminal streaming started: ${sessionId.slice(0, 8)}...`, 'info')
      }

      // Git pull latest changes first
      try {
        await gitPull(config.projectDir)
      } catch (err) {
        log(`Git pull failed: ${err instanceof Error ? err.message : err}`, 'error')
        log('Switching to manual mode...', 'warn')
        await closeStream('failed')  // Close stream on failure
        await client.updateStatus({ automationMode: 'manual' })
        const shouldContinue = await sleepWithCountdown(60 * 1000, client)
        if (!shouldContinue) break
        continue
      }

      // Update status to working
      await client.updateStatus({
        state: 'working',
        message: `Implementing: ${suggestion.content.slice(0, 80)}...`,
        currentSuggestionId: suggestion.id,
      })

      // Implement the suggestion (stream will be closed inside implementSuggestion)
      const result = await implementSuggestion(suggestion, config.projectDir)

      // Finalize the result
      log('Finalizing...', 'info')
      try {
        await client.finalize({
          suggestionId: result.suggestionId,
          status: result.status === 'failed' ? 'denied' : result.status as 'implemented' | 'denied' | 'needs_input',
          content: suggestion.content,
          votes: suggestion.votes,
          aiNote: result.aiNote,
          commitHash: result.commitHash,
        })
        log('Finalization complete', 'success')
      } catch (err) {
        log(`Finalization failed: ${err instanceof Error ? err.message : err}`, 'error')
        // Reset status to idle even if finalization fails
        await client.updateStatus({
          state: 'idle',
          message: 'Awaiting next suggestion...',
          currentSuggestionId: null,
        })
      }

      if (result.success) {
        log(`Successfully implemented suggestion #${suggestion.id}!`, 'success')
      } else if (result.status === 'denied') {
        log(`Suggestion #${suggestion.id} was denied: ${result.aiNote}`, 'warn')
      } else {
        log(`Suggestion #${suggestion.id} failed: ${result.aiNote}`, 'error')
        // On failure, switch to manual mode
        log('Switching to manual mode due to failure...', 'warn')
        await client.updateStatus({ automationMode: 'manual' })
      }

      // Wait for next interval
      log(`Waiting ${intervalMinutes} minutes before next check...`, 'info')
      const shouldContinue = await sleepWithCountdown(intervalMinutes * 60 * 1000, client)
      if (!shouldContinue) break
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      log(`Error: ${msg}`, 'error')

      // On error, try to switch to manual mode
      try {
        await client.updateStatus({
          automationMode: 'manual',
          state: 'idle',
          message: 'Automation paused - error occurred',
        })
        log('Switched to manual mode due to error', 'warn')
      } catch {
        // Ignore errors when updating status
      }

      // Wait 1 minute before retrying
      const shouldContinue = await sleepWithCountdown(60 * 1000, client)
      if (!shouldContinue) break
    }
  }

  log('Ralph stopped.', 'info')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
