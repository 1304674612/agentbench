/**
 * Coverage Engine
 *
 * Measures test coverage across four dimensions:
 * - Prompt coverage: how many prompt variable combinations have been tested
 * - Workflow coverage: how many execution paths have been explored
 * - Tool coverage: how many available tools have been called in tests
 * - Edge coverage: boundary conditions tested
 */

import type {
  CoverageReport,
  CoverageDimension,
  CoverageDetail,
  UncoveredPath,
  CoverageSuggestion,
  CoverageTrendPoint,
} from '../types/coverage'
import type { ExecutionTrace } from '../types/trace'

// ============================================================
// Types
// ============================================================

export interface CoverageInput {
  projectId: string
  /** All runs to analyze */
  runs: Array<{
    id: string
    config: Record<string, unknown>
    trace?: ExecutionTrace
    metrics?: Record<string, unknown>
  }>
  /** Available prompt variables */
  promptVariables?: Record<string, string[]>
  /** Available tools */
  availableTools?: string[]
  /** Edge cases defined */
  edgeCases?: EdgeCaseDefinition[]
  /** Historical coverage for trend analysis */
  previousReports?: CoverageReport[]
}

export interface EdgeCaseDefinition {
  name: string
  description: string
  /** How to test this edge case */
  testHint: string
}

// ============================================================
// Coverage Calculation
// ============================================================

/**
 * Calculate comprehensive coverage report from run data.
 */
export function calculateCoverage(input: CoverageInput): CoverageReport {
  const dimensions: CoverageDimension[] = []
  const uncoveredPaths: UncoveredPath[] = []
  const suggestions: CoverageSuggestion[] = []

  // 1. Prompt Coverage
  const promptDim = calculatePromptCoverage(
    input.runs,
    input.promptVariables ?? {},
  )
  dimensions.push(promptDim.dimension)
  uncoveredPaths.push(...promptDim.uncovered)
  suggestions.push(...promptDim.suggestions)

  // 2. Workflow Coverage
  const workflowDim = calculateWorkflowCoverage(input.runs)
  dimensions.push(workflowDim.dimension)
  uncoveredPaths.push(...workflowDim.uncovered)
  suggestions.push(...workflowDim.suggestions)

  // 3. Tool Coverage
  const toolDim = calculateToolCoverage(input.runs, input.availableTools ?? [])
  dimensions.push(toolDim.dimension)
  uncoveredPaths.push(...toolDim.uncovered)
  suggestions.push(...toolDim.suggestions)

  // 4. Edge Coverage
  const edgeDim = calculateEdgeCoverage(input.edgeCases ?? [])
  dimensions.push(edgeDim.dimension)
  uncoveredPaths.push(...edgeDim.uncovered)
  suggestions.push(...edgeDim.suggestions)

  // Overall percentage
  const overall =
    dimensions.length > 0
      ? Math.round(dimensions.reduce((s, d) => s + d.percentage, 0) / dimensions.length)
      : 0

  // Trend
  const trend: CoverageTrendPoint[] | undefined = input.previousReports
    ? input.previousReports.map((r) => ({
        date: r.timestamp,
        overall: r.overall,
        dimensions: Object.fromEntries(
          r.dimensions.map((d) => [d.name, d.percentage]),
        ),
      }))
    : undefined

  return {
    projectId: input.projectId,
    timestamp: new Date(),
    overall,
    dimensions,
    uncoveredPaths,
    suggestions,
    trend,
  }
}

// ============================================================
// Prompt Coverage
// ============================================================

