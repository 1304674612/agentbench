import chalk from 'chalk'

// ── Duration ─────────────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

// ── Status Badges ────────────────────────────────────────────────────────────

export function statusBadge(status: string): string {
  const s = status.toUpperCase()
  switch (s) {
    case 'PASSED':
      return chalk.green('PASSED')
    case 'FAILED':
      return chalk.red('FAILED')
    case 'ERROR':
      return chalk.yellow('ERROR')
    case 'RUNNING':
      return chalk.blue('RUNNING')
    case 'COMPLETED':
      return chalk.green('COMPLETED')
    case 'PENDING':
      return chalk.gray('PENDING')
    default:
      return chalk.gray(s)
  }
}

export function statusIcon(status: string): string {
  const s = status.toUpperCase()
  switch (s) {
    case 'PASSED':
      return chalk.green('✓')
    case 'FAILED':
      return chalk.red('✗')
    case 'ERROR':
      return chalk.yellow('⚠')
    default:
      return chalk.gray('?')
  }
}

// ── Score Colorization ───────────────────────────────────────────────────────

export function colorScore(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0
  if (ratio >= 0.7) return chalk.green(`${score}/${max}`)
  if (ratio >= 0.4) return chalk.yellow(`${score}/${max}`)
  return chalk.red(`${score}/${max}`)
}

// ── Table Helpers ────────────────────────────────────────────────────────────

export function separator(char = '─', length = 60): string {
  return chalk.bold(char.repeat(length))
}

export function tableRow(cells: string[], widths?: number[]): string {
  return cells
    .map((c, i) => (widths ? c.padEnd(widths[i]) : c))
    .join(' | ')
}

export function section(title: string, width = 60): string {
  return `${separator('─', width)}\n${chalk.bold(title)}\n${separator('─', width)}`
}

// ── Summary Lines ────────────────────────────────────────────────────────────

export function summaryLine(label: string, value: string): string {
  return chalk.gray(`  ${label}: ${value}`)
}

export function infoLine(icon: string, message: string): string {
  return `${icon} ${chalk.gray(message)}`
}

// ── JSON Output Helper ───────────────────────────────────────────────────────

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n')
}
