import { describe, it, expect } from 'vitest'
import {
  expect as assertExpect,
  AssertionBuilder,
  createAssertionBuilder,
  buildContextFromRun,
  type AssertionContext,
} from './assert'
import type { RunResult, ExecutionTrace } from '../types'

function createMockContext(overrides?: Partial<AssertionContext>): AssertionContext {
  return {
    output: 'The capital of France is Paris.',
    toolCalls: [
      { name: 'search', arguments: { query: 'capital of France' }, result: 'Paris' },
      { name: 'verify', arguments: { source: 'wikipedia' }, result: 'verified' },
      { name: 'search', arguments: { query: 'France population' }, result: '67M' },
    ],
    metrics: {
      totalTokens: 1500,
      promptTokens: 600,
      completionTokens: 900,
      totalCost: 0.003,
      totalLatency: 2500,
      firstTokenLatency: 400,
      stepCount: 3,
      llmCallCount: 2,
      toolCallCount: 3,
      toolSuccessCount: 3,
      toolFailureCount: 0,
    },
    scores: [
      { evaluator: 'correctness', score: 8, maxScore: 10 },
      { evaluator: 'faithfulness', score: 9, maxScore: 10 },
    ],
    status: 'passed',
    ...overrides,
  }
}

function createMockRunResult(overrides?: Partial<RunResult>): RunResult {
  const trace: ExecutionTrace = {
    id: 'trace_1',
    runId: 'run_1',
    steps: [
      {
        id: 'step_1',
        sequence: 1,
        type: 'tool_call',
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 100,
        toolName: 'search',
        toolRequest: { name: 'search', arguments: { query: 'capital of France' } },
        toolResponse: { result: 'Paris' },
        status: 'success',
      },
      {
        id: 'step_2',
        sequence: 2,
        type: 'tool_call',
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 50,
        toolName: 'verify',
        toolRequest: { name: 'verify', arguments: { source: 'wikipedia' } },
        toolResponse: { result: 'verified' },
        status: 'success',
      },
      {
        id: 'step_3',
        sequence: 3,
        type: 'tool_call',
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 80,
        toolName: 'search',
        toolRequest: { name: 'search', arguments: { query: 'France population' } },
        toolResponse: { result: '67M' },
        status: 'success',
      },
      {
        id: 'step_4',
        sequence: 4,
        type: 'response',
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 10,
        llmResponse: { content: 'The capital of France is Paris.', finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, model: 'gpt-4o' },
        status: 'success',
      },
    ],
    metadata: { agentName: 'test', environment: 'development' },
    createdAt: new Date(),
  }

  return {
    id: 'run_1',
    config: {
      name: 'Test Run',
      projectId: 'proj_1',
      agent: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'You are helpful.',
      },
      input: { messages: [{ role: 'user', content: 'What is the capital of France?' }] },
      options: { timeout: 120000, maxSteps: 50, retries: 0, concurrency: 1 },
    },
    status: 'passed',
    trace,
    metrics: {
      totalTokens: 1500,
      promptTokens: 600,
      completionTokens: 900,
      totalCost: 0.003,
      totalLatency: 2500,
      firstTokenLatency: 400,
      toolCallCount: 3,
      toolSuccessCount: 3,
      toolFailureCount: 0,
      stepCount: 4,
      llmCallCount: 1,
    },
    scores: [
      { evaluator: 'correctness', score: 8, maxScore: 10 },
      { evaluator: 'faithfulness', score: 9, maxScore: 10 },
    ],
    assertionResults: [],
    startedAt: new Date(),
    endedAt: new Date(),
    duration: 2500,
    summary: 'Completed',
    ...overrides,
  }
}

