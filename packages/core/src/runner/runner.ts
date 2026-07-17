/**
 * Agent Runner — the core execution engine.
 * Runs an AI agent, captures the full trace, calculates metrics.
 */
import type { RunStorage, CreateTraceStepInput } from '../storage/adapter'
import type { AgentConfig, RunInput, RunOptions, RunResult, RunMetrics, RunStatus } from '../types'
import type { TraceStep } from '../types/trace'
import { Tracer } from '../tracer/tracer'

export interface RunnerConfig {
  storage: RunStorage
  agent: AgentConfig
  input: RunInput
  options?: Partial<RunOptions>
  projectId: string
  testCaseId?: string
  userId?: string
  name: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

const DEFAULT_OPTIONS: RunOptions = {
  timeout: 120_000, // 2 minutes
  maxSteps: 50,
  retries: 0,
  concurrency: 1,
}

// ── Serialization helpers ────────────────────────────────────────────────────

/**
 * Map a domain TraceStep to a storage-layer CreateTraceStepInput.
 *
 * The storage layer uses `Record<string, unknown>` for flexible persistence
 * (Postgres JSONB, file storage, etc.). This function explicitly converts
 * typed domain fields to their serializable equivalents at the boundary
 * between the core engine and the persistence layer.
 */
function mapTraceStepToInput(step: TraceStep, runId: string): CreateTraceStepInput {
  return {
    runId,
    sequence: step.sequence,
    type: step.type,
    startedAt: step.startedAt,
    endedAt: step.endedAt,
    duration: step.duration,
    llmProvider: step.llmProvider,
    llmModel: step.llmModel,
    llmRequest: step.llmRequest as Record<string, unknown>,
    llmResponse: step.llmResponse as Record<string, unknown>,
    toolName: step.toolName,
    toolRequest: step.toolRequest as Record<string, unknown>,
    toolResponse: step.toolResponse as Record<string, unknown>,
    promptTokens: step.promptTokens,
    completionTokens: step.completionTokens,
    totalTokens: step.totalTokens,
    cost: step.cost,
    status: step.status,
    error: step.error?.message,
    metadata: step.metadata,
  }
}

/**
 * Convert typed RunMetrics to a plain record for storage.
 */
function metricsToRecord(metrics: RunMetrics): Record<string, unknown> {
  return metrics as unknown as Record<string, unknown>
}

export class Runner {
  private storage: RunStorage

  constructor(storage: RunStorage) {
    this.storage = storage
  }

