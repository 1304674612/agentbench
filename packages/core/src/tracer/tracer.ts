/**
 * Execution Tracer — captures complete agent execution traces.
 * Intercepts LLM calls, tool invocations, and responses.
 */
import type { ExecutionTrace, TraceStep, TraceStepType, StepStatus, TraceMetadata } from '../types'
import { tokenCounter, costCalculator } from '../utils/token-counter'
import { StreamCapture, type AssembledStreamResponse } from './stream-capture'

export interface TracerConfig {
  runId: string
  metadata?: Partial<TraceMetadata>
  captureRequestData?: boolean // Whether to store full request/response JSON (privacy concern)
}

let stepCounter = 0

function generateStepId(): string {
  return `step_${Date.now()}_${++stepCounter}_${Math.random().toString(36).slice(2, 8)}`
}

export class Tracer {
  public readonly runId: string
  public readonly steps: TraceStep[] = []
  public readonly metadata: TraceMetadata
  private readonly captureRequestData: boolean

  constructor(config: TracerConfig) {
    this.runId = config.runId
    this.captureRequestData = config.captureRequestData ?? true
    this.metadata = {
      agentName: config.metadata?.agentName ?? 'unknown',
      agentVersion: config.metadata?.agentVersion,
      environment: config.metadata?.environment ?? 'development',
      os: config.metadata?.os,
      runtime: `Node.js ${typeof process !== 'undefined' ? process.version : 'unknown'}`,
      tags: config.metadata?.tags,
    }
  }

