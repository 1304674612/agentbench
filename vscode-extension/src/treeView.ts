import * as vscode from 'vscode'
import type { TestRunSummary, HistoryEntry, TestCaseResult } from './types'

/**
 * Tree View providers for the AgentBench sidebar panel.
 *
 * Views:
 *   - Run: Quick actions to run all tests, a specific suite, or the current file
 *   - History: Recent test run history
 *   - Test Suites: Discovered test suites and cases in the workspace
 *   - Coverage: Coverage statistics
 *   - Snapshots: Snapshot management
 */

// ---- Shared Tree Item ----

interface AgentBenchTreeItem extends vscode.TreeItem {
  readonly contextValue: string
}

// ---- Run View ----

export class RunTreeDataProvider implements vscode.TreeDataProvider<AgentBenchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AgentBenchTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: AgentBenchTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): AgentBenchTreeItem[] {
    return [
      createActionItem(
        'Run All Tests',
        'agentbench.runAllTests',
        'runAll',
        '$(run-all)',
        'Execute all tests in the project'
      ),
      createActionItem(
        'Run Current Test',
        'agentbench.runCurrentTest',
        'runCurrent',
        '$(play)',
        'Run the test at the current cursor position'
      ),
      createActionItem(
        'Run Current Suite',
        'agentbench.runSuite',
        'runSuite',
        '$(library)',
        'Run all tests in the current suite'
      ),
      createActionItem(
        'Debug Current Test',
        'agentbench.debugTest',
        'debugTest',
        '$(debug-alt)',
        'Debug the test at the current cursor position'
      ),
      createActionItem(
        'Replay Last Run',
        'agentbench.replayLast',
        'replayLast',
        '$(history)',
        'Replay the most recent test run'
      ),
    ]
  }
}

// ---- History View ----

export class HistoryTreeDataProvider implements vscode.TreeDataProvider<AgentBenchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AgentBenchTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private history: HistoryEntry[] = []

  addEntry(entry: HistoryEntry): void {
    this.history.unshift(entry)
    // Keep only last 20 entries
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20)
    }
    this._onDidChangeTreeData.fire()
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: AgentBenchTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): AgentBenchTreeItem[] {
    if (this.history.length === 0) {
      const empty = new vscode.TreeItem('No test runs yet', vscode.TreeItemCollapsibleState.None)
      empty.description = 'Run tests to see history here'
      empty.iconPath = new vscode.ThemeIcon('info')
      empty.contextValue = 'historyEmpty'
      return [empty as AgentBenchTreeItem]
    }

    return this.history.map((entry) => {
      const icon = getStatusIcon(entry.summary)
      const item = new vscode.TreeItem(
        `Run ${new Date(entry.timestamp).toLocaleTimeString()}`,
        vscode.TreeItemCollapsibleState.None
      )
      item.description = `${entry.summary.passed}/${entry.summary.total} passed`
      item.iconPath = new vscode.ThemeIcon(icon)
      item.tooltip = `Passed: ${entry.summary.passed} | Failed: ${entry.summary.failed} | Errors: ${entry.summary.errored}`
      item.contextValue = 'historyEntry'
      item.command = {
        command: 'agentbench.replayLast',
        title: 'Replay',
        arguments: [entry.id],
      }
      return item as AgentBenchTreeItem
    })
  }
}

// ---- Test Suites View ----

interface SuiteInfo {
  name: string
  filePath: string
  tests: TestInfo[]
}

interface TestInfo {
  name: string
  line: number
}