  /**
   * Execute an agent run with full tracing.
   * The `execute` callback is the actual agent logic.
   *
   * @example
   * const result = await runner.run({
   *   agent: { provider: 'openai', model: 'gpt-4o', ... },
   *   input: { messages: [...] },
   *   projectId: 'proj_123',
   *   name: 'My Agent Test',
   * }, async ({ client, tracer }) => {
   *   const wrapped = wrapOpenAI(client, tracer)
   *   const response = await wrapped.chat.completions.create({ ... })
   *   return response
   * })
   */
  async run(
    config: RunnerConfig,
    execute: (context: RunContext) => Promise<unknown>
  ): Promise<RunResult> {
    const options = { ...DEFAULT_OPTIONS, ...config.options }
    const startedAt = new Date()

    // Create the run record
    const run = await this.storage.createRun({
      projectId: config.projectId,
      testCaseId: config.testCaseId,
      userId: config.userId,
      name: config.name,
      config: {
        agent: config.agent,
        input: config.input,
        options,
      },
      tags: config.tags,
      metadata: config.metadata,
    })

    // Update to running
    await this.storage.updateRun(run.id, {
      status: 'running',
      startedAt,
    })

    // Create tracer
    const tracer = new Tracer({
      runId: run.id,
      metadata: {
        agentName: config.name,
        environment: 'development',
        tags: config.tags,
      },
    })

    let status: RunStatus = 'passed'
    let error: string | undefined

    try {
      // Run with timeout
      await this.executeWithTimeout(options.timeout, async () => execute({ runId: run.id, tracer }))
    } catch (err) {
      if (err instanceof TimeoutError) {
        status = 'timeout'
        error = `Execution timed out after ${options.timeout}ms`
      } else {
        status = 'error'
        error = err instanceof Error ? err.message : String(err)
      }
      tracer.recordError(error)
    }

    const endedAt = new Date()
    const stats = tracer.getStats()

    // Compute metrics
    const metrics: RunMetrics = {
      totalTokens: stats.totalTokens,
      promptTokens: tracer.steps.reduce((sum, s) => sum + (s.promptTokens ?? 0), 0),
      completionTokens: tracer.steps.reduce((sum, s) => sum + (s.completionTokens ?? 0), 0),
      totalCost: stats.totalCost,
      totalLatency: endedAt.getTime() - startedAt.getTime(),
      firstTokenLatency: undefined, // Set by streaming capture
      toolCallCount: stats.toolCalls,
      toolSuccessCount: tracer.steps.filter((s) => s.type === 'tool_call' && s.status === 'success')
        .length,
      toolFailureCount: tracer.steps.filter((s) => s.type === 'tool_call' && s.status === 'error')
        .length,
      stepCount: stats.totalSteps,
      llmCallCount: stats.llmCalls,
    }

    // Persist trace steps in a single batch call (avoids N+1)
    const trace = tracer.buildTrace()
    if (trace.steps.length > 0) {
      await this.storage.batchCreateTraceSteps(
        trace.steps.map((step) => mapTraceStepToInput(step, run.id))
      )
    }

    // Update run with final status
    const summary =
      status === 'passed'
        ? `Completed in ${stats.totalSteps} steps, ${stats.totalTokens} tokens, $${stats.totalCost.toFixed(4)}`
        : `Failed: ${error}`

    await this.storage.updateRun(run.id, {
      status,
      metrics: metricsToRecord(metrics),
      endedAt,
      duration: endedAt.getTime() - startedAt.getTime(),
      summary,
      error,
    })

    const result: RunResult = {
      id: run.id,
      config: {
        name: config.name,
        projectId: config.projectId,
        testCaseId: config.testCaseId,
        agent: config.agent,
        input: config.input,
        options,
        tags: config.tags,
        metadata: config.metadata,
      },
      status,
      trace,
      metrics,
      scores: [],
      assertionResults: [],
      startedAt,
      endedAt,
      duration: endedAt.getTime() - startedAt.getTime(),
      summary,
      error,
    }

    return result
  }

  /**
   * Run multiple agents concurrently.
   */
  async runBatch(
    configs: RunnerConfig[],
    execute: (context: RunContext, config: RunnerConfig) => Promise<unknown>
  ): Promise<RunResult[]> {
    const results = await Promise.allSettled(
      configs.map((config) => this.run(config, (ctx) => execute(ctx, config)))
    )

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      return {
        id: `error_${i}`,
        config: {
          name: configs[i].name,
          projectId: configs[i].projectId,
          testCaseId: configs[i].testCaseId,
          agent: configs[i].agent,
          input: configs[i].input,
          options: { ...DEFAULT_OPTIONS, ...configs[i].options },
          tags: configs[i].tags,
          metadata: configs[i].metadata,
        },
        status: 'error' as RunStatus,
        trace: {
          id: `error_${i}`,
          runId: `error_${i}`,
          steps: [],
          metadata: { agentName: configs[i].name, environment: 'development' },
          createdAt: new Date(),
        },
        metrics: {
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          totalCost: 0,
          totalLatency: 0,
          toolCallCount: 0,
          toolSuccessCount: 0,
          toolFailureCount: 0,
          stepCount: 0,
          llmCallCount: 0,
        },
        scores: [],
        assertionResults: [],
        startedAt: new Date(),
        endedAt: new Date(),
        duration: 0,
        error: r.status === 'rejected' ? String(r.reason) : 'Unknown error',
      }
    })
  }

  private async executeWithTimeout<T>(ms: number, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Timeout after ${ms}ms`))
      }, ms)

      fn()
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Context passed to the agent execution callback.
 */
export interface RunContext {
  runId: string
  tracer: Tracer
}
