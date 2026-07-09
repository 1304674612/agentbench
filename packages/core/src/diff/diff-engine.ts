/**
 * Diff Engine
 *
 * Computes differences between two runs across three dimensions:
 * - Text diff: prompt and output changes
 * - Metric diff: token, cost, latency changes
 * - Trace diff: execution path differences
 */

import type { RunResult, RunMetrics, Score } from '../types/run'
import type { ExecutionTrace, TraceStep } from '../types/trace'

// ============================================================
// Types
// ============================================================

export interface RunDiff {
  /** Run IDs being compared */
  runAId: string
  runBId: string
  /** Status comparison */
  statusDiff: StatusDiff
  /** Text diffs (prompt, output) */
  textDiffs: TextDiff[]
  /** Metric diffs */
  metricDiffs: MetricDiff[]
  /** Trace/execution path diffs */
  traceDiff: TraceDiff
  /** Score diffs */
  scoreDiffs: ScoreDiff[]
  /** Summary of the comparison */
  summary: string
}

export interface StatusDiff {
  statusA: string
  statusB: string
  same: boolean
}

export interface TextDiff {
  type: 'system_prompt' | 'user_prompt' | 'output'
  contentA: string
  contentB: string
  /** Computed hunks of changes */
  hunks: DiffHunk[]
  /** Whether the texts are identical */
  identical: boolean
  /** Similarity ratio (0-1) */
  similarity: number
}

export interface DiffHunk {
  type: 'unchanged' | 'added' | 'removed' | 'modified'
  lineA?: number
  lineB?: number
  contentA: string
  contentB: string
}

export interface MetricDiff {
  metric: string
  valueA: number
  valueB: number
  change: number
  changePercent: number
  direction: 'increase' | 'decrease' | 'unchanged'
  /** Human-readable label */
  label: string
}

export interface TraceDiff {
  /** Total step count difference */
  stepCountDiff: {
    countA: number
    countB: number
    difference: number
  }
  /** Steps only in run A */
  onlyInA: TraceStepSummary[]
  /** Steps only in run B */
  onlyInB: TraceStepSummary[]
  /** Steps in both but with differences */
  modified: TraceStepDiff[]
  /** Steps that are identical in both */
  identical: number
  /** Overall path similarity */
  pathSimilarity: number
}

export interface TraceStepSummary {
  sequence: number
  type: string
  summary: string
}

export interface TraceStepDiff {
  sequenceA: number
  sequenceB: number
  type: string
  differences: string[]
}

export interface ScoreDiff {
  evaluator: string
  scoreA: number
  scoreB: number
  change: number
  direction: 'better' | 'worse' | 'same'
}

// ============================================================
// Main Diff Function
// ============================================================

/**
 * Compute a comprehensive diff between two run results.
 */
export function diffRuns(runA: RunResult, runB: RunResult): RunDiff {
  const textDiffs = computeTextDiffs(runA, runB)
  const metricDiffs = computeMetricDiffs(runA.metrics, runB.metrics)
  const traceDiff = computeTraceDiff(runA.trace, runB.trace)
  const scoreDiffs = computeScoreDiffs(runA.scores ?? [], runB.scores ?? [])

  const statusDiff: StatusDiff = {
    statusA: runA.status,
    statusB: runB.status,
    same: runA.status === runB.status,
  }

  const totalChanges =
    textDiffs.filter((d) => !d.identical).length +
    metricDiffs.filter((d) => d.direction !== 'unchanged').length +
    (traceDiff.onlyInA.length + traceDiff.onlyInB.length + traceDiff.modified.length)

  const summary =
    totalChanges === 0
      ? 'Runs are identical'
      : `${totalChanges} difference(s) found across text, metrics, and execution paths`

  return {
    runAId: runA.id,
    runBId: runB.id,
    statusDiff,
    textDiffs,
    metricDiffs,
    traceDiff,
    scoreDiffs,
    summary,
  }
}

// ============================================================
// Text Diff
// ============================================================

