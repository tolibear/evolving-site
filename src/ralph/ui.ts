// Terminal UI utilities for Ralph

import { writeToStream } from './stream-manager'

// ANSI color codes for cross-platform terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

export function printBanner(): void {
  const banner = `
${colors.cyan}${colors.bright}
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗            ║
  ║   ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║            ║
  ║   ██████╔╝███████║██║     ██████╔╝███████║            ║
  ║   ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║            ║
  ║   ██║  ██║██║  ██║███████╗██║     ██║  ██║            ║
  ║   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝            ║
  ║                                                       ║
  ║        Evolving Site Implementation Agent             ║
  ╚═══════════════════════════════════════════════════════╝
${colors.reset}`
  console.log(banner)
  writeToStream(banner + '\n')
}

export function log(
  msg: string,
  level: 'info' | 'success' | 'warn' | 'error' = 'info'
): void {
  const timestamp = new Date().toISOString().slice(11, 19)
  const prefixes = {
    info: `${colors.dim}[${timestamp}]${colors.reset}`,
    success: `${colors.green}[${timestamp}] ✓${colors.reset}`,
    warn: `${colors.yellow}[${timestamp}] ⚠${colors.reset}`,
    error: `${colors.red}[${timestamp}] ✗${colors.reset}`,
  }
  const line = `${prefixes[level]} ${msg}`
  console.log(line)
  writeToStream(line + '\n')
}

export function printStatus(
  mode: string,
  interval: number,
  nextRun?: Date
): void {
  const modeColor = mode === 'automated' ? colors.green : colors.yellow
  const lines = [
    `\n${colors.bright}Status:${colors.reset}`,
    `  Mode: ${modeColor}${mode.toUpperCase()}${colors.reset}`,
    `  Interval: ${interval} minutes`,
  ]
  if (nextRun) {
    lines.push(`  Next check: ${nextRun.toLocaleTimeString()}`)
  }
  lines.push('')
  const output = lines.join('\n')
  console.log(output)
  writeToStream(output + '\n')
}

export function printHelp(): void {
  console.log(`
${colors.bright}Commands:${colors.reset}
  npm run ralph           Start Ralph (respects current mode)
  npm run ralph:auto      Start in automated mode
  npm run ralph:manual    Start in manual mode (monitoring)

${colors.bright}Environment Variables:${colors.reset}
  RALPH_INTERVAL_MINUTES  Check interval in minutes (default: 10)
  RALPH_API_SECRET        API secret for authentication
  RALPH_API_URL           Production API URL (optional)

${colors.bright}Controls:${colors.reset}
  Ctrl+C                  Stop Ralph gracefully
`)
}

export function clearLine(): void {
  process.stdout.write('\r\x1b[K')
}

export function printCountdown(remaining: number): void {
  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  process.stdout.write(`\r  ${colors.dim}Next check in: ${mins}m ${secs}s${colors.reset}   `)
}

export function printImplementing(content: string): void {
  const truncated = content.length > 60 ? content.slice(0, 57) + '...' : content
  const output = `\n${colors.bright}${colors.blue}═══ IMPLEMENTING ═══${colors.reset}\n${colors.cyan}${truncated}${colors.reset}\n`
  console.log(output)
  writeToStream(output + '\n')
}

export function printResult(success: boolean, aiNote: string): void {
  let output: string
  if (success) {
    output = `\n${colors.green}${colors.bright}═══ SUCCESS ═══${colors.reset}\n${colors.dim}${aiNote}${colors.reset}\n`
  } else {
    output = `\n${colors.yellow}${colors.bright}═══ COMPLETED ═══${colors.reset}\n${colors.dim}${aiNote}${colors.reset}\n`
  }
  console.log(output)
  writeToStream(output + '\n')
}

export function printVercelStatus(state: string, url: string): void {
  const stateColors: Record<string, string> = {
    BUILDING: colors.yellow,
    READY: colors.green,
    ERROR: colors.red,
    CANCELED: colors.red,
  }
  const color = stateColors[state] || colors.dim

  let output: string
  if (state === 'BUILDING') {
    output = `\r${colors.cyan}▶ Vercel:${colors.reset} ${color}Building...${colors.reset}   `
    process.stdout.write(output)
    writeToStream(output)
  } else if (state === 'READY') {
    output = `\r${colors.cyan}▶ Vercel:${colors.reset} ${color}Deployed!${colors.reset}     \n  ${colors.dim}${url}${colors.reset}`
    console.log(output)
    writeToStream(output + '\n')
  } else {
    output = `\r${colors.cyan}▶ Vercel:${colors.reset} ${color}${state}${colors.reset}`
    console.log(output)
    writeToStream(output + '\n')
  }
}

export function printRefreshPrompt(): void {
  const output = `
${colors.bright}${colors.green}╔═══════════════════════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.green}║                                                       ║${colors.reset}
${colors.bright}${colors.green}║   🎉  FEATURE DEPLOYED!  Refresh the site to see it  ║${colors.reset}
${colors.bright}${colors.green}║                                                       ║${colors.reset}
${colors.bright}${colors.green}║   https://evolving-site.vercel.app                   ║${colors.reset}
${colors.bright}${colors.green}║                                                       ║${colors.reset}
${colors.bright}${colors.green}╚═══════════════════════════════════════════════════════╝${colors.reset}
`
  console.log(output)
  writeToStream(output + '\n')
}
