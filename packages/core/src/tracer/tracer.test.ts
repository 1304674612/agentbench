import { describe, it, expect, vi } from 'vitest'
import { Tracer, type TracerConfig } from './tracer'

function createTracer(config?: Partial<TracerConfig>): Tracer {
  return new Tracer({
    runId: 'run_test_123',
    ...config,
  })
}

describe('Tracer', () => {
  describe('traceLLMCall', () => {
    it('creates execution trace with LLM call step', async () => {
      const tracer = createTracer()
      const execute = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Hello back!' } }] })

      const result = await tracer.traceLLMCall(
        'openai',
        'gpt-4o',
        { messages: [{ role: 'user', content: 'Hello!' }] },
        execute,
        (res) => ({
          content: 'Hello back!',
          finishReason: 'stop',
          usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
          model: 'gpt-4o',
        }),
      )

      expect(result).toBeDefined()
      expect(tracer.steps).toHaveLength(1)
      const step = tracer.steps[0]
      expect(step.type).toBe('llm_call')
      expect(step.status).toBe('success')
      expect(step.llmProvider).toBe('openai')
      expect(step.llmModel).toBe('gpt-4o')
    })

    it('captures step timing (startedAt, endedAt, duration)', async () => {
      const tracer = createTracer()
      const beforeTime = Date.now()

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Hi' }] },
        async () => ({ choices: [{ message: { content: 'Hey' } }] }),
        (res) => ({
          content: 'Hey',
          finishReason: 'stop',
          usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
        }),
      )

      const afterTime = Date.now()
      const step = tracer.steps[0]

      expect(step.startedAt).toBeInstanceOf(Date)
      expect(step.endedAt).toBeInstanceOf(Date)
      expect(step.duration).toBeGreaterThanOrEqual(0)
      expect(step.startedAt.getTime()).toBeGreaterThanOrEqual(beforeTime)
      expect(step.startedAt.getTime()).toBeLessThanOrEqual(afterTime)
      expect(step.endedAt!.getTime()).toBeGreaterThanOrEqual(step.startedAt.getTime())
    })

    it('captures LLM call details (provider, model, request, response)', async () => {
      const tracer = createTracer()

      await tracer.traceLLMCall(
        'anthropic', 'claude-sonnet-4-20250514',
        { messages: [{ role: 'user', content: 'Count to 3' }], temperature: 0.5, max_tokens: 1000 },
        async () => ({ content: [{ text: '1, 2, 3' }] }),
        (res) => ({
          content: '1, 2, 3',
          finishReason: 'end_turn',
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
          model: 'claude-sonnet-4-20250514',
        }),
      )

      const step = tracer.steps[0]

      expect(step.llmProvider).toBe('anthropic')
      expect(step.llmModel).toBe('claude-sonnet-4-20250514')

      // Request captured
      expect(step.llmRequest).toBeDefined()
      expect(step.llmRequest!.model).toBe('claude-sonnet-4-20250514')
      expect(step.llmRequest!.messages).toHaveLength(1)
      expect(step.llmRequest!.temperature).toBe(0.5)

      // Response captured
      expect(step.llmResponse).toBeDefined()
      expect(step.llmResponse!.content).toBe('1, 2, 3')
      expect(step.llmResponse!.finishReason).toBe('end_turn')
      expect(step.llmResponse!.usage.totalTokens).toBe(20)

      // Token counts
      expect(step.promptTokens).toBe(12)
      expect(step.completionTokens).toBe(8)
      expect(step.totalTokens).toBe(20)

      // Cost calculated
      expect(step.cost).toBeGreaterThan(0)
    })

    it('handles multiple steps in sequence', async () => {
      const tracer = createTracer()

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Step 1' }] },
        async () => ({ choices: [{ message: { content: 'A' } }] }),
        (res) => ({
          content: 'A',
          finishReason: 'stop',
          usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
        }),
      )

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Step 2' }] },
        async () => ({ choices: [{ message: { content: 'B' } }] }),
        (res) => ({
          content: 'B',
          finishReason: 'stop',
          usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
        }),
      )

      expect(tracer.steps).toHaveLength(2)
      expect(tracer.steps[0].sequence).toBe(1)
      expect(tracer.steps[1].sequence).toBe(2)
    })

    it('records errors on LLM call failure', async () => {
      const tracer = createTracer()
      const failingExec = vi.fn().mockRejectedValue(new Error('Rate limit exceeded'))

      await expect(
        tracer.traceLLMCall(
          'openai', 'gpt-4o',
          { messages: [{ role: 'user', content: 'Boom' }] },
          failingExec,
          (res) => ({
            content: null,
            finishReason: 'stop',
            usage: {},
          }),
        ),
      ).rejects.toThrow('Rate limit exceeded')

      expect(tracer.steps).toHaveLength(1)
      const step = tracer.steps[0]
      expect(step.type).toBe('llm_call')
      expect(step.status).toBe('error')
      expect(step.error).toBeDefined()
      expect(step.error!.message).toBe('Rate limit exceeded')
    })
  })

  describe('traceToolCall', () => {
    it('captures tool call details', async () => {
      const tracer = createTracer()
      const execute = vi.fn().mockResolvedValue({ results: [{ title: 'Found', url: 'https://example.com' }] })

      const result = await tracer.traceToolCall(
        'web_search',
        { query: 'AgentBench', limit: 5 },
        execute,
      )

      expect(result).toBeDefined()
      expect(tracer.steps).toHaveLength(1)
      const step = tracer.steps[0]
      expect(step.type).toBe('tool_call')
      expect(step.toolName).toBe('web_search')
      expect(step.status).toBe('success')
      expect(step.duration).toBeGreaterThanOrEqual(0)
    })

    it('captures tool call timing', async () => {
      const tracer = createTracer()

      await tracer.traceToolCall(
        'slow_tool',
        { timeout: 100 },
        async () => { /* instant */ },
      )

      const step = tracer.steps[0]
      expect(step.startedAt).toBeInstanceOf(Date)
      expect(step.endedAt).toBeInstanceOf(Date)
      expect(step.duration).toBeGreaterThanOrEqual(0)
    })

    it('captures tool request and response data', async () => {
      const tracer = createTracer()

      await tracer.traceToolCall(
        'calculator',
        { expression: '2 + 2' },
        async () => 4,
      )

      const step = tracer.steps[0]
      expect(step.toolRequest).toBeDefined()
      expect(step.toolRequest!.name).toBe('calculator')
      expect(step.toolRequest!.arguments).toEqual({ expression: '2 + 2' })
      expect(step.toolResponse).toBeDefined()
      expect(step.toolResponse!.result).toBe(4)
    })

    it('captures tool call errors', async () => {
      const tracer = createTracer()

      await expect(
        tracer.traceToolCall(
          'failing_tool',
          { input: 'bad' },
          async () => { throw new Error('Tool execution failed') },
        ),
      ).rejects.toThrow('Tool execution failed')

      const step = tracer.steps[0]
      expect(step.status).toBe('error')
      expect(step.error).toBeDefined()
      expect(step.error!.message).toBe('Tool execution failed')
    })
  })

  describe('recordResponse', () => {
    it('records a final response step', () => {
      const tracer = createTracer()

      const step = tracer.recordResponse('The answer is 42')

      expect(step.type).toBe('response')
      expect(step.status).toBe('success')
      expect(tracer.steps).toHaveLength(1)
    })

    it('captures response content and metadata', () => {
      const tracer = createTracer()

      const step = tracer.recordResponse('Final answer', { confidence: 0.95 })

      expect(step.metadata).toEqual({ confidence: 0.95 })
    })

    it('stores content in llmResponse when captureRequestData is true', () => {
      const tracer = createTracer()

      const step = tracer.recordResponse('Hello world!')

      expect(step.llmResponse).toBeDefined()
      expect(step.llmResponse!.content).toBe('Hello world!')
      expect(step.llmResponse!.finishReason).toBe('stop')
    })
  })

  describe('recordError', () => {
    it('records an error as an error step', () => {
      const tracer = createTracer()

      const step = tracer.recordError('Something went wrong')

      expect(step.type).toBe('error')
      expect(step.status).toBe('error')
      expect(step.error).toBeDefined()
      expect(step.error!.message).toBe('Something went wrong')
    })

    it('accepts Error objects', () => {
      const tracer = createTracer()

      const step = tracer.recordError(new Error('Fatal crash'))

      expect(step.error!.message).toBe('Fatal crash')
      expect(step.error!.type).toBe('unknown')
    })
  })

  describe('buildTrace', () => {
    it('returns a complete ExecutionTrace with steps sorted by sequence', async () => {
      const tracer = createTracer()

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Q' }] },
        async () => ({ choices: [{ message: { content: 'A' } }] }),
        (res) => ({
          content: 'A',
          finishReason: 'stop',
          usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 },
        }),
      )

      tracer.recordResponse('A')

      const trace = tracer.buildTrace()

      expect(trace.id).toBe(`trace_${tracer.runId}`)
      expect(trace.runId).toBe('run_test_123')
      expect(trace.steps).toHaveLength(2)
      expect(trace.steps[0].sequence).toBeLessThan(trace.steps[1].sequence)
      expect(trace.metadata).toBeDefined()
      expect(trace.metadata.agentName).toBe('unknown')
      expect(trace.metadata.environment).toBe('development')
      expect(trace.metadata.runtime).toBeDefined()
      expect(trace.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getStats', () => {
    it('returns summary statistics from steps', async () => {
      const tracer = createTracer()

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Hi' }] },
        async () => ({ choices: [{ message: { content: 'Hello' } }] }),
        (res) => ({
          content: 'Hello',
          finishReason: 'stop',
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        }),
      )

      await tracer.traceToolCall(
        'search',
        { q: 'test' },
        async () => ({ results: [] }),
      )

      const stats = tracer.getStats()

      expect(stats.totalSteps).toBe(2)
      expect(stats.llmCalls).toBe(1)
      expect(stats.toolCalls).toBe(1)
      expect(stats.errors).toBe(0)
      expect(stats.totalTokens).toBe(7)
      expect(stats.totalCost).toBeGreaterThanOrEqual(0)
      expect(stats.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('counts error steps correctly', async () => {
      const tracer = createTracer()

      tracer.recordError('an error')

      const stats = tracer.getStats()
      expect(stats.errors).toBe(1)
    })
  })

  describe('captureRequestData option', () => {
    it('suppresses request/response data when captureRequestData is false', async () => {
      const tracer = createTracer({ captureRequestData: false })

      await tracer.traceLLMCall(
        'openai', 'gpt-4o',
        { messages: [{ role: 'user', content: 'Private' }] },
        async () => ({ choices: [{ message: { content: 'OK' } }] }),
        (res) => ({
          content: 'OK',
          finishReason: 'stop',
          usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
        }),
      )

      const step = tracer.steps[0]
      expect(step.llmRequest).toBeUndefined()
      expect(step.llmResponse).toBeUndefined()
      // Still captures metrics
      expect(step.promptTokens).toBe(3)
      expect(step.cost).toBeGreaterThanOrEqual(0)
    })
  })

  describe('metadata', () => {
    it('applies custom metadata from config', () => {
      const tracer = createTracer({
        metadata: {
          agentName: 'MyAgent',
          agentVersion: '1.0.0',
          environment: 'production',
          tags: ['experiment'],
        },
      })

      expect(tracer.metadata.agentName).toBe('MyAgent')
      expect(tracer.metadata.agentVersion).toBe('1.0.0')
      expect(tracer.metadata.environment).toBe('production')
      expect(tracer.metadata.tags).toEqual(['experiment'])
    })
  })
})