function computeTextDiffs(runA: RunResult, runB: RunResult): TextDiff[] {
  const diffs: TextDiff[] = []

  // Extract system prompt
  const promptA = runA.config.agent.systemPrompt
  const promptB = runB.config.agent.systemPrompt
  if (promptA !== undefined || promptB !== undefined) {
    diffs.push(buildTextDiff('system_prompt', promptA ?? '', promptB ?? ''))
  }

  // Extract user prompt (first user message)
  const userMsgA = runA.config.input.messages.find((m) => m.role === 'user')?.content ?? ''
  const userMsgB = runB.config.input.messages.find((m) => m.role === 'user')?.content ?? ''
  diffs.push(buildTextDiff('user_prompt', userMsgA, userMsgB))

  // Extract output
  const outputStepsA = runA.trace?.steps?.filter((s) => s.type === 'response') ?? []
  const outputStepsB = runB.trace?.steps?.filter((s) => s.type === 'response') ?? []
  const outputA = outputStepsA.map((s) => s.llmResponse?.content ?? '').join('\n')
  const outputB = outputStepsB.map((s) => s.llmResponse?.content ?? '').join('\n')
  diffs.push(buildTextDiff('output', outputA, outputB))

  return diffs
}

function buildTextDiff(
  type: TextDiff['type'],
  contentA: string,
  contentB: string,
): TextDiff {
  const hunks = computeHunks(contentA, contentB)
  const identical = contentA === contentB
  const similarity = computeSimilarity(contentA, contentB)

  return {
    type,
    contentA,
    contentB,
    hunks,
    identical,
    similarity,
  }
}

/**
 * Simple line-based diff algorithm.
 */
function computeHunks(textA: string, textB: string): DiffHunk[] {
  const linesA = textA.split('\n')
  const linesB = textB.split('\n')
  const hunks: DiffHunk[] = []

  const maxLen = Math.max(linesA.length, linesB.length)

  for (let i = 0; i < maxLen; i++) {
    const lineA = linesA[i] ?? ''
    const lineB = linesB[i] ?? ''

    if (lineA === lineB) {
      hunks.push({
        type: 'unchanged',
        lineA: i + 1,
        lineB: i + 1,
        contentA: lineA,
        contentB: lineB,
      })
    } else if (i >= linesA.length) {
      hunks.push({
        type: 'added',
        lineB: i + 1,
        contentA: '',
        contentB: lineB,
      })
    } else if (i >= linesB.length) {
      hunks.push({
        type: 'removed',
        lineA: i + 1,
        contentA: lineA,
        contentB: '',
      })
    } else {
      hunks.push({
        type: 'modified',
        lineA: i + 1,
        lineB: i + 1,
        contentA: lineA,
        contentB: lineB,
      })
    }
  }

  return hunks
}

/**
 * Compute similarity ratio using Jaccard-like word overlap.
 */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a || !b) return 0

  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return union.size === 0 ? 1 : Math.round((intersection.size / union.size) * 100) / 100
}

// ============================================================
// Metric Diff
// ============================================================

function computeMetricDiffs(metricsA: RunMetrics, metricsB: RunMetrics): MetricDiff[] {
  return [
    buildMetricDiffItem('totalTokens', 'Total Tokens', metricsA.totalTokens, metricsB.totalTokens),
    buildMetricDiffItem('promptTokens', 'Prompt Tokens', metricsA.promptTokens, metricsB.promptTokens),
    buildMetricDiffItem('completionTokens', 'Completion Tokens', metricsA.completionTokens, metricsB.completionTokens),
    buildMetricDiffItem('totalCost', 'Total Cost', metricsA.totalCost, metricsB.totalCost),
    buildMetricDiffItem('totalLatency', 'Total Latency (ms)', metricsA.totalLatency, metricsB.totalLatency),
    buildMetricDiffItem('stepCount', 'Steps', metricsA.stepCount, metricsB.stepCount),
    buildMetricDiffItem('llmCallCount', 'LLM Calls', metricsA.llmCallCount, metricsB.llmCallCount),
    buildMetricDiffItem('toolCallCount', 'Tool Calls', metricsA.toolCallCount, metricsB.toolCallCount),
  ]
}

function buildMetricDiffItem(
  metric: string,
  label: string,
  valueA: number,
  valueB: number,
): MetricDiff {
  const change = valueB - valueA
  const changePercent =
    valueA === 0
      ? valueB === 0 ? 0 : 100
      : Math.round((change / valueA) * 10000) / 100

  return {
    metric,
    valueA,
    valueB,
    change,
    changePercent,
    direction: changePercent === 0 ? 'unchanged' : changePercent > 0 ? 'increase' : 'decrease',
    label,
  }
}

// ============================================================
// Trace Diff
// ============================================================

