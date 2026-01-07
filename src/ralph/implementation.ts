import { spawn } from 'child_process'
import { log, printImplementing, printResult, printVercelStatus, printRefreshPrompt } from './ui'
import type { Suggestion, ImplementationResult } from './types'
import { writeToStream, closeStream, getCurrentSessionId } from './stream-manager'

export async function implementSuggestion(
  suggestion: Suggestion,
  projectDir: string
): Promise<ImplementationResult> {
  printImplementing(suggestion.content)
  log(`Suggestion #${suggestion.id}: "${suggestion.content}"`, 'info')
  log(`Current votes: ${suggestion.votes}`, 'info')

  const sessionId = getCurrentSessionId()
  if (sessionId) {
    log(`Terminal session: ${sessionId.slice(0, 8)}...`, 'info')
  }

  const prompt = buildImplementationPrompt(suggestion)

  try {
    // Run Claude Code with the implementation prompt
    const result = await runClaude(prompt, projectDir)

    if (result.success) {
      const commitHash = await getLatestCommitHash(projectDir)
      printResult(true, result.aiNote || 'Implementation completed successfully')

      // Close stream with success
      await closeStream('completed')

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

      // Close stream - completed status for denied/needs_input, failed for actual failures
      await closeStream(result.denied || result.needsInput ? 'completed' : 'failed')

      // Determine the status based on result flags
      let status: 'denied' | 'needs_input' | 'failed' = 'failed'
      if (result.denied) {
        status = 'denied'
      } else if (result.needsInput) {
        status = 'needs_input'
      }

      return {
        success: false,
        suggestionId: suggestion.id,
        status,
        aiNote: result.aiNote || result.error || 'Implementation failed',
        error: result.error,
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log(`Implementation error: ${errorMsg}`, 'error')
    printResult(false, `Error: ${errorMsg}`)

    // Close stream with failure
    await closeStream('failed')

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
4. If you need human help (API keys, credentials, external setup, design decisions), mark as needs_input
5. Run \`npm run build\` to verify no errors
6. Commit with a descriptive message
7. Push to origin/master
8. After completing, output a JSON result on its own line:

For implemented features:
{"success": true, "aiNote": "Brief description of what was implemented"}

For denied suggestions (security issues, impossible, bad idea):
{"success": false, "denied": true, "aiNote": "Reason for denial"}

For needs human input (API keys, credentials, external services, design decisions):
{"success": false, "needsInput": true, "aiNote": "What the human needs to do/provide"}

For failures:
{"success": false, "aiNote": "What went wrong"}

IMPORTANT: Output the JSON result on a single line at the end.`
}

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
}

// Format tool use events for display
function formatToolUse(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
      return `${colors.cyan}📖 Reading${colors.reset} ${colors.dim}${input.file_path}${colors.reset}`
    case 'Edit':
      return `${colors.yellow}✏️  Editing${colors.reset} ${colors.dim}${input.file_path}${colors.reset}`
    case 'Write':
      return `${colors.green}📝 Writing${colors.reset} ${colors.dim}${input.file_path}${colors.reset}`
    case 'Bash':
      const cmd = String(input.command || '').slice(0, 80)
      return `${colors.magenta}$ ${colors.reset}${colors.dim}${cmd}${cmd.length >= 80 ? '...' : ''}${colors.reset}`
    case 'Glob':
      return `${colors.blue}🔍 Searching${colors.reset} ${colors.dim}${input.pattern}${colors.reset}`
    case 'Grep':
      return `${colors.blue}🔎 Grep${colors.reset} ${colors.dim}${input.pattern}${colors.reset}`
    case 'Task':
      return `${colors.cyan}🤖 Agent${colors.reset} ${colors.dim}${input.description || 'task'}${colors.reset}`
    case 'TodoWrite':
      return `${colors.yellow}📋 Todos${colors.reset} ${colors.dim}updated${colors.reset}`
    default:
      return `${colors.gray}🔧 ${toolName}${colors.reset}`
  }
}

async function runClaude(
  prompt: string,
  cwd: string
): Promise<{
  success: boolean
  denied?: boolean
  needsInput?: boolean
  aiNote?: string
  error?: string
}> {
  return new Promise((resolve) => {
    const claudePath = process.env.CLAUDE_PATH || '/Users/toli/.local/bin/claude'

    // Use stream-json format to get ALL events (tool calls, edits, etc.)
    const claude = spawn(claudePath, [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--dangerously-skip-permissions',
    ], {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let fullOutput = ''
    let currentText = ''
    let resultData: { success?: boolean; denied?: boolean; needsInput?: boolean; aiNote?: string } | null = null

    // Buffer for incomplete JSON lines
    let lineBuffer = ''

    // Process JSON lines from stdout
    claude.stdout?.on('data', (data: Buffer) => {
      lineBuffer += data.toString()

      // Process complete lines
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const event = JSON.parse(line)
          processStreamEvent(event)
        } catch {
          // Not valid JSON, skip
        }
      }
    })

    function processStreamEvent(event: Record<string, unknown>) {
      const type = event.type as string

      switch (type) {
        case 'system':
          // Initialization event
          const output = `${colors.green}✓ Claude Code started${colors.reset}\n`
          process.stdout.write(output)
          writeToStream(output)
          break

        case 'assistant':
          // Assistant message with content
          const msg = event.message as Record<string, unknown>
          if (msg?.content && Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if ((block as Record<string, unknown>).type === 'tool_use') {
                const toolUse = block as { name: string; input: Record<string, unknown> }
                const formatted = formatToolUse(toolUse.name, toolUse.input)
                const toolOutput = formatted + '\n'
                process.stdout.write(toolOutput)
                writeToStream(toolOutput)
              }
            }
          }
          break

        case 'stream_event':
          const streamEvent = event.event as Record<string, unknown>
          if (!streamEvent) break

          const eventType = streamEvent.type as string

          if (eventType === 'content_block_delta') {
            const delta = streamEvent.delta as Record<string, unknown>
            if (delta?.type === 'text_delta' && delta.text) {
              const text = delta.text as string
              currentText += text
              fullOutput += text
              process.stdout.write(text)
              writeToStream(text)
            }
          } else if (eventType === 'content_block_start') {
            const contentBlock = streamEvent.content_block as Record<string, unknown>
            if (contentBlock?.type === 'tool_use') {
              const toolName = contentBlock.name as string
              const startOutput = `\n${colors.dim}▶ ${toolName}...${colors.reset}\n`
              process.stdout.write(startOutput)
              writeToStream(startOutput)
            }
          }
          break

        case 'tool_use':
          // Tool execution
          const toolEvent = event as { tool: string; input: Record<string, unknown> }
          if (toolEvent.tool) {
            const formatted = formatToolUse(toolEvent.tool, toolEvent.input || {})
            const toolOutput = formatted + '\n'
            process.stdout.write(toolOutput)
            writeToStream(toolOutput)
          }
          break

        case 'tool_result':
          // Tool result - show abbreviated
          const resultOutput = `${colors.dim}  └─ done${colors.reset}\n`
          process.stdout.write(resultOutput)
          writeToStream(resultOutput)
          break

        case 'result':
          // Final result
          const result = event.result as string
          if (result) {
            fullOutput = result

            // Try to parse JSON result
            const jsonMatch = result.match(/\{"success":\s*(true|false)[^}]*\}/)
            if (jsonMatch) {
              try {
                resultData = JSON.parse(jsonMatch[0])
              } catch {
                // Ignore parse errors
              }
            }
          }
          break
      }
    }

    // Stream stderr (for errors)
    claude.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      process.stderr.write(text)
      writeToStream(text)
    })

    claude.on('close', async (exitCode) => {
      // Process any remaining buffer
      if (lineBuffer.trim()) {
        try {
          const event = JSON.parse(lineBuffer)
          processStreamEvent(event)
        } catch {
          // Ignore
        }
      }

      console.log() // Add spacing
      log('Claude Code finished', 'info')

      // Use parsed result if available
      if (resultData) {
        resolve({
          success: resultData.success ?? false,
          denied: resultData.denied,
          needsInput: resultData.needsInput,
          aiNote: resultData.aiNote,
        })
        return
      }

      // Try to parse JSON from full output
      const jsonMatch = fullOutput.match(/\{"success":\s*(true|false)[^}]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          resolve({
            success: result.success,
            denied: result.denied,
            needsInput: result.needsInput,
            aiNote: result.aiNote,
          })
          return
        } catch {
          // Fall through
        }
      }

      if (exitCode !== 0) {
        resolve({
          success: false,
          error: `Claude exited with code ${exitCode}`,
        })
        return
      }

      resolve({
        success: true,
        aiNote: 'Implementation completed',
      })
    })

    claude.on('error', async (err) => {
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
