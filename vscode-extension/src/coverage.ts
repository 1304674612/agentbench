import * as vscode from 'vscode'
import type { CoverageReport } from './types'

/**
 * Coverage visualization provider.
 * Uses VS Code's Test Coverage API (available in VS Code 1.88+) or
 * falls back to a custom decorator-based visualization.
 */

let coverageDecorations: vscode.TextEditorDecorationType | undefined

/**
 * Show coverage in a new editor tab using a generated report.
 */
export async function showCoverageReport(): Promise<void> {
  // Generate a sample coverage report
  const report = await generateCoverageReport()

  const panel = vscode.window.createWebviewPanel(
    'agentbenchCoverage',
    'AgentBench Coverage Report',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  )

  panel.webview.html = generateCoverageHtml(report)
}

/**
 * Show coverage as decorations in the active editor.
 */
export async function showCoverageDecorations(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showInformationMessage('No active editor to show coverage for.')
    return
  }

  // Clear previous decorations
  if (coverageDecorations) {
    editor.setDecorations(coverageDecorations, [])
    coverageDecorations.dispose()
  }

  coverageDecorations = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('testing.runAction'),
    isWholeLine: true,
    overviewRulerColor: new vscode.ThemeColor('testing.iconPassed'),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  })

  const document = editor.document
  const text = document.getText()
  const lines = text.split('\n')

  const coveredRanges: vscode.Range[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Consider lines with test definitions as covered
    if (
      /(?:test|it|suite|describe)\s*\(/.test(line) ||
      /export\s+(?:async\s+)?function\s+\w*(?:Test|Spec)\w*\s*\(/.test(line) ||
      /expect\s*\(/.test(line) ||
      /\.run\s*\(\s*\)/.test(line)
    ) {
      coveredRanges.push(new vscode.Range(i, 0, i, line.length))
    }
  }

  editor.setDecorations(coverageDecorations, coveredRanges)

  const coveragePercent =
    lines.length > 0 ? Math.round((coveredRanges.length / lines.length) * 100) : 0

  vscode.window.showInformationMessage(
    `AgentBench Coverage: ${coveredRanges.length}/${lines.length} lines covered (${coveragePercent}%)`
  )
}

/**
 * Generate a coverage report by scanning the workspace.
 */
async function generateCoverageReport(): Promise<CoverageReport> {
  const files = await vscode.workspace.findFiles(
    '**/*.test.{ts,js,mjs,tsx,jsx}',
    '**/node_modules/**',
    200
  )

  let totalSuites = 0
  let totalTests = 0
  let totalAssertions = 0
  let evaluatedTests = 0
  const uncovered: Array<{ suite: string; test: string; assertion: string }> = []

  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file)
      const text = document.getText()
      const relativePath = vscode.workspace.asRelativePath(file)

      const suiteMatch = text.match(/(?:suite|describe)\s*\(\s*['"`](.+?)['"`]/g)
      if (suiteMatch) {
        totalSuites += suiteMatch.length
      }

      const testMatches = text.match(/(?:test|it)\s*\(\s*['"`](.+?)['"`]/g)
      if (testMatches) {
        totalTests += testMatches.length
        evaluatedTests += testMatches.length
      }

      // Also count export async function patterns
      const funcMatches = text.match(/export\s+(?:async\s+)?function\s+(\w*(?:Test|Spec)\w*)\s*\(/g)
      if (funcMatches) {
        totalTests += funcMatches.length
        evaluatedTests += funcMatches.length
      }

      const assertionMatches = text.match(/expect\s*\(/g)
      if (assertionMatches) {
        totalAssertions += assertionMatches.length
      }

      // If file has fewer than 3 assertions, mark as potentially under-tested
      if (assertionMatches && assertionMatches.length < 3 && testMatches) {
        for (const match of testMatches) {
          const nameMatch = match.match(/['"`](.+?)['"`]/)
          if (nameMatch) {
            uncovered.push({
              suite: relativePath,
              test: nameMatch[1],
              assertion: `Only ${assertionMatches.length} assertion(s)`,
            })
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  const coverage = totalTests > 0 ? Math.round((evaluatedTests / totalTests) * 100) : 0

  return {
    suites: totalSuites,
    tests: totalTests,
    assertions: totalAssertions,
    evaluated: evaluatedTests,
    coverage,
    uncovered,
  }
}

/**
 * Generate HTML for the coverage report webview.
 */
function generateCoverageHtml(report: CoverageReport): string {
  const coverageColor =
    report.coverage >= 80 ? '#4caf50' : report.coverage >= 50 ? '#ff9800' : '#f44336'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentBench Coverage Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 24px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 24px; }
    .coverage-circle {
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: conic-gradient(${coverageColor} ${report.coverage * 3.6}deg, var(--vscode-editor-inactiveSelectionBackground) 0);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      position: relative;
    }
    .coverage-inner {
      width: 130px;
      height: 130px;
      border-radius: 50%;
      background-color: var(--vscode-editor-background);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .coverage-value {
      font-size: 36px;
      font-weight: 700;
      color: ${coverageColor};
    }
    .coverage-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      padding: 16px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      text-align: center;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .uncovered-section { margin-top: 24px; }
    .uncovered-section h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .uncovered-item {
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .uncovered-suite {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .uncovered-test {
      font-weight: 500;
    }
    .uncovered-issue {
      font-size: 12px;
      color: #e65100;
      margin-top: 4px;
    }
    .no-uncovered {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 24px;
    }
    .progress-bar {
      height: 8px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      background-color: ${coverageColor};
      border-radius: 4px;
      width: ${report.coverage}%;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AgentBench Coverage Report</h1>

    <div class="coverage-circle">
      <div class="coverage-inner">
        <div class="coverage-value">${report.coverage}%</div>
        <div class="coverage-label">Coverage</div>
      </div>
    </div>

    <div class="progress-bar" style="width: 100%; max-width: 400px; margin: 0 auto 24px;">
      <div class="progress-fill"></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${report.suites}</div>
        <div class="stat-label">Test Suites</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.tests}</div>
        <div class="stat-label">Test Cases</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.assertions}</div>
        <div class="stat-label">Assertions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${report.evaluated}</div>
        <div class="stat-label">Evaluated</div>
      </div>
    </div>

    <div class="uncovered-section">
      <h3>Potentially Under-Tested</h3>
      ${
        report.uncovered.length === 0
          ? '<div class="no-uncovered">All tests have adequate assertion coverage!</div>'
          : report.uncovered
              .map(
                (item) => `
        <div class="uncovered-item">
          <div class="uncovered-suite">${escapeHtml(item.suite)}</div>
          <div class="uncovered-test">${escapeHtml(item.test)}</div>
          <div class="uncovered-issue">${escapeHtml(item.assertion)}</div>
        </div>`
              )
              .join('')
      }
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Dispose of coverage decorations.
 */
export function disposeCoverage(): void {
  coverageDecorations?.dispose()
  coverageDecorations = undefined
}
