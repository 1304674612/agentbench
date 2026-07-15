/**
 * Report Generator
 *
 * Generates evaluation reports in multiple formats:
 * - JSON: machine-readable, full data
 * - Markdown: human-readable, portable
 * - HTML: styled, standalone page
 * - JUnit XML: CI/CD integration
 */

import type { RunResult } from '../types/run'

export type ReportFormat = 'json' | 'markdown' | 'html' | 'junit'

export interface ReportOptions {
  /** Include full trace steps */
  includeTrace?: boolean
  /** Include raw config */
  includeConfig?: boolean
  /** Pretty-print JSON */
  pretty?: boolean
}

export interface Report {
  format: ReportFormat
  content: string
  filename: string
  mimeType: string
  generatedAt: Date
}

/**
 * Generate a report for a single run.
 */
export function generateReport(
  run: RunResult,
  format: ReportFormat,
  options?: ReportOptions
): Report {
  switch (format) {
    case 'json':
      return generateJSONReport(run, options)
    case 'markdown':
      return generateMarkdownReport(run, options)
    case 'html':
      return generateHTMLReport(run, options)
    case 'junit':
      return generateJUnitReport(run, options)
  }
}

/**
 * Generate a batch report for multiple runs.
 */
export function generateBatchReport(
  runs: RunResult[],
  format: ReportFormat,
  title?: string
): Report {
  switch (format) {
    case 'json':
      return {
        format: 'json',
        content: JSON.stringify(
          {
            title: title ?? 'Batch Report',
            generatedAt: new Date().toISOString(),
            totalRuns: runs.length,
            passed: runs.filter((r) => r.status === 'passed').length,
            failed: runs.filter((r) => r.status === 'failed').length,
            runs: runs.map((r) => summarizeRun(r)),
          },
          null,
          2
        ),
        filename: 'batch-report.json',
        mimeType: 'application/json',
        generatedAt: new Date(),
      }
    case 'markdown': {
      const lines: string[] = [
        `# ${title ?? 'Batch Report'}`,
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        `| Status | Count |`,
        `|--------|-------|`,
        `| ✅ Passed | ${runs.filter((r) => r.status === 'passed').length} |`,
        `| ❌ Failed | ${runs.filter((r) => r.status === 'failed').length} |`,
        '',
        '---',
        '',
      ]
      for (const run of runs) {
        lines.push(`### ${run.config?.name ?? 'Run'}`)
        lines.push(`- **Status**: ${run.status}`)
        lines.push(`- **Duration**: ${run.duration ?? 'N/A'}ms`)
        lines.push(`- **Tokens**: ${run.metrics.totalTokens}`)
        lines.push(`- **Cost**: $${run.metrics.totalCost.toFixed(4)}`)
        lines.push('')
      }
      return {
        format: 'markdown',
        content: lines.join('\n'),
        filename: 'batch-report.md',
        mimeType: 'text/markdown',
        generatedAt: new Date(),
      }
    }
    case 'junit': {
      const suites = runs.map((run) => generateJUnitTestSuite(run))
      return {
        format: 'junit',
        content: `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="${title ?? 'AgentBench'}" tests="${runs.length}">\n${suites.join('\n')}\n</testsuites>`,
        filename: 'batch-report.xml',
        mimeType: 'application/xml',
        generatedAt: new Date(),
      }
    }
    default:
      return generateJSONReport(runs[0])
  }
}

// ============================================================
// Format-specific generators
// ============================================================

function generateJSONReport(run: RunResult, options?: ReportOptions): Report {
  const data: Record<string, unknown> = {
    id: run.id,
    name: 'Run Report',
    status: run.status,
    duration: run.duration,
    metrics: run.metrics,
    scores: run.scores ?? [],
    assertionResults: run.assertionResults ?? [],
    summary: run.summary,
    generatedAt: new Date().toISOString(),
  }

  if (options?.includeTrace) {
    data.trace = run.trace
  }
  if (options?.includeConfig) {
    data.config = run.config
  }

  return {
    format: 'json',
    content: JSON.stringify(data, null, options?.pretty !== false ? 2 : 0),
    filename: `report-${run.id.slice(0, 8)}.json`,
    mimeType: 'application/json',
    generatedAt: new Date(),
  }
}

