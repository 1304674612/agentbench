import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Runner, TimeoutError, type RunnerConfig, type RunContext } from './runner'
import type { RunStorage } from '../storage/adapter'
import type { Run, TraceStep } from '../types'

function mockStorage(): RunStorage {
  const runs: Run[] = []
  const traceSteps: Array<Record<string, unknown>> = []

  return {
    createRun: vi.fn().mockImplementation(async (data) => {
      const run = {
        id: `run_${runs.length + 1}`,
        projectId: data.projectId,
        testCaseId: data.testCaseId,
        userId: data.userId,
        name: data.name,
        status: 'pending',
        config: data.config ?? {},
        tags: data.tags,
        metadata: data.metadata,
        createdAt: new Date(),
      } satisfies Run
      runs.push(run)
      return run
    }),
    getRun: vi.fn().mockResolvedValue(null),
    listRuns: vi.fn().mockResolvedValue([]),
    updateRun: vi.fn().mockImplementation(async (id, data) => {
      const run = runs.find((r) => r.id === id)
      if (run) {
        Object.assign(run, data)
      }
      return run as Run
    }),
    deleteRun: vi.fn().mockResolvedValue(undefined),
    createTraceStep: vi.fn().mockImplementation(async (data) => {
      const step = { ...data, id: `step_${traceSteps.length + 1}` }
      traceSteps.push(step)
      return step as unknown as TraceStep
    }),
    batchCreateTraceSteps: vi.fn().mockResolvedValue([]),
    getTraceSteps: vi.fn().mockResolvedValue([]),
    createScore: vi.fn().mockResolvedValue({}),
    batchCreateScores: vi.fn().mockResolvedValue([]),
    getScores: vi.fn().mockResolvedValue([]),
    createAssertionResult: vi.fn().mockResolvedValue({}),
    batchCreateAssertionResults: vi.fn().mockResolvedValue([]),
    getAssertionResults: vi.fn().mockResolvedValue([]),
  } satisfies RunStorage
}

function buildConfig(overrides?: Partial<RunnerConfig>): RunnerConfig {
  return {
    storage: mockStorage(),
    agent: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: 'You are a helpful assistant.',
    },
    input: {
      messages: [{ role: 'user' as const, content: 'Hello!' }],
    },
    projectId: 'proj_test',
    name: 'Test Run',
    tags: ['test'],
    ...overrides,
  }
}

const successfulExecute = vi.fn().mockImplementation(async (ctx: RunContext) => {
  await ctx.tracer.traceLLMCall(
    'openai',
    'gpt-4o',
    { messages: [{ role: 'user', content: 'Hello!' }] },
    async () => ({ choices: [{ message: { content: 'Hi there!' } }] }),
    (result) => ({
      content: 'Hi there!',
      finishReason: 'stop',
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    })
  )
  ctx.tracer.recordResponse('Hi there!')
})

