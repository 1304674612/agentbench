import { describe, it, expect } from 'vitest'
import { diffRuns } from './diff-engine'
import type { RunResult, RunMetrics } from '../types/run'
import type { TraceStep } from '../types/trace'

interface RunOverrides {
  id: string
  status?: string
  config?: {
    agent?: { model?: string; systemPrompt?: string }
    input?: { messages?: Array<{ role: string; content: string }> }
  }
  trace?: { steps?: TraceStep[] }
  metrics?: Partial<RunMetrics>
  scores?: RunResult['scores']
}

function makeBaseSteps(): TraceStep[] {
  return [
    {
      id: 'step_1',
      sequence: 1,
      type: 'llm_call',
      startedAt: new Date(),
      endedAt: new Date(),
      duration: 500,
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
      promptTokens: 50,
      completionTokens: 25,
      totalTokens: 75,
      cost: 0.0005,
      status: 'success',
    },
    {
      id: 'step_2',
      sequence: 2,
      type: 'tool_call',
      startedAt: new Date(),
      endedAt: new Date(),
      duration: 200,
      toolName: 'search',
      status: 'success',
    },
    {
      id: 'step_3',
      sequence: 3,
      type: 'response',
      startedAt: new Date(),
      endedAt: new Date(),
      duration: 50,
      llmResponse: {
        content: 'The answer is 42.',
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: 'gpt-4o',
      },
      status: 'success',
    },
  ]
}

function makeRunResult(overrides: RunOverrides): RunResult {
  const systemPrompt = overrides.config?.agent?.systemPrompt ?? 'You are a helpful assistant.'
  const userContent =
    overrides.config?.input?.messages?.[0]?.content ?? 'What is the meaning of life?'
  const agentModel = overrides.config?.agent?.model ?? 'gpt-4o'

  return {
    id: overrides.id,
    config: {
      name: `Run ${overrides.id}`,
      projectId: 'proj_1',
      agent: {
        provider: 'openai',
        model: agentModel,
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt,
        tools: [],
      },
      input: {
        messages: [{ role: 'user', content: userContent }],
      },
      options: { timeout: 120000, maxSteps: 50, retries: 0, concurrency: 1 },
    },
    status: (overrides.status as RunResult['status']) ?? 'passed',
    trace: {
      id: `trace_${overrides.id}`,
      runId: overrides.id,
      steps: overrides.trace?.steps ?? makeBaseSteps(),
      metadata: { agentName: 'test', environment: 'development' },
      createdAt: new Date(),
    },
    metrics: {
      totalTokens: overrides.metrics?.totalTokens ?? 75,
      promptTokens: overrides.metrics?.promptTokens ?? 50,
      completionTokens: overrides.metrics?.completionTokens ?? 25,
      totalCost: overrides.metrics?.totalCost ?? 0.0005,
      totalLatency: overrides.metrics?.totalLatency ?? 750,
      stepCount: overrides.metrics?.stepCount ?? 3,
      llmCallCount: overrides.metrics?.llmCallCount ?? 1,
      toolCallCount: overrides.metrics?.toolCallCount ?? 1,
      toolSuccessCount: 1,
      toolFailureCount: 0,
    },
    scores: overrides.scores ?? [{ evaluator: 'correctness', score: 8, maxScore: 10 }],
    assertionResults: [],
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 750,
  } as RunResult
}

