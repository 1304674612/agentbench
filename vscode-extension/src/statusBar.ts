import * as vscode from 'vscode'
import type { TestRunSummary } from './types'

/**
 * Status bar item provider.
 * Displays "AgentBench: checkmark X/Y" with color coding based on results.
 */

let statusBarItem: vscode.StatusBarItem | undefined

const STATUS_ICONS = {
  idle: '$(beaker)',
  running: '$(loading~spin)',
  passed: '$(pass-filled)',
  failed: '$(error)',
  mixed: '$(warning)',
}

const STATUS_COLORS = {
  idle: new vscode.ThemeColor('statusBar.foreground'),
  running: new vscode.ThemeColor('statusBarItem.warningForeground'),
  passed: new vscode.ThemeColor('testing.iconPassed'),
  failed: new vscode.ThemeColor('testing.iconFailed'),
  mixed: new vscode.ThemeColor('statusBarItem.warningForeground'),
}

type BarStatus = 'idle' | 'running' | 'passed' | 'failed' | 'mixed'

/**
 * Create the status bar item. Call once during extension activation.
 */
export function createStatusBar(): vscode.StatusBarItem {
  if (statusBarItem) {
    return statusBarItem
  }

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBarItem.name = 'AgentBench'
  statusBarItem.command = 'agentbench.showOutput'
  statusBarItem.tooltip = 'AgentBench test status'
  statusBarItem.text = `${STATUS_ICONS.idle} AgentBench`
  statusBarItem.backgroundColor = undefined
  statusBarItem.show()
  return statusBarItem
}

/**
 * Update the status bar with test results.
 */
export function updateStatusBar(summary?: TestRunSummary): void {
  if (!statusBarItem) {
    return
  }

  if (!summary) {
    setIdle()
    return
  }

  if (summary.total === 0) {
    setIdle()
    return
  }

  const status = getStatus(summary)
  const icon = STATUS_ICONS[status]
  const color = STATUS_COLORS[status]

  statusBarItem.text = `${icon} AgentBench: ${summary.passed}/${summary.total}`
  statusBarItem.color = color
  statusBarItem.tooltip = buildTooltip(summary)
  statusBarItem.backgroundColor =
    status === 'failed' ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined
}

/**
 * Set status bar to running state.
 */
export function setRunning(): void {
  if (!statusBarItem) {
    return
  }
  statusBarItem.text = `${STATUS_ICONS.running} AgentBench: Running...`
  statusBarItem.color = STATUS_COLORS.running
  statusBarItem.tooltip = 'Tests are running...'
  statusBarItem.backgroundColor = undefined
}

/**
 * Set status bar to idle state.
 */
export function setIdle(): void {
  if (!statusBarItem) {
    return
  }
  statusBarItem.text = `${STATUS_ICONS.idle} AgentBench`
  statusBarItem.color = STATUS_COLORS.idle
  statusBarItem.tooltip = 'Click to run tests'
  statusBarItem.command = 'agentbench.runAllTests'
  statusBarItem.backgroundColor = undefined
}

/**
 * Determine the overall test status.
 */
function getStatus(summary: TestRunSummary): BarStatus {
  if (summary.failed > 0 && summary.passed > 0) {
    return 'mixed'
  }
  if (summary.failed > 0 || summary.errored > 0) {
    return 'failed'
  }
  if (summary.passed > 0 && summary.total === summary.passed) {
    return 'passed'
  }
  return 'idle'
}

/**
 * Build a detailed tooltip from the summary.
 */
function buildTooltip(summary: TestRunSummary): string {
  const lines: string[] = ['AgentBench Test Results']
  lines.push('')
  if (summary.passed > 0) {
    lines.push(`Passed: ${summary.passed}`)
  }
  if (summary.failed > 0) {
    lines.push(`Failed: ${summary.failed}`)
  }
  if (summary.errored > 0) {
    lines.push(`Errors: ${summary.errored}`)
  }
  lines.push(`Total: ${summary.total}`)
  return lines.join('\n')
}

/**
 * Dispose of the status bar item.
 */
export function disposeStatusBar(): void {
  statusBarItem?.dispose()
  statusBarItem = undefined
}