function calculatePromptCoverage(
  runs: CoverageInput['runs'],
  variables: Record<string, string[]>,
): {
  dimension: CoverageDimension
  uncovered: UncoveredPath[]
  suggestions: CoverageSuggestion[]
} {
  const uncovered: UncoveredPath[] = []
  const suggestions: CoverageSuggestion[] = []
  const details: CoverageDetail[] = []

  if (Object.keys(variables).length === 0) {
    // Infer variables from runs
    const usedVars = new Map<string, Set<string>>()
    for (const run of runs) {
      const config = run.config
      const input = (config.input ?? {}) as Record<string, unknown>
      const runVars = (input.variables ?? {}) as Record<string, string>
      for (const [key, value] of Object.entries(runVars)) {
        if (!usedVars.has(key)) usedVars.set(key, new Set())
        usedVars.get(key)!.add(String(value))
      }
    }

    let covered = 0
    let total = 0

    for (const [varName, values] of usedVars) {
      total += values.size
      covered += values.size
      details.push({
        label: varName,
        covered: true,
        count: values.size,
      })
    }

    const percentage = total === 0 ? 100 : Math.round((covered / total) * 100)

    if (usedVars.size === 0) {
      uncovered.push({
        dimension: 'prompt',
        description: 'No prompt variables detected in test runs',
        severity: 'medium',
        suggestedTest: 'Define prompt variables and test with at least 2 values per variable',
      })
    }

    return {
      dimension: { name: 'prompt', percentage, covered, total, details },
      uncovered,
      suggestions,
    }
  }

  // Use defined variables
  let covered = 0
  let total = 0

  for (const [varName, values] of Object.entries(variables)) {
    const testedValues = new Set<string>()

    for (const run of runs) {
      const config = run.config
      const input = (config.input ?? {}) as Record<string, unknown>
      const runVars = (input.variables ?? {}) as Record<string, string>
      if (varName in runVars) {
        testedValues.add(String(runVars[varName]))
      }
    }

    const isCovered = testedValues.size >= values.length
    if (isCovered) covered++

    details.push({
      label: varName,
      covered: isCovered,
      count: testedValues.size,
    })

    for (const value of values) {
      if (!testedValues.has(value)) {
        uncovered.push({
          dimension: 'prompt',
          description: `Variable "${varName}" = "${value}" not tested`,
          severity: 'medium',
          suggestedTest: `Test with ${varName}=${value}`,
        })
      }
    }

    total++
  }

  const percentage = total === 0 ? 100 : Math.round((covered / total) * 100)

  if (percentage < 80) {
    suggestions.push({
      dimension: 'prompt',
      message: `Only ${percentage}% of prompt variable combinations covered. Add test cases for missing values.`,
    })
  }

  return {
    dimension: { name: 'prompt', percentage, covered, total, details },
    uncovered,
    suggestions,
  }
}

// ============================================================
// Workflow Coverage
// ============================================================

function calculateWorkflowCoverage(runs: CoverageInput['runs']): {
  dimension: CoverageDimension
  uncovered: UncoveredPath[]
  suggestions: CoverageSuggestion[]
} {
  const uncovered: UncoveredPath[] = []
  const suggestions: CoverageSuggestion[] = []

  // Extract unique paths from traces
  const paths = new Set<string>()
  const pathCounts = new Map<string, number>()

  for (const run of runs) {
    const trace = run.trace
    if (!trace?.steps) continue

    const path = trace.steps
      .map((s) => `${s.type}:${s.type === 'tool_call' ? s.toolName : s.type === 'llm_call' ? 'llm' : 'response'}`)
      .join(' → ')

    paths.add(path)
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1)
  }

  const uniquePaths = paths.size
  const totalRuns = runs.length

  // Coverage = unique paths / total runs (capped at 100%)
  const percentage = totalRuns === 0 ? 0 : Math.min(100, Math.round((uniquePaths / Math.max(1, totalRuns)) * 100))

  const details: CoverageDetail[] = Array.from(pathCounts.entries()).map(([path, count]) => ({
    label: path.length > 60 ? path.slice(0, 57) + '...' : path,
    covered: true,
    count,
  }))

  if (uniquePaths <= 1 && totalRuns > 0) {
    uncovered.push({
      dimension: 'workflow',
      description: 'Only one execution path observed across all runs',
      severity: 'high',
      suggestedTest: 'Add test cases that trigger different workflows (error handling, edge cases, alternative tools)',
    })
    suggestions.push({
      dimension: 'workflow',
      message: 'All runs follow the same execution path. Introduce variations to test alternative workflows.',
    })
  }

  return {
    dimension: { name: 'workflow', percentage, covered: uniquePaths, total: totalRuns, details },
    uncovered,
    suggestions,
  }
}

// ============================================================
// Tool Coverage
// ============================================================

function calculateToolCoverage(
  runs: CoverageInput['runs'],
  availableTools: string[],
): {
  dimension: CoverageDimension
  uncovered: UncoveredPath[]
  suggestions: CoverageSuggestion[]
} {
  const uncovered: UncoveredPath[] = []
  const suggestions: CoverageSuggestion[] = []

  // Track which tools were called
  const calledTools = new Set<string>()
  const toolCallCounts = new Map<string, number>()

  for (const run of runs) {
    const trace = run.trace
    if (!trace?.steps) continue

    for (const step of trace.steps) {
      if (step.type === 'tool_call' && step.toolName) {
        calledTools.add(step.toolName)
        toolCallCounts.set(step.toolName, (toolCallCounts.get(step.toolName) ?? 0) + 1)
      }
    }
  }

  // If no explicit tools provided, just report what was found
  if (availableTools.length === 0) {
    const percentage = calledTools.size > 0 ? 100 : 0
    const details: CoverageDetail[] = Array.from(toolCallCounts.entries()).map(([tool, count]) => ({
      label: tool,
      covered: true,
      count,
    }))

    return {
      dimension: { name: 'tool', percentage, covered: calledTools.size, total: calledTools.size || 1, details },
      uncovered,
      suggestions,
    }
  }

  // Check against available tools
  const details: CoverageDetail[] = []
  let covered = 0

  for (const tool of availableTools) {
    const isCovered = calledTools.has(tool)
    if (isCovered) covered++
    details.push({
      label: tool,
      covered: isCovered,
      count: toolCallCounts.get(tool),
    })

    if (!isCovered) {
      uncovered.push({
        dimension: 'tool',
        description: `Tool "${tool}" has never been called in any test`,
        severity: 'high',
        suggestedTest: `Create a test case that triggers the "${tool}" tool`,
      })
    }
  }

  const percentage = Math.round((covered / availableTools.length) * 100)

  if (percentage < 60) {
    suggestions.push({
      dimension: 'tool',
      message: `${availableTools.length - covered} of ${availableTools.length} tools are untested. Add test cases covering unused tools.`,
    })
  }

  return {
    dimension: {
      name: 'tool',
      percentage,
      covered,
      total: availableTools.length,
      details,
    },
    uncovered,
    suggestions,
  }
}

