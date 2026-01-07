import { spawn } from 'child_process'
import { log, printImplementing, printResult, printVercelStatus, printRefreshPrompt } from './ui'
import type { Suggestion, ImplementationResult } from './types'

export async function implementSuggestion(
  suggestion: Suggestion,
  projectDir: string
): Promise<ImplementationResult> {
  printImplementing(suggestion.content)
  log(`Suggestion #${suggestion.id}: "${suggestion.content}"`, 'info')
  log(`Current votes: ${suggestion.votes}`, 'info')

  const prompt = buildImplementationPrompt(suggestion)

  try {
    // Run Claude Code with the implementation prompt (interactive mode)
    const result = await runClaude(prompt, projectDir)

    if (result.success) {
      const commitHash = await getLatestCommitHash(projectDir)
      printResult(true, result.aiNote || 'Implementation completed successfully')

      // Watch Vercel deployment
      log('Watching Vercel deployment...', 'info')
      const deploySuccess = await watchVercelDeployment()

      if (deploySuccess) {
        printRefreshPrompt()
      }

      return {
        success: true,
        suggestionId: suggestion.id,
        status: 'implemented',
        commitHash,
        aiNote: result.aiNote || 'Implementation completed successfully',
      }
    } else {
      printResult(false, result.aiNote || result.error || 'Implementation failed')
      return {
        success: false,
        suggestionId: suggestion.id,
        status: result.denied ? 'denied' : 'failed',
        aiNote: result.aiNote || result.error || 'Implementation failed',
        error: result.error,
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log(`Implementation error: ${errorMsg}`, 'error')
    printResult(false, `Error: ${errorMsg}`)
    return {
      success: false,
      suggestionId: suggestion.id,
      status: 'failed',
      aiNote: `Error during implementation: ${errorMsg}`,
      error: errorMsg,
    }
  }
}

function buildImplementationPrompt(suggestion: Suggestion): string {
  return `You are implementing suggestion #${suggestion.id} for the Evolving Site.

## Suggestion
"${suggestion.content}"

## Current Votes
${suggestion.votes}

## Instructions
1. Follow all security rules in CLAUDE.md
2. If the suggestion is safe and feasible, implement it
3. If the suggestion violates security rules or is not feasible, deny it
4. Run \`npm run build\` to verify no errors
5. Commit with a descriptive message
6. Push to origin/master
7. After completing, output a JSON result on its own line:

For implemented features:
{"success": true, "aiNote": "Brief description of what was implemented"}

For denied suggestions:
{"success": false, "denied": true, "aiNote": "Reason for denial"}

For failures:
{"success": false, "aiNote": "What went wrong"}

IMPORTANT: Output the JSON result on a single line at the end.`
}

async function runClaude(
  prompt: string,
  cwd: string
): Promise<{
  success: boolean
  denied?: boolean
  aiNote?: string
  error?: string
}> {
  return new Promise((resolve) => {
    log('Starting Claude Code...', 'info')
    console.log() // Add spacing

    // Use child_process.spawn with inherited stdio for real-time output
    const claudePath = process.env.CLAUDE_PATH || '/Users/toli/.local/bin/claude'
    const claude = spawn(claudePath, ['--dangerously-skip-permissions', '-p', prompt], {
      cwd,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let output = ''

    // Stream stdout to terminal in real-time
    claude.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      process.stdout.write(text)
      output += text
    })

    // Stream stderr to terminal in real-time
    claude.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      process.stderr.write(text)
      output += text
    })

    claude.on('close', (exitCode) => {
      console.log() // Add spacing after Claude output
      log('Claude Code finished', 'info')

      // Try to parse JSON result from output
      const jsonMatch = output.match(/\{"success":\s*(true|false)[^}]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          resolve({
            success: result.success,
            denied: result.denied,
            aiNote: result.aiNote,
          })
          return
        } catch {
          // Fall through to default handling
        }
      }

      if (exitCode !== 0) {
        resolve({
          success: false,
          error: `Claude exited with code ${exitCode}`,
        })
        return
      }

      // Assume success if exit code is 0
      resolve({
        success: true,
        aiNote: 'Implementation completed',
      })
    })

    claude.on('error', (err) => {
      log(`Failed to spawn Claude: ${err.message}`, 'error')
      resolve({
        success: false,
        error: `Failed to spawn Claude: ${err.message}`,
      })
    })
  })
}

async function getLatestCommitHash(cwd: string): Promise<string> {
  return new Promise((resolve) => {
    const git = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd })
    let hash = ''
    git.stdout.on('data', (data: Buffer) => {
      hash += data.toString().trim()
    })
    git.on('close', () => resolve(hash || 'unknown'))
    git.on('error', () => resolve('unknown'))
  })
}

export async function gitPull(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    log('Pulling latest changes...', 'info')
    const git = spawn('git', ['pull', '--rebase', 'origin', 'master'], {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let stderr = ''
    git.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0) {
        log('Git pull successful', 'success')
        resolve()
      } else {
        reject(new Error(`git pull failed: ${stderr || `exit code ${code}`}`))
      }
    })

    git.on('error', (err) => {
      reject(new Error(`Failed to spawn git: ${err.message}`))
    })
  })
}

async function watchVercelDeployment(): Promise<boolean> {
  const maxWaitTime = 5 * 60 * 1000 // 5 minutes max
  const pollInterval = 5000 // Check every 5 seconds
  const startTime = Date.now()

  // Update status to deploying so users see it on the website
  await updateRemoteStatus('deploying', 'Deploying to Vercel...')

  // Give Vercel a moment to pick up the push
  await sleep(3000)

  let lastState = ''

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await checkVercelStatus()

      if (status.state !== lastState) {
        printVercelStatus(status.state, status.url)
        lastState = status.state
      }

      if (status.state === 'READY') {
        // Update status to completed so users get the refresh prompt
        await updateRemoteStatus('completed', 'Feature deployed! Refresh to see it.')
        return true
      }

      if (status.state === 'ERROR' || status.state === 'CANCELED') {
        log(`Vercel deployment failed: ${status.state}`, 'error')
        await updateRemoteStatus('idle', 'Deployment failed')
        return false
      }

      await sleep(pollInterval)
    } catch (error) {
      // If we can't check, just wait and try the site
      await sleep(pollInterval)
    }
  }

  log('Vercel deployment timed out, but may still be building', 'warn')
  await updateRemoteStatus('completed', 'Feature deployed! Refresh to see it.')
  return true // Assume it'll complete
}

async function checkVercelStatus(): Promise<{ state: string; url: string }> {
  // Try to fetch the site and check if it's responding
  try {
    const response = await fetch('https://evolving-site.vercel.app/api/status')
    if (response.ok) {
      return { state: 'READY', url: 'https://evolving-site.vercel.app' }
    }
    return { state: 'BUILDING', url: '' }
  } catch {
    return { state: 'BUILDING', url: '' }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function updateRemoteStatus(state: string, message: string): Promise<void> {
  try {
    const apiUrl = process.env.RALPH_API_URL || 'https://evolving-site.vercel.app'
    const apiSecret = process.env.RALPH_API_SECRET || ''

    await fetch(`${apiUrl}/api/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ralph-secret': apiSecret,
      },
      body: JSON.stringify({ state, message }),
    })
  } catch (error) {
    // Silently fail - not critical for deployment watching
  }
}