  /**
   * Trace an LLM API call — wraps the actual API call.
   */
  async traceLLMCall<T>(
    provider: string,
    model: string,
    request: {
      messages: Array<{ role: string; content: string | null }>
      tools?: Array<unknown>
      temperature?: number
      max_tokens?: number
    },
    execute: () => Promise<T>,
    extractResponse: (result: T) => {
      content: string | null
      toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
      finishReason?: string
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
      model?: string
    }
  ): Promise<T> {
    const stepId = generateStepId()
    const stepStart = new Date()

    // Estimate tokens for request
    const estimatedPromptTokens = tokenCounter.estimateMessagesTokens(request.messages, provider)

    // Create the step
    const step: TraceStep = {
      id: stepId,
      sequence: this.steps.length + 1,
      type: 'llm_call' as TraceStepType,
      startedAt: stepStart,
      llmProvider: provider,
      llmModel: model,
      llmRequest: this.captureRequestData
        ? {
            provider,
            model,
            messages: request.messages.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant' | 'tool',
              content: m.content,
            })),
            tools: request.tools as unknown as Array<{
              type: 'function'
              function: {
                name: string
                description: string
                parameters: Record<string, unknown>
              }
            }>,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.max_tokens ?? 4096,
          }
        : undefined,
      promptTokens: estimatedPromptTokens,
      totalTokens: estimatedPromptTokens,
      cost: 0,
      status: 'success' as StepStatus,
      metadata: {},
    }

    try {
      // Execute the actual API call
      const result = await execute()
      const response = extractResponse(result)
      const stepEnd = new Date()

      // Calculate actual token usage
      const promptTokens = response.usage?.prompt_tokens ?? estimatedPromptTokens
      const completionTokens = response.usage?.completion_tokens ?? 0
      const totalTokens = promptTokens + completionTokens
      const cost = costCalculator.calculate(model, promptTokens, completionTokens)

      // Update step with response data
      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.llmResponse = this.captureRequestData
        ? {
            content: response.content,
            toolCalls: response.toolCalls?.map((tc) => ({
              id: tc.id,
              type: tc.type as 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
            finishReason: response.finishReason ?? 'stop',
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
            },
            model: response.model ?? model,
          }
        : undefined
      step.promptTokens = promptTokens
      step.completionTokens = completionTokens
      step.totalTokens = totalTokens
      step.cost = cost
      step.status = 'success'

      this.steps.push(step)
      return result
    } catch (error) {
      const stepEnd = new Date()
      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.status = 'error'
      step.error = {
        message: error instanceof Error ? error.message : String(error),
        type: 'api_error',
        retryable: true,
      }
      this.steps.push(step)
      throw error
    }
  }

  /**
   * Trace a streaming LLM API call — captures SSE chunks and assembles the full response.
   * The `execute` callback returns a ReadableStream that yields SSE data.
   */
  async traceLLMCallStream(
    provider: string,
    model: string,
    request: {
      messages: Array<{ role: string; content: string | null }>
      tools?: Array<unknown>
      temperature?: number
      max_tokens?: number
    },
    execute: () => Promise<ReadableStream<Uint8Array>>,
    streamType: 'openai' | 'anthropic'
  ): Promise<AssembledStreamResponse> {
    const stepId = generateStepId()
    const stepStart = new Date()

    // Estimate tokens for request
    const estimatedPromptTokens = tokenCounter.estimateMessagesTokens(request.messages, provider)

    // Create initial step
    const step: TraceStep = {
      id: stepId,
      sequence: this.steps.length + 1,
      type: 'llm_call' as TraceStepType,
      startedAt: stepStart,
      llmProvider: provider,
      llmModel: model,
      llmRequest: this.captureRequestData
        ? {
            provider,
            model,
            messages: request.messages.map((m) => ({
              role: m.role as 'system' | 'user' | 'assistant' | 'tool',
              content: m.content,
            })),
            tools: request.tools as unknown as Array<{
              type: 'function'
              function: {
                name: string
                description: string
                parameters: Record<string, unknown>
              }
            }>,
            temperature: request.temperature ?? 0.7,
            maxTokens: request.max_tokens ?? 4096,
          }
        : undefined,
      promptTokens: estimatedPromptTokens,
      totalTokens: estimatedPromptTokens,
      cost: 0,
      status: 'success' as StepStatus,
      isStreaming: true,
      metadata: {},
    }

    const capture = new StreamCapture(streamType)

    try {
      // Execute and stream through capture
      const stream = await execute()
      await capture.captureStream(stream)

      const stepEnd = new Date()
      const assembled = capture.getAssembledResponse()
      const metrics = capture.getStreamingMetrics()
      const timeToFirstToken = capture.getTimeToFirstToken()

      // Use actual usage from stream, or estimates
      const promptTokens = assembled.usage?.promptTokens ?? estimatedPromptTokens
      const completionTokens =
        assembled.usage?.completionTokens ??
        tokenCounter.estimateTokens(assembled.fullText, provider)
      const totalTokens = promptTokens + completionTokens
      const cost = costCalculator.calculate(model, promptTokens, completionTokens)

      // Update step with response data
      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.llmResponse = this.captureRequestData
        ? {
            content: assembled.fullText || null,
            toolCalls: assembled.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
            finishReason: assembled.finishReason,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens,
            },
            model,
          }
        : undefined
      step.promptTokens = promptTokens
      step.completionTokens = completionTokens
      step.totalTokens = totalTokens
      step.cost = cost
      step.status = 'success'
      step.streamChunks = metrics.chunkCount
      step.streamLatency = timeToFirstToken

      this.steps.push(step)
      return assembled
    } catch (error) {
      const stepEnd = new Date()
      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.status = 'error'
      step.error = {
        message: error instanceof Error ? error.message : String(error),
        type: 'api_error',
        retryable: true,
      }
      this.steps.push(step)
      throw error
    }
  }

  /**
   * Trace a tool call execution.
   */
  async traceToolCall<T>(
    toolName: string,
    args: Record<string, unknown>,
    execute: () => Promise<T>
  ): Promise<T> {
    const stepId = generateStepId()
    const stepStart = new Date()

    const step: TraceStep = {
      id: stepId,
      sequence: this.steps.length + 1,
      type: 'tool_call' as TraceStepType,
      startedAt: stepStart,
      toolName,
      toolRequest: this.captureRequestData ? { name: toolName, arguments: args } : undefined,
      cost: 0,
      status: 'success' as StepStatus,
      metadata: {},
    }

    try {
      const result = await execute()
      const stepEnd = new Date()

      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.toolResponse = this.captureRequestData ? { result, error: undefined } : undefined
      step.status = 'success'

      this.steps.push(step)
      return result
    } catch (error) {
      const stepEnd = new Date()
      step.endedAt = stepEnd
      step.duration = stepEnd.getTime() - stepStart.getTime()
      step.status = 'error'
      step.error = {
        message: error instanceof Error ? error.message : String(error),
        type: 'unknown',
        retryable: false,
      }
      step.toolResponse = this.captureRequestData
        ? { result: null, error: error instanceof Error ? error.message : String(error) }
        : undefined
      this.steps.push(step)
      throw error
    }
  }

  /**
   * Record a final response step.
   */
  recordResponse(content: string, metadata?: Record<string, unknown>): TraceStep {
    const stepId = generateStepId()
    const now = new Date()

    const step: TraceStep = {
      id: stepId,
      sequence: this.steps.length + 1,
      type: 'response',
      startedAt: now,
      endedAt: now,
      duration: 0,
      status: 'success',
      metadata,
    }

    if (this.captureRequestData) {
      step.llmResponse = {
        content,
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        model: 'n/a',
      }
    }

    this.steps.push(step)
    return step
  }

  /**
   * Record an error that occurred outside of LLM/Tool calls.
   */
  recordError(error: Error | string): TraceStep {
    const stepId = generateStepId()
    const now = new Date()

    const step: TraceStep = {
      id: stepId,
      sequence: this.steps.length + 1,
      type: 'error',
      startedAt: now,
      endedAt: now,
      duration: 0,
      status: 'error',
      error: {
        message: error instanceof Error ? error.message : error,
        type: 'unknown',
        retryable: false,
      },
      metadata: {},
    }

    this.steps.push(step)
    return step
  }

  /**
   * Build the complete ExecutionTrace.
   */
  buildTrace(): ExecutionTrace {
    return {
      id: `trace_${this.runId}`,
      runId: this.runId,
      steps: [...this.steps].sort((a, b) => a.sequence - b.sequence),
      metadata: this.metadata,
      createdAt: new Date(),
    }
  }

  /**
   * Get summary statistics.
   */
  getStats() {
    const llmSteps = this.steps.filter((s) => s.type === 'llm_call')
    const toolSteps = this.steps.filter((s) => s.type === 'tool_call')
    const errorSteps = this.steps.filter((s) => s.status === 'error')

    return {
      totalSteps: this.steps.length,
      llmCalls: llmSteps.length,
      toolCalls: toolSteps.length,
      errors: errorSteps.length,
      totalTokens: llmSteps.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0),
      totalCost: llmSteps.reduce((sum, s) => sum + (s.cost ?? 0), 0),
      totalDuration: this.steps.reduce((sum, s) => sum + (s.duration ?? 0), 0),
    }
  }
}