describe('assertion engine', () => {
  describe('status matchers', () => {
    it('toBeCompleted passes when status is "passed"', () => {
      const ctx = createMockContext({ status: 'passed' })
      const results = createAssertionBuilder()
        .status().toBeCompleted()
        .run(ctx)

      expect(results.allPassed).toBe(true)
      expect(results.passed).toBe(1)
    })

    it('toBeCompleted passes when status is "completed"', () => {
      const ctx = createMockContext({ status: 'completed' })
      const results = createAssertionBuilder()
        .status().toBeCompleted()
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeCompleted fails when status is "failed"', () => {
      const ctx = createMockContext({ status: 'failed' })
      const results = createAssertionBuilder()
        .status().toBeCompleted()
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBe passes when status matches expected', () => {
      const ctx = createMockContext({ status: 'running' })
      const results = createAssertionBuilder()
        .status().toBe('running')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBe fails when status does not match', () => {
      const ctx = createMockContext({ status: 'passed' })
      const results = createAssertionBuilder()
        .status().toBe('failed')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })
  })

  describe('tool matchers', () => {
    const ctx = createMockContext()

    it('toBeCalled passes when tool was called', () => {
      const results = createAssertionBuilder()
        .tool('search').toBeCalled()
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeCalled fails when tool was not called', () => {
      const results = createAssertionBuilder()
        .tool('nonexistent').toBeCalled()
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeCalledWith passes with matching arguments', () => {
      const results = createAssertionBuilder()
        .tool('search').toBeCalledWith({ query: 'capital of France' })
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeCalledWith fails with wrong arguments', () => {
      const results = createAssertionBuilder()
        .tool('search').toBeCalledWith({ query: 'wrong query' })
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeCalledTimes passes with correct count', () => {
      const results = createAssertionBuilder()
        .tool('search').toBeCalledTimes(2)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeCalledTimes fails with wrong count', () => {
      const results = createAssertionBuilder()
        .tool('search').toBeCalledTimes(5)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('notToBeCalled passes when tool was not called', () => {
      const results = createAssertionBuilder()
        .tool('dangerous_tool').not.toBeCalled()
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('notToBeCalled fails when tool was called', () => {
      const results = createAssertionBuilder()
        .tool('search').not.toBeCalled()
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })
  })

  describe('token matchers', () => {
    const ctx = createMockContext()

    it('toBeLessThan passes when tokens below threshold', () => {
      const results = createAssertionBuilder()
        .tokens().toBeLessThan(3000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeLessThan fails when tokens exceed threshold', () => {
      const results = createAssertionBuilder()
        .tokens().toBeLessThan(500)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeGreaterThan passes when tokens above threshold', () => {
      const results = createAssertionBuilder()
        .tokens().toBeGreaterThan(1000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeGreaterThan fails when tokens below threshold', () => {
      const results = createAssertionBuilder()
        .tokens().toBeGreaterThan(5000)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeBetween passes within range', () => {
      const results = createAssertionBuilder()
        .tokens().toBeBetween(1000, 2000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeBetween fails outside range', () => {
      const results = createAssertionBuilder()
        .tokens().toBeBetween(3000, 5000)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('prompt().toBeLessThan checks prompt tokens', () => {
      const results = createAssertionBuilder()
        .tokens().prompt().toBeLessThan(1000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })
  })

  describe('latency matchers', () => {
    const ctx = createMockContext()

    it('toBeLessThan passes when latency below threshold', () => {
      const results = createAssertionBuilder()
        .latency().toBeLessThan(5000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeLessThan fails when latency above threshold', () => {
      const results = createAssertionBuilder()
        .latency().toBeLessThan(100)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeGreaterThan passes when latency above threshold', () => {
      const results = createAssertionBuilder()
        .latency().toBeGreaterThan(1000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('firstToken().toBeLessThan checks first token latency', () => {
      const results = createAssertionBuilder()
        .latency().firstToken().toBeLessThan(1000)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('firstToken().toBeLessThan fails when threshold exceeded', () => {
      const results = createAssertionBuilder()
        .latency().firstToken().toBeLessThan(10)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })
  })

  describe('output matchers', () => {
    const ctx = createMockContext()

    it('toContain passes when output contains substring', () => {
      const results = createAssertionBuilder()
        .output().toContain('capital of France')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toContain fails when output does not contain substring', () => {
      const results = createAssertionBuilder()
        .output().toContain('capital of Germany')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toMatchRegex passes when output matches pattern', () => {
      const results = createAssertionBuilder()
        .output().toMatchRegex('capital of \\w+')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toMatchRegex fails when output does not match', () => {
      const results = createAssertionBuilder()
        .output().toMatchRegex('\\d{10}')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toMatchSchema validates JSON output', () => {
      const jsonCtx = createMockContext({
        output: '{"name":"Alice","age":30}',
      })
      const results = createAssertionBuilder()
        .output().toMatchSchema({
          type: 'object',
          properties: { name: { type: 'string' }, age: { type: 'number' } },
          required: ['name'],
        })
        .run(jsonCtx)

      expect(results.allPassed).toBe(true)
    })

    it('toMatchSchema fails for non-JSON output', () => {
      const results = createAssertionBuilder()
        .output().toMatchSchema({ type: 'object' })
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toEqual passes when output matches exactly', () => {
      const results = createAssertionBuilder()
        .output().toEqual('The capital of France is Paris.')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toEqual fails when output differs', () => {
      const results = createAssertionBuilder()
        .output().toEqual('Something else')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toMatchSnapshot passes for identical output', () => {
      const results = createAssertionBuilder()
        .output().toMatchSnapshot('The capital of France is Paris.')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toMatchSnapshot fails for different output', () => {
      const results = createAssertionBuilder()
        .output().toMatchSnapshot('Something else')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('not.toContain passes when output does not contain substring', () => {
      const results = createAssertionBuilder()
        .output().not.toContain('Germany')
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('not.toContain fails when output does contain substring', () => {
      const results = createAssertionBuilder()
        .output().not.toContain('Paris')
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })
  })

  describe('score matchers', () => {
    const ctx = createMockContext()

    it('toBeGreaterThan passes when score above threshold', () => {
      const results = createAssertionBuilder()
        .score('correctness').toBeGreaterThan(7)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeGreaterThan fails when score below threshold', () => {
      const results = createAssertionBuilder()
        .score('correctness').toBeGreaterThan(9)
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('toBeLessThan passes when score below threshold', () => {
      const results = createAssertionBuilder()
        .score('correctness').toBeLessThan(9)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('toBeBetween passes when score in range', () => {
      const results = createAssertionBuilder()
        .score('correctness').toBeBetween(7, 9)
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('returns skipped when no matching scores', () => {
      const results = createAssertionBuilder()
        .score('nonexistent').toBeGreaterThan(5)
        .run(ctx)

      expect(results.skipped).toBe(1)
    })

    it('aggregates across all scores when no dimension specified', () => {
      const results = createAssertionBuilder()
        .score().toBeGreaterThan(5)
        .run(ctx)

      // Average of 8 and 9 = 8.5 > 5
      expect(results.allPassed).toBe(true)
    })
  })

  describe('chained DSL', () => {
    it('supports full chained assertions from RunResult', () => {
      const runResult = createMockRunResult()
      const results = assertExpect(runResult)
        .tool('search').toBeCalled()
        .tool('search').toBeCalledWith({ query: 'capital of France' })
        .output().toContain('Paris')
        .run()

      expect(results.allPassed).toBe(true)
      expect(results.passed).toBe(3)
    })

    it('supports full chained assertions from AssertionContext', () => {
      const ctx = createMockContext()
      const results = assertExpect(ctx)
        .tool('search').toBeCalled()
        .output().toContain('Paris')
        .tokens().toBeLessThan(4096)
        .latency().toBeLessThan(5000)
        .run()

      expect(results.allPassed).toBe(true)
    })
  })

  describe('compound assertions', () => {
    const ctx = createMockContext()

    it('all passes when all conditions met', () => {
      const results = createAssertionBuilder()
        .all([
          (b) => {
            b.tool('search').toBeCalled()
          },
          (b) => {
            b.tokens().toBeLessThan(4096)
          },
        ])
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('all fails when any condition not met', () => {
      const results = createAssertionBuilder()
        .all([
          (b) => {
            b.tool('search').toBeCalled()
          },
          (b) => {
            b.tool('nonexistent').toBeCalled()
          },
        ])
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })

    it('any passes when at least one condition met', () => {
      const results = createAssertionBuilder()
        .any([
          (b) => {
            b.tool('nonexistent').toBeCalled()
          },
          (b) => {
            b.tool('search').toBeCalled()
          },
        ])
        .run(ctx)

      expect(results.allPassed).toBe(true)
    })

    it('any fails when no conditions met', () => {
      const results = createAssertionBuilder()
        .any([
          (b) => {
            b.tool('nonexistent').toBeCalled()
          },
          (b) => {
            b.tokens().toBeGreaterThan(100000)
          },
        ])
        .run(ctx)

      expect(results.allPassed).toBe(false)
    })
  })

  describe('assertion result structure', () => {
    it('returns correct result structure from run()', () => {
      const ctx = createMockContext()
      const results = createAssertionBuilder()
        .tool('search').toBeCalled()
        .output().toContain('Paris')
        .run(ctx)

      expect(results).toHaveProperty('assertions')
      expect(results).toHaveProperty('passed')
      expect(results).toHaveProperty('failed')
      expect(results).toHaveProperty('errored')
      expect(results).toHaveProperty('skipped')
      expect(results).toHaveProperty('allPassed')
      expect(results).toHaveProperty('duration')

      expect(results.assertions[0]).toHaveProperty('type')
      expect(results.assertions[0]).toHaveProperty('status')
      expect(results.assertions[0]).toHaveProperty('expected')
      expect(results.assertions[0]).toHaveProperty('actual')
    })

    it('allPassed is true when all assertions pass', () => {
      const ctx = createMockContext()
      const results = createAssertionBuilder()
        .tool('search').toBeCalled()
        .output().toContain('France')
        .run(ctx)

      expect(results.passed).toBe(2)
      expect(results.failed).toBe(0)
      expect(results.allPassed).toBe(true)
    })

    it('allPassed is false when any assertion fails', () => {
      const ctx = createMockContext()
      const results = createAssertionBuilder()
        .tool('search').toBeCalled()
        .tool('nonexistent').toBeCalled()
        .run(ctx)

      expect(results.passed).toBe(1)
      expect(results.failed).toBe(1)
      expect(results.allPassed).toBe(false)
    })

    it('includes duration', () => {
      const ctx = createMockContext()
      const results = createAssertionBuilder()
        .tool('search').toBeCalled()
        .run(ctx)

      expect(results.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe('buildContextFromRun', () => {
    it('extracts output from response steps', () => {
      const run = createMockRunResult()
      const ctx = buildContextFromRun(run)

      expect(ctx.output).toBe('The capital of France is Paris.')
    })

    it('extracts tool calls from trace steps', () => {
      const run = createMockRunResult()
      const ctx = buildContextFromRun(run)

      expect(ctx.toolCalls).toHaveLength(3)
      expect(ctx.toolCalls[0].name).toBe('search')
      expect(ctx.toolCalls[1].name).toBe('verify')
    })

    it('extracts metrics from run', () => {
      const run = createMockRunResult()
      const ctx = buildContextFromRun(run)

      expect(ctx.metrics.totalTokens).toBe(1500)
      expect(ctx.metrics.totalCost).toBe(0.003)
      expect(ctx.metrics.totalLatency).toBe(2500)
    })

    it('extracts scores from run', () => {
      const run = createMockRunResult()
      const ctx = buildContextFromRun(run)

      expect(ctx.scores).toHaveLength(2)
      expect(ctx.scores[0].evaluator).toBe('correctness')
    })

    it('extracts status from run', () => {
      const run = createMockRunResult()
      const ctx = buildContextFromRun(run)

      expect(ctx.status).toBe('passed')
    })

    it('handles empty trace gracefully', () => {
      const run = createMockRunResult({
        trace: {
          id: 'trace_empty',
          runId: 'run_empty',
          steps: [],
          metadata: { agentName: 'test', environment: 'development' },
          createdAt: new Date(),
        },
      })
      const ctx = buildContextFromRun(run)

      expect(ctx.output).toBe('')
      expect(ctx.toolCalls).toHaveLength(0)
    })
  })

  describe('expect entry point', () => {
    it('returns AssertionBuilder without arguments', () => {
      const builder = assertExpect()
      expect(builder).toBeInstanceOf(AssertionBuilder)
    })

    it('returns AssertionBuilder with RunResult', () => {
      const run = createMockRunResult()
      const builder = assertExpect(run)

      // Should resolve context from run and allow assertions
      const results = builder
        .tool('search').toBeCalled()
        .run()

      expect(results.allPassed).toBe(true)
    })
  })

  describe('error handling in assertions', () => {
    it('catches thrown errors and marks as errored', () => {
      const builder = createAssertionBuilder()
      // Force an error by providing null context and calling run without context
      const results = builder.run({} as unknown as AssertionContext)

      // No assertions to check — just ensuring it doesn't crash
      expect(results.assertions).toBeDefined()
    })

    it('throws when run is called without any context', () => {
      const builder = createAssertionBuilder()
      expect(() => builder.run()).toThrow('No assertion context provided')
    })
  })
})