export class SuitesTreeDataProvider implements vscode.TreeDataProvider<AgentBenchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AgentBenchTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private suites: SuiteInfo[] = []
  private lastResults: TestCaseResult[] = []

  setResults(results: TestCaseResult[]): void {
    this.lastResults = results
    this._onDidChangeTreeData.fire()
  }

  refresh(): void {
    this.discoverSuites()
    this._onDidChangeTreeData.fire()
  }

  private async discoverSuites(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      return
    }

    const files = await vscode.workspace.findFiles(
      '**/*.test.{ts,js,mjs,tsx,jsx}',
      '**/node_modules/**',
      100
    )

    const suites: SuiteInfo[] = []

    for (const file of files) {
      try {
        const document = await vscode.workspace.openTextDocument(file)
        const text = document.getText()
        const lines = text.split('\n')

        const tests: TestInfo[] = []

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]

          // Detect test('name', ...) or it('name', ...)
          const testMatch = line.match(/(?:test|it)\s*\(\s*['"`](.+?)['"`]\s*,/)
          if (testMatch) {
            tests.push({ name: testMatch[1], line: i })
            continue
          }

          // Detect export async function xxxTest()
          const funcMatch = line.match(
            /export\s+(?:async\s+)?function\s+(\w*(?:Test|Spec|Suite|Scenario)\w*)\s*\(/
          )
          if (funcMatch) {
            tests.push({ name: funcMatch[1], line: i })
            continue
          }
        }

        if (tests.length > 0) {
          const relativePath = vscode.workspace.asRelativePath(file)
          suites.push({
            name: relativePath,
            filePath: file.fsPath,
            tests,
          })
        }
      } catch {
        // Skip files that can't be opened
      }
    }

    this.suites = suites
  }

  getTreeItem(element: AgentBenchTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: AgentBenchTreeItem): AgentBenchTreeItem[] | Thenable<AgentBenchTreeItem[]> {
    if (!element) {
      // Root: list suites
      if (this.suites.length === 0) {
        this.discoverSuites()
        const loading = new vscode.TreeItem(
          'Discovering test suites...',
          vscode.TreeItemCollapsibleState.None
        )
        loading.iconPath = new vscode.ThemeIcon('loading~spin')
        loading.contextValue = 'loading'
        return [loading as AgentBenchTreeItem]
      }

      return this.suites.map((suite) => {
        const item = new vscode.TreeItem(suite.name, vscode.TreeItemCollapsibleState.Collapsed)
        item.iconPath = new vscode.ThemeIcon('file-code')
        item.contextValue = 'suite'
        item.tooltip = suite.filePath
        return item as AgentBenchTreeItem
      })
    }

    // Child: list tests in suite
    const suiteName = typeof element.label === 'string' ? element.label : ''
    const suite = this.suites.find((s) => s.name === suiteName)

    if (!suite) {
      return []
    }

    return suite.tests.map((test) => {
      const result = this.lastResults.find((r) => r.name === test.name)
      const statusIcon = result
        ? result.status === 'PASSED'
          ? '$(pass-filled)'
          : '$(error)'
        : '$(circle-outline)'

      const item = new vscode.TreeItem(test.name, vscode.TreeItemCollapsibleState.None)
      item.iconPath = new vscode.ThemeIcon(
        result ? (result.status === 'PASSED' ? 'pass-filled' : 'error') : 'circle-outline'
      )
      item.description = result
        ? `${result.status} (${result.duration}ms)`
        : `line ${test.line + 1}`
      item.contextValue = 'testCase'
      item.command = {
        command: 'agentbench.runCurrentTest',
        title: 'Run Test',
        arguments: [test.name],
      }
      item.tooltip = result
        ? `${result.name}: ${result.status} — ${result.assertions.passed}/${result.assertions.total} assertions passed`
        : `Run ${test.name}`
      return item as AgentBenchTreeItem
    })
  }
}

// ---- Coverage View ----