function computeTraceDiff(traceA: ExecutionTrace, traceB: ExecutionTrace): TraceDiff {
  const stepsA = traceA?.steps ?? []
  const stepsB = traceB?.steps ?? []

  const summariesA = stepsA.map(toSummary)
  const summariesB = stepsB.map(toSummary)

  // Find steps only in A
  const onlyInA: TraceStepSummary[] = []
  const onlyInB: TraceStepSummary[] = []
  const modified: TraceStepDiff[] = []
  let identical = 0

  const maxLen = Math.max(stepsA.length, stepsB.length)

  for (let i = 0; i < maxLen; i++) {
    const stepA = stepsA[i]
    const stepB = stepsB[i]

    if (!stepA) {
      onlyInB.push(summariesB[i])
    } else if (!stepB) {
      onlyInA.push(summariesA[i])
    } else if (stepA.type === stepB.type && stepA.sequence === stepB.sequence) {
      // Compare details
      const diffs: string[] = []

      if (stepA.type === 'llm_call') {
        if (stepA.llmModel !== stepB.llmModel) diffs.push(`model: ${stepA.llmModel} → ${stepB.llmModel}`)
        if (stepA.promptTokens !== stepB.promptTokens) diffs.push(`prompt tokens: ${stepA.promptTokens} → ${stepB.promptTokens}`)
        if (stepA.completionTokens !== stepB.completionTokens) diffs.push(`completion tokens: ${stepA.completionTokens} → ${stepB.completionTokens}`)
      } else if (stepA.type === 'tool_call') {
        if (stepA.toolName !== stepB.toolName) diffs.push(`tool: ${stepA.toolName} → ${stepB.toolName}`)
        if (stepA.duration !== stepB.duration) diffs.push(`duration: ${stepA.duration}ms → ${stepB.duration}ms`)
      }

      if (stepA.status !== stepB.status) diffs.push(`status: ${stepA.status} → ${stepB.status}`)

      if (diffs.length > 0) {
        modified.push({
          sequenceA: stepA.sequence,
          sequenceB: stepB.sequence,
          type: stepA.type,
          differences: diffs,
        })
      } else {
        identical++
      }
    } else {
      modified.push({
        sequenceA: stepA.sequence,
        sequenceB: stepB.sequence,
        type: stepA.type !== stepB.type ? `${stepA.type} / ${stepB.type}` : stepA.type,
        differences: ['step type or sequence differs'],
      })
    }
  }

  const totalChanges = onlyInA.length + onlyInB.length + modified.length
  const totalSteps = Math.max(stepsA.length, stepsB.length)
  const pathSimilarity = totalSteps === 0 ? 1 : Math.round((1 - totalChanges / totalSteps) * 100) / 100

  return {
    stepCountDiff: {
      countA: stepsA.length,
      countB: stepsB.length,
      difference: stepsB.length - stepsA.length,
    },
    onlyInA,
    onlyInB,
    modified,
    identical,
    pathSimilarity,
  }
}

function toSummary(step: TraceStep): TraceStepSummary {
  let summary = ''
  switch (step.type) {
    case 'llm_call':
      summary = `LLM call (${step.llmModel ?? 'unknown'})`
      break
    case 'tool_call':
      summary = `Tool: ${step.toolName ?? 'unknown'}()`
      break
    case 'response':
      summary = `Response: ${(step.llmResponse?.content ?? '').slice(0, 80)}`
      break
    case 'error':
      summary = `Error: ${step.error?.message ?? 'unknown'}`
      break
  }
  return { sequence: step.sequence, type: step.type, summary }
}

// ============================================================
// Score Diff
// ============================================================

function computeScoreDiffs(scoresA: Score[], scoresB: Score[]): ScoreDiff[] {
  const diffs: ScoreDiff[] = []

  for (const scoreB of scoresB) {
    const scoreA = scoresA.find((s) => s.evaluator === scoreB.evaluator)
    if (scoreA) {
      const change = Math.round((scoreB.score - scoreA.score) * 100) / 100
      diffs.push({
        evaluator: scoreB.evaluator,
        scoreA: scoreA.score,
        scoreB: scoreB.score,
        change,
        direction: change > 0.05 ? 'better' : change < -0.05 ? 'worse' : 'same',
      })
    }
  }

  // Scores only in A
  for (const scoreA of scoresA) {
    if (!scoresB.find((s) => s.evaluator === scoreA.evaluator)) {
      diffs.push({
        evaluator: scoreA.evaluator,
        scoreA: scoreA.score,
        scoreB: 0,
        change: -scoreA.score,
        direction: 'worse',
      })
    }
  }

  return diffs
}
