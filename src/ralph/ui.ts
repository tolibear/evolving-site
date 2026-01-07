// Terminal UI utilities for Ralph

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
  console.log(`
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
${colors.reset}`)
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
  console.log(`${prefixes[level]} ${msg}`)
}

export function printStatus(
  mode: string,
  interval: number,
  nextRun?: Date
): void {
  const modeColor = mode === 'automated' ? colors.green : colors.yellow
  console.log(`\n${colors.bright}Status:${colors.reset}`)
  console.log(`  Mode: ${modeColor}${mode.toUpperCase()}${colors.reset}`)
  console.log(`  Interval: ${interval} minutes`)
  if (nextRun) {
    console.log(`  Next check: ${nextRun.toLocaleTimeString()}`)
  }
  console.log()
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
  console.log(`\n${colors.bright}${colors.blue}═══ IMPLEMENTING ═══${colors.reset}`)
  console.log(`${colors.cyan}${truncated}${colors.reset}\n`)
}

export function printResult(success: boolean, aiNote: string): void {
  if (success) {
    console.log(`\n${colors.green}${colors.bright}═══ SUCCESS ═══${colors.reset}`)
  } else {
    console.log(`\n${colors.yellow}${colors.bright}═══ COMPLETED ═══${colors.reset}`)
  }
  console.log(`${colors.dim}${aiNote}${colors.reset}\n`)
}