export class CoverageTreeDataProvider implements vscode.TreeDataProvider<AgentBenchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AgentBenchTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private coveragePercentage: number = 0
  private suitesCount: number = 0
  private testsCount: number = 0

  updateCoverage(coverage: number, suites: number, tests: number): void {
    this.coveragePercentage = coverage
    this.suitesCount = suites
    this.testsCount = tests
    this._onDidChangeTreeData.fire()
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: AgentBenchTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): AgentBenchTreeItem[] {
    const items: AgentBenchTreeItem[] = []

    // Coverage summary
    const summary = new vscode.TreeItem('Coverage', vscode.TreeItemCollapsibleState.None)
    summary.description =
      this.coveragePercentage > 0 ? `${this.coveragePercentage}%` : 'Not computed'
    summary.iconPath = new vscode.ThemeIcon(
      this.coveragePercentage >= 80
        ? 'check'
        : this.coveragePercentage >= 50
          ? 'warning'
          : 'circle-slash'
    )
    summary.contextValue = 'coverageSummary'
    items.push(summary as AgentBenchTreeItem)

    // Stats
    const stats = new vscode.TreeItem('Statistics', vscode.TreeItemCollapsibleState.None)
    stats.description = `${this.suitesCount} suites, ${this.testsCount} tests`
    stats.iconPath = new vscode.ThemeIcon('graph')
    stats.contextValue = 'coverageStats'
    items.push(stats as AgentBenchTreeItem)

    // Show coverage action
    const showAction = createActionItem(
      'Show Coverage Report',
      'agentbench.showCoverage',
      'showCoverage',
      '$(search)',
      'Open detailed coverage report'
    )
    items.push(showAction)

    return items
  }
}

// ---- Snapshots View ----

export class SnapshotsTreeDataProvider implements vscode.TreeDataProvider<AgentBenchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    AgentBenchTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private snapshots: string[] = []

  refresh(): void {
    this.discoverSnapshots()
    this._onDidChangeTreeData.fire()
  }

  private async discoverSnapshots(): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      return
    }

    const files = await vscode.workspace.findFiles('**/__snapshots__/**', '**/node_modules/**', 100)

    this.snapshots = files.map((f) => vscode.workspace.asRelativePath(f))
  }

  getTreeItem(element: AgentBenchTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): AgentBenchTreeItem[] {
    const items: AgentBenchTreeItem[] = []

    // Update snapshots action
    const updateAction = createActionItem(
      'Update All Snapshots',
      'agentbench.updateSnapshots',
      'updateSnapshots',
      '$(sync)',
      'Update all snapshots to current output'
    )
    items.push(updateAction)

    // Create snapshot action
    const createAction = createActionItem(
      'Create New Snapshot',
      'agentbench.createSnapshot',
      'createSnapshot',
      '$(camera)',
      'Capture a new snapshot'
    )
    items.push(createAction)

    // List snapshots
    if (this.snapshots.length === 0) {
      const empty = new vscode.TreeItem('No snapshots found', vscode.TreeItemCollapsibleState.None)
      empty.description = 'Create snapshots with agentbench snapshot create'
      empty.iconPath = new vscode.ThemeIcon('info')
      empty.contextValue = 'snapshotsEmpty'
      items.push(empty as AgentBenchTreeItem)
    } else {
      for (const snap of this.snapshots) {
        const item = new vscode.TreeItem(snap, vscode.TreeItemCollapsibleState.None)
        item.iconPath = new vscode.ThemeIcon('file-media')
        item.contextValue = 'snapshot'
        item.tooltip = snap
        items.push(item as AgentBenchTreeItem)
      }
    }

    return items
  }
}

// ---- Helpers ----

function createActionItem(
  label: string,
  command: string,
  contextValue: string,
  icon: string,
  tooltip: string
): AgentBenchTreeItem {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None)
  item.command = { command, title: label }
  item.iconPath = new vscode.ThemeIcon(
    (icon.replace('$(', '').replace(')', '') as vscode.ThemeIcon['id']) || 'circle-outline'
  )
  item.tooltip = tooltip
  item.contextValue = contextValue
  return item as AgentBenchTreeItem
}

function getStatusIcon(summary: TestRunSummary): string {
  if (summary.failed > 0 || summary.errored > 0) {
    return 'error'
  }
  if (summary.passed > 0 && summary.total > 0) {
    return 'pass-filled'
  }
  return 'circle-outline'
}