function generateMarkdownReport(run: RunResult, _options?: ReportOptions): Report {
  const scores = run.scores ?? []
  const assertions = run.assertionResults ?? []

  const lines = [
    `# ${run.config?.name ?? 'Run Report'}`,
    '',
    `**Status**: ${run.status} &nbsp;|&nbsp; **Duration**: ${run.duration ?? 'N/A'}ms`,
    '',
    '---',
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Tokens | ${run.metrics.totalTokens} |`,
    `| Prompt Tokens | ${run.metrics.promptTokens} |`,
    `| Completion Tokens | ${run.metrics.completionTokens} |`,
    `| Total Cost | $${run.metrics.totalCost.toFixed(4)} |`,
    `| Latency | ${run.metrics.totalLatency}ms |`,
    `| Steps | ${run.metrics.stepCount} |`,
    `| LLM Calls | ${run.metrics.llmCallCount} |`,
    `| Tool Calls | ${run.metrics.toolCallCount} |`,
    '',
  ]

  if (scores.length > 0) {
    lines.push('## Scores', '')
    lines.push('| Dimension | Score |')
    lines.push('|-----------|-------|')
    for (const s of scores) {
      lines.push(`| ${s.evaluator} | ${s.score.toFixed(1)}/${s.maxScore} |`)
    }
    lines.push('')
  }

  if (assertions.length > 0) {
    const passed = assertions.filter((a) => a.status === 'passed').length
    const failed = assertions.filter((a) => a.status === 'failed').length
    lines.push('## Assertions', '')
    lines.push(`✅ ${passed} passed &nbsp; ❌ ${failed} failed`, '')
    for (const a of assertions) {
      const icon = a.status === 'passed' ? '✅' : a.status === 'failed' ? '❌' : '⚠️'
      lines.push(`- ${icon} **${a.type}**: ${a.message ?? a.status}`)
    }
    lines.push('')
  }

  if (run.summary) {
    lines.push('## Summary', '', run.summary, '')
  }

  lines.push('---', '', `*Generated by AgentBench v0.5.0 at ${new Date().toISOString()}*`)

  return {
    format: 'markdown',
    content: lines.join('\n'),
    filename: `report-${run.id.slice(0, 8)}.md`,
    mimeType: 'text/markdown',
    generatedAt: new Date(),
  }
}

function generateHTMLReport(run: RunResult, _options?: ReportOptions): Report {
  const scores = run.scores ?? []
  const assertions = run.assertionResults ?? []
  const scoreRows = scores
    .map((s) => `<tr><td>${s.evaluator}</td><td>${s.score.toFixed(1)}/${s.maxScore}</td></tr>`)
    .join('')
  const assertionRows = assertions
    .map(
      (a) =>
        `<tr class="${a.status}"><td>${a.type}</td><td>${a.status.toUpperCase()}</td><td>${a.message ?? ''}</td></tr>`
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${run.config?.name ?? 'Run Report'} — AgentBench</title>
<style>
  body { font-family: system-ui,sans-serif; max-width:800px; margin:2rem auto; padding:0 1rem; background:#0a0a0a; color:#e5e5e5 }
  h1 { border-bottom:1px solid #27272a; padding-bottom:.5rem }
  table { width:100%; border-collapse:collapse; margin:1rem 0 }
  th,td { padding:.5rem .75rem; text-align:left; border-bottom:1px solid #27272a }
  th { background:#18181b; font-size:.75rem; text-transform:uppercase; color:#a1a1aa }
  .passed { color:#34d399 } .failed { color:#f87171 }
  .card { background:#18181b; border-radius:.75rem; padding:1rem; margin:1rem 0 }
  .metric { display:inline-block; width:23%; text-align:center }
  .metric-value { font-size:1.5rem; font-weight:700 }
  .metric-label { font-size:.75rem; color:#a1a1aa }
</style>
</head>
<body>
<h1>${run.config?.name ?? 'Run Report'}</h1>
<p>Status: <strong class="${run.status === 'passed' ? 'passed' : 'failed'}">${run.status.toUpperCase()}</strong> · Duration: ${run.duration ?? 'N/A'}ms</p>
<div class="card">
  <div class="metric"><div class="metric-value">${run.metrics.totalTokens}</div><div class="metric-label">Tokens</div></div>
  <div class="metric"><div class="metric-value">$${run.metrics.totalCost.toFixed(4)}</div><div class="metric-label">Cost</div></div>
  <div class="metric"><div class="metric-value">${run.metrics.totalLatency}ms</div><div class="metric-label">Latency</div></div>
  <div class="metric"><div class="metric-value">${run.metrics.stepCount}</div><div class="metric-label">Steps</div></div>
</div>
${scores.length ? `<h2>Scores</h2><table><tr><th>Dimension</th><th>Score</th></tr>${scoreRows}</table>` : ''}
${assertions.length ? `<h2>Assertions</h2><table><tr><th>Type</th><th>Status</th><th>Message</th></tr>${assertionRows}</table>` : ''}
<footer style="margin-top:2rem;font-size:.75rem;color:#a1a1aa">Generated by AgentBench v0.5.0</footer>
</body>
</html>`

  return {
    format: 'html',
    content: html,
    filename: `report-${run.id.slice(0, 8)}.html`,
    mimeType: 'text/html',
    generatedAt: new Date(),
  }
}

function generateJUnitReport(run: RunResult, _options?: ReportOptions): Report {
  const suite = generateJUnitTestSuite(run)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${suite}`
  return {
    format: 'junit',
    content: xml,
    filename: `report-${run.id.slice(0, 8)}.xml`,
    mimeType: 'application/xml',
    generatedAt: new Date(),
  }
}

function generateJUnitTestSuite(run: RunResult): string {
  const assertions = run.assertionResults ?? []
  const duration = run.duration ?? 0
  const tests = assertions.length || 1
  const failures = assertions.filter((a) => a.status === 'failed').length
  const errored = assertions.filter((a) => a.status === 'error').length

  let cases = ''
  if (assertions.length === 0) {
    cases = `<testcase name="run.${run.status}" time="${(duration / 1000).toFixed(3)}">${run.status !== 'passed' ? `\n      <failure message="Run ${run.status}"/>\n    ` : ''}</testcase>`
  } else {
    for (const a of assertions) {
      cases += `\n    <testcase name="${a.type}" time="${((a.duration ?? 0) / 1000).toFixed(3)}">`
      if (a.status === 'failed') {
        cases += `\n      <failure message="${a.message ?? 'Assertion failed'}"/>`
      } else if (a.status === 'error') {
        cases += `\n      <error message="${a.message ?? 'Error evaluating assertion'}"/>`
      }
      cases += '\n    </testcase>'
    }
  }

  return `<testsuite name="${run.config?.name ?? 'AgentBench Run'}" tests="${tests}" failures="${failures}" errors="${errored}" time="${(duration / 1000).toFixed(3)}">${cases}\n</testsuite>`
}

// ============================================================
// Helpers
// ============================================================

function summarizeRun(run: RunResult): Record<string, unknown> {
  return {
    id: run.id,
    name: run.config?.name,
    status: run.status,
    duration: run.duration,
    metrics: {
      totalTokens: run.metrics.totalTokens,
      totalCost: run.metrics.totalCost,
      totalLatency: run.metrics.totalLatency,
    },
    scores: (run.scores ?? []).map((s) => ({
      evaluator: s.evaluator,
      score: s.score,
    })),
  }
}