describe('Runner', () => {
  let storage: RunStorage
  let runner: Runner

  beforeEach(() => {
    storage = mockStorage()
    runner = new Runner(storage)
  })

  describe('run', () => {
    it('executes successfully with valid config', async () => {
      const config = buildConfig({ storage })
      const result = await runner.run(config, successfulExecute)

      expect(result.status).toBe('passed')
      expect(result.id).toBeTruthy()
      expect(result.metrics.totalTokens).toBeGreaterThan(0)
      expect(result.trace.steps.length).toBeGreaterThan(0)
    })

    it('captures trace steps', async () => {
      const config = buildConfig({ storage })
      const result = await runner.run(config, successfulExecute)

      expect(result.trace.steps.length).toBeGreaterThanOrEqual(2)
      expect(result.trace.steps.some((s) => s.type === 'llm_call')).toBe(true)
      expect(result.trace.steps.some((s) => s.type === 'response')).toBe(true)
    })

    it('handles timeout correctly', async () => {
      const config = buildConfig({
        storage,
        options: { timeout: 50 },
      })
      const slowExec = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
      })

      const result = await runner.run(config, slowExec)

      expect(result.status).toBe('timeout')
      expect(result.error).toContain('timed out')
    })

    it('handles execution errors', async () => {
      const config = buildConfig({ storage })
      const failExec = vi.fn().mockRejectedValue(new Error('API connection failed'))

      const result = await runner.run(config, failExec)

      expect(result.status).toBe('error')
      expect(result.error).toContain('API connection failed')
    })

    it('returns correct RunResult structure', async () => {
      const config = buildConfig({ storage })
      const result = await runner.run(config, successfulExecute)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('config')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('trace')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('scores')
      expect(result).toHaveProperty('assertionResults')
      expect(result).toHaveProperty('startedAt')
      expect(result).toHaveProperty('endedAt')
      expect(result).toHaveProperty('duration')
      expect(result).toHaveProperty('summary')

      expect(result.metrics).toHaveProperty('totalTokens')
      expect(result.metrics).toHaveProperty('promptTokens')
      expect(result.metrics).toHaveProperty('completionTokens')
      expect(result.metrics).toHaveProperty('totalCost')
      expect(result.metrics).toHaveProperty('totalLatency')
      expect(result.metrics).toHaveProperty('stepCount')
      expect(result.metrics).toHaveProperty('llmCallCount')
      expect(result.metrics).toHaveProperty('toolCallCount')
    })

    it('persists trace steps to storage via batch insert', async () => {
      const config = buildConfig({ storage })
      await runner.run(config, successfulExecute)

      expect(storage.batchCreateTraceSteps).toHaveBeenCalled()
      const batchArgs = (storage.batchCreateTraceSteps as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
      expect(Array.isArray(batchArgs)).toBe(true)
      expect(batchArgs.length).toBeGreaterThan(0)
    })

    it('updates run status in storage', async () => {
      const config = buildConfig({ storage })
      await runner.run(config, successfulExecute)

      expect(storage.updateRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'running' })
      )
      expect(storage.updateRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'passed' })
      )
    })
  })

  describe('runBatch', () => {
    it('runs multiple configs and returns array of results', async () => {
      const configs = [
        buildConfig({ storage, name: 'Batch Run 1', projectId: 'proj_1' }),
        buildConfig({ storage, name: 'Batch Run 2', projectId: 'proj_2' }),
      ]

      const results = await runner.runBatch(configs, async (ctx, _config) => {
        await ctx.tracer.traceLLMCall(
          'openai',
          'gpt-4o',
          { messages: [{ role: 'user', content: 'Hi' }] },
          async () => ({ choices: [{ message: { content: 'Hey' } }] }),
          (result) => ({
            content: 'Hey',
            finishReason: 'stop',
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
          })
        )
      })

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('passed')
      expect(results[1].status).toBe('passed')
    })

    it('handles failures in batch and returns correct status', async () => {
      const configs = [
        buildConfig({ storage, name: 'Good Run', projectId: 'proj_1' }),
        buildConfig({ storage, name: 'Failing Run', projectId: 'proj_2' }),
      ]

      const results = await runner.runBatch(configs, async (ctx, config) => {
        if (config.name === 'Failing Run') {
          throw new Error('Batch item failure')
        }
        await ctx.tracer.traceLLMCall(
          'openai',
          'gpt-4o',
          { messages: [{ role: 'user', content: 'Hi' }] },
          async () => ({ choices: [{ message: { content: 'Hey' } }] }),
          (result) => ({
            content: 'Hey',
            finishReason: 'stop',
            usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
          })
        )
      })

      expect(results).toHaveLength(2)
      // At least one should have error status
      const errorResults = results.filter((r) => r.status === 'error')
      expect(errorResults.length).toBeGreaterThanOrEqual(1)
      expect(errorResults[0].error).toBeTruthy()
    })
  })

  describe('TimeoutError', () => {
    it('is an instance of Error', () => {
      const err = new TimeoutError('test')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('TimeoutError')
      expect(err.message).toBe('test')
    })
  })
})