// ============================================================
// Edge Coverage
// ============================================================

function calculateEdgeCoverage(edgeCases: EdgeCaseDefinition[]): {
  dimension: CoverageDimension
  uncovered: UncoveredPath[]
  suggestions: CoverageSuggestion[]
} {
  const uncovered: UncoveredPath[] = []
  const details: CoverageDetail[] = []

  if (edgeCases.length === 0) {
    // Default edge cases to suggest
    const defaults: EdgeCaseDefinition[] = [
      { name: 'empty_input', description: 'Empty user input', testHint: 'Test with empty string or null input' },
      { name: 'max_length', description: 'Very long input', testHint: 'Test with input exceeding token limits' },
      { name: 'unicode', description: 'Unicode/special characters', testHint: 'Test with emoji, CJK, RTL text' },
      { name: 'timeout', description: 'Timeout behavior', testHint: 'Set low timeout to test graceful handling' },
      { name: 'error_tool', description: 'Tool returns error', testHint: 'Mock a tool to return an error' },
      { name: 'no_tools', description: 'No tools available', testHint: 'Run agent without any tools configured' },
    ]

    for (const ec of defaults) {
      uncovered.push({
        dimension: 'edge',
        description: `Edge case "${ec.name}": ${ec.description}`,
        severity: 'medium',
        suggestedTest: ec.testHint,
      })
      details.push({ label: ec.name, covered: false })
    }

    return {
      dimension: {
        name: 'edge',
        percentage: 0,
        covered: 0,
        total: defaults.length,
        details,
      },
      uncovered,
      suggestions: [{
        dimension: 'edge',
        message: 'No edge cases have been tested. Define and test at least 5 edge cases for robust coverage.',
      }],
    }
  }

  for (const ec of edgeCases) {
    details.push({ label: ec.name, covered: false })
    uncovered.push({
      dimension: 'edge',
      description: `Edge case "${ec.name}": ${ec.description}`,
      severity: 'medium',
      suggestedTest: ec.testHint,
    })
  }

  return {
    dimension: {
      name: 'edge',
      percentage: 0,
      covered: 0,
      total: edgeCases.length,
      details,
    },
    uncovered,
    suggestions: [{
      dimension: 'edge',
      message: `${edgeCases.length} edge case(s) defined but not yet verified. Run tests targeting each case.`,
    }],
  }
}

// ============================================================
// Coverage Trend
// ============================================================

/**
 * Compute coverage trend from historical reports.
 */
export function computeCoverageTrend(
  reports: CoverageReport[],
): { trend: 'improving' | 'declining' | 'stable'; change: number } {
  if (reports.length < 2) {
    return { trend: 'stable', change: 0 }
  }

  const sorted = [...reports].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  )
  const first = sorted[0].overall
  const last = sorted[sorted.length - 1].overall
  const change = last - first

  if (change > 3) return { trend: 'improving', change }
  if (change < -3) return { trend: 'declining', change }
  return { trend: 'stable', change }
}

/**
 * Generate improvement suggestions based on current coverage gaps.
 */
export function generateCoverageSuggestions(report: CoverageReport): string[] {
  const tips: string[] = []

  for (const dim of report.dimensions) {
    if (dim.percentage < 50) {
      tips.push(`⚠️ ${dim.name} coverage is at ${dim.percentage}% — prioritize adding tests in this area`)
    } else if (dim.percentage < 80) {
      tips.push(`📈 ${dim.name} coverage at ${dim.percentage}% — good, but consider adding more edge cases`)
    }
  }

  if (report.uncoveredPaths.length > 5) {
    tips.push(`🔍 ${report.uncoveredPaths.length} uncovered paths — start with high-severity items first`)
  }

  if (tips.length === 0) {
    tips.push('✅ Coverage is strong across all dimensions. Keep it up!')
  }

  return tips
}