describe('Diff Engine', () => {
  describe('text diffs', () => {
    it('detects system prompt changes', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        config: { agent: { systemPrompt: 'You are an unhelpful assistant.' } },
      })

      const diff = diffRuns(runA, runB)

      const systemDiff = diff.textDiffs.find((d) => d.type === 'system_prompt')
      expect(systemDiff).toBeDefined()
      expect(systemDiff!.identical).toBe(false)
    })

    it('detects user prompt changes', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        config: { input: { messages: [{ role: 'user', content: 'Different question?' }] } },
      })

      const diff = diffRuns(runA, runB)

      const userDiff = diff.textDiffs.find((d) => d.type === 'user_prompt')
      expect(userDiff).toBeDefined()
      expect(userDiff!.identical).toBe(false)
    })

    it('detects output changes', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        trace: {
          steps: [
            makeBaseSteps()[0],
            makeBaseSteps()[1],
            {
              id: 'step_3',
              sequence: 3,
              type: 'response',
              startedAt: new Date(),
              endedAt: new Date(),
              duration: 50,
              llmResponse: {
                content: 'A different answer.',
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model: 'gpt-4o',
              },
              status: 'success',
            },
          ],
        },
      })

      const diff = diffRuns(runA, runB)

      const outputDiff = diff.textDiffs.find((d) => d.type === 'output')
      expect(outputDiff).toBeDefined()
      expect(outputDiff!.identical).toBe(false)
    })

    it('computes similarity scores for text diffs', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({ id: 'run_b' })

      const diff = diffRuns(runA, runB)

      const systemDiff = diff.textDiffs.find((d) => d.type === 'system_prompt')
      expect(systemDiff!.similarity).toBe(1)
    })

    it('produces diff hunks', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        config: { input: { messages: [{ role: 'user', content: 'Line 1\nLine 2 changed' }] } },
      })

      const diff = diffRuns(runA, runB)

      const userDiff = diff.textDiffs.find((d) => d.type === 'user_prompt')
      expect(userDiff!.hunks.length).toBeGreaterThan(0)
    })
  })

  describe('metric diffs', () => {
    it('diffs token metrics', () => {
      const runA = makeRunResult({ id: 'run_a', metrics: { totalTokens: 100 } })
      const runB = makeRunResult({ id: 'run_b', metrics: { totalTokens: 200 } })

      const diff = diffRuns(runA, runB)

      const tokenDiff = diff.metricDiffs.find((d) => d.metric === 'totalTokens')
      expect(tokenDiff).toBeDefined()
      expect(tokenDiff!.valueA).toBe(100)
      expect(tokenDiff!.valueB).toBe(200)
      expect(tokenDiff!.change).toBe(100)
      expect(tokenDiff!.direction).toBe('increase')
    })

    it('diffs cost metrics', () => {
      const runA = makeRunResult({ id: 'run_a', metrics: { totalCost: 0.001 } })
      const runB = makeRunResult({ id: 'run_b', metrics: { totalCost: 0.003 } })

      const diff = diffRuns(runA, runB)

      const costDiff = diff.metricDiffs.find((d) => d.metric === 'totalCost')
      expect(costDiff).toBeDefined()
      expect(costDiff!.valueB).toBe(0.003)
    })

    it('diffs latency metrics', () => {
      const runA = makeRunResult({ id: 'run_a', metrics: { totalLatency: 1000 } })
      const runB = makeRunResult({ id: 'run_b', metrics: { totalLatency: 500 } })

      const diff = diffRuns(runA, runB)

      const latencyDiff = diff.metricDiffs.find((d) => d.metric === 'totalLatency')
      expect(latencyDiff).toBeDefined()
      expect(latencyDiff!.direction).toBe('decrease')
    })

    it('handles zero values in percentage calculation', () => {
      const runA = makeRunResult({ id: 'run_a', metrics: { totalTokens: 0 } })
      const runB = makeRunResult({ id: 'run_b', metrics: { totalTokens: 0 } })

      const diff = diffRuns(runA, runB)

      const tokenDiff = diff.metricDiffs.find((d) => d.metric === 'totalTokens')
      expect(tokenDiff!.direction).toBe('unchanged')
    })

    it('includes all metrics', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({ id: 'run_b' })

      const diff = diffRuns(runA, runB)

      const metricNames = diff.metricDiffs.map((d) => d.metric)
      expect(metricNames).toContain('totalTokens')
      expect(metricNames).toContain('promptTokens')
      expect(metricNames).toContain('completionTokens')
      expect(metricNames).toContain('totalCost')
      expect(metricNames).toContain('totalLatency')
      expect(metricNames).toContain('stepCount')
      expect(metricNames).toContain('llmCallCount')
      expect(metricNames).toContain('toolCallCount')
    })
  })

  describe('trace diffs', () => {
    it('diffs execution paths', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({ id: 'run_b' })

      const diff = diffRuns(runA, runB)

      expect(diff.traceDiff.stepCountDiff.difference).toBe(0)
      expect(diff.traceDiff.identical).toBeGreaterThan(0)
    })

    it('detects different step counts', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        trace: {
          steps: [
            {
              id: 'step_1',
              sequence: 1,
              type: 'llm_call',
              startedAt: new Date(),
              endedAt: new Date(),
              duration: 500,
              llmProvider: 'openai',
              llmModel: 'gpt-4o',
              promptTokens: 50,
              completionTokens: 25,
              totalTokens: 75,
              status: 'success',
            },
          ],
        },
      })

      const diff = diffRuns(runA, runB)

      expect(diff.traceDiff.stepCountDiff.countA).toBe(3)
      expect(diff.traceDiff.stepCountDiff.countB).toBe(1)
      expect(diff.traceDiff.stepCountDiff.difference).toBe(-2)
      expect(diff.traceDiff.onlyInA.length).toBeGreaterThan(0)
    })

    it('detects tool name changes in steps', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        trace: {
          steps: [
            makeBaseSteps()[0],
            {
              id: 'step_2',
              sequence: 2,
              type: 'tool_call',
              startedAt: new Date(),
              endedAt: new Date(),
              duration: 200,
              toolName: 'different_tool',
              status: 'success',
            },
            makeBaseSteps()[2],
          ],
        },
      })

      const diff = diffRuns(runA, runB)

      expect(diff.traceDiff.modified).toBeDefined()
    })

    it('computes path similarity', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({ id: 'run_b' })

      const diff = diffRuns(runA, runB)

      expect(diff.traceDiff.pathSimilarity).toBeGreaterThanOrEqual(0)
      expect(diff.traceDiff.pathSimilarity).toBeLessThanOrEqual(1)
    })

    it('handles empty traces', () => {
      const runA = makeRunResult({
        id: 'run_a',
        trace: { steps: [] },
      })
      const runB = makeRunResult({
        id: 'run_b',
        trace: { steps: [] },
      })

      const diff = diffRuns(runA, runB)

      expect(diff.traceDiff.pathSimilarity).toBe(1)
    })
  })

  describe('score diffs', () => {
    it('diffs scores between runs', () => {
      const runA = makeRunResult({
        id: 'run_a',
        scores: [{ evaluator: 'correctness', score: 7, maxScore: 10 }],
      })
      const runB = makeRunResult({
        id: 'run_b',
        scores: [{ evaluator: 'correctness', score: 9, maxScore: 10 }],
      })

      const diff = diffRuns(runA, runB)

      expect(diff.scoreDiffs).toHaveLength(1)
      expect(diff.scoreDiffs[0].evaluator).toBe('correctness')
      expect(diff.scoreDiffs[0].scoreA).toBe(7)
      expect(diff.scoreDiffs[0].scoreB).toBe(9)
      expect(diff.scoreDiffs[0].direction).toBe('better')
    })

    it('detects worse scores', () => {
      const runA = makeRunResult({
        id: 'run_a',
        scores: [{ evaluator: 'correctness', score: 9, maxScore: 10 }],
      })
      const runB = makeRunResult({
        id: 'run_b',
        scores: [{ evaluator: 'correctness', score: 5, maxScore: 10 }],
      })

      const diff = diffRuns(runA, runB)

      expect(diff.scoreDiffs[0].direction).toBe('worse')
    })

    it('handles scores only in run A', () => {
      const runA = makeRunResult({
        id: 'run_a',
        scores: [{ evaluator: 'custom_eval', score: 8, maxScore: 10 }],
      })
      const runB = makeRunResult({
        id: 'run_b',
        scores: [],
      })

      const diff = diffRuns(runA, runB)

      expect(diff.scoreDiffs.some((d) => d.evaluator === 'custom_eval')).toBe(true)
    })
  })

  describe('status diff', () => {
    it('compares run statuses', () => {
      const runA = makeRunResult({ id: 'run_a', status: 'passed' })
      const runB = makeRunResult({ id: 'run_b', status: 'passed' })

      const diff = diffRuns(runA, runB)

      expect(diff.statusDiff.same).toBe(true)
    })

    it('detects different statuses', () => {
      const runA = makeRunResult({ id: 'run_a', status: 'passed' })
      const runB = makeRunResult({ id: 'run_b', status: 'failed' })

      const diff = diffRuns(runA, runB)

      expect(diff.statusDiff.same).toBe(false)
      expect(diff.statusDiff.statusA).toBe('passed')
      expect(diff.statusDiff.statusB).toBe('failed')
    })
  })

  describe('summary', () => {
    it('generates summary for identical runs', () => {
      const run = makeRunResult({ id: 'run_a' })
      const diff = diffRuns(run, run)

      expect(diff.summary).toBe('Runs are identical')
    })

    it('generates summary with change count', () => {
      const runA = makeRunResult({ id: 'run_a' })
      const runB = makeRunResult({
        id: 'run_b',
        status: 'failed',
        config: {
          agent: { systemPrompt: 'Different prompt.' },
          input: { messages: [{ role: 'user', content: 'Different question?' }] },
        },
        metrics: { totalTokens: 999 },
      })

      const diff = diffRuns(runA, runB)

      expect(diff.summary).toContain('difference')
    })

    it('includes run IDs in diff result', () => {
      const runA = makeRunResult({ id: 'run_alpha' })
      const runB = makeRunResult({ id: 'run_beta' })

      const diff = diffRuns(runA, runB)

      expect(diff.runAId).toBe('run_alpha')
      expect(diff.runBId).toBe('run_beta')
    })
  })
})
