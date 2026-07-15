/**
 * @agentbench/anthropic
 *
 * Anthropic Claude SDK wrapper with automatic tracing.
 * Intercepts messages.create calls to capture traces, count tokens, and calculate costs.
 */

import type { TraceStep } from '@agentbench/core'
import { tokenCounter, costCalculator, StreamCapture } from '@agentbench/core'
import type {
  ChatMessage,
  ProviderCapabilities,
  ProviderConfig,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

export interface AgentBenchAnthropicConfig {
  apiKey: string
  baseURL?: string
  tracing?: boolean
  timeout?: number
  maxRetries?: number
  /** Anthropic API version */
  anthropicVersion?: string
}

export interface AnthropicInterceptContext {
  runId?: string
  onStep?: (step: TraceStep) => void
}

const ANTHROPIC_MODELS = [
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-haiku-4-5',
  'claude-3-5-sonnet',
  'claude-3-5-haiku',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
]

export class AgentBenchAnthropic {
  // ── AgentBenchProvider identity ──────────────────────────────────────────
  readonly id = 'anthropic'
  readonly name = 'Anthropic'
  readonly version = '0.5.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: false,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: false,
    maxContextWindow: 200000,
    supportedModels: ANTHROPIC_MODELS,
  }
  public config: AgentBenchAnthropicConfig
  private _context: AnthropicInterceptContext = {}

  constructor(config: AgentBenchAnthropicConfig) {
    this.config = {
      tracing: true,
      timeout: 60000,
      maxRetries: 2,
      anthropicVersion: '2023-06-01',
      ...config,
    }
  }

  setContext(ctx: AnthropicInterceptContext): void {
    this._context = ctx
  }

  async createMessage(params: {
    model: string
    system?: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    max_tokens: number
    temperature?: number
    tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
    stop_sequences?: string[]
    /** Extended thinking support: enable thinking with budget_tokens */
    thinking?: { type: 'enabled'; budget_tokens: number }
  }): Promise<AnthropicMessageResult> {
    const startTime = Date.now()

    try {
      // Build request body with extended thinking support
      const requestBody: Record<string, unknown> = { ...params }
      if (params.thinking) {
        requestBody.thinking = params.thinking
      }
      const response = await this._callAnthropic(requestBody)
      const endTime = Date.now()

      // Count tokens
      const inputText = params.messages.map((m) => m.content).join('\n') + (params.system ?? '')
      const outputText = response.content?.map((b) => b.text).join('\n') ?? ''
      const promptTokens = response.usage?.input_tokens ?? tokenCounter.estimateTokens(inputText)
      const completionTokens =
        response.usage?.output_tokens ?? tokenCounter.estimateTokens(outputText)
      const totalTokens = promptTokens + completionTokens
      const cost = costCalculator.calculate(params.model, promptTokens, completionTokens)

      const completedStep: TraceStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'llm_call',
        startedAt: new Date(startTime),
        endedAt: new Date(endTime),
        duration: endTime - startTime,
        llmProvider: 'anthropic',
        llmModel: params.model,
        llmRequest: {
          provider: 'anthropic',
          model: params.model,
          messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
          temperature: params.temperature ?? 0.7,
          maxTokens: params.max_tokens,
        },
        llmResponse: {
          content: outputText,
          finishReason: response.stop_reason ?? 'end_turn',
          usage: { promptTokens, completionTokens, totalTokens },
          model: params.model,
        },
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        status: 'success',
      } as TraceStep

      this._context.onStep?.(completedStep)

      return {
        id: response.id,
        model: response.model,
        content: outputText,
        content_blocks: response.content ?? [],
        stop_reason: response.stop_reason ?? 'end_turn',
        usage: { input_tokens: promptTokens, output_tokens: completionTokens },
        cost,
        duration: endTime - startTime,
        trace: completedStep,
      }
    } catch (err) {
      this._emitError(startTime, err)
      throw err
    }
  }

  async *createStreamingMessage(params: {
    model: string
    system?: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    max_tokens: number
    temperature?: number
    tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
  }): AsyncGenerator<AnthropicStreamChunk> {
    const startTime = Date.now()

    try {
      const stream = await this._callAnthropicStreamRaw(params)
      const capture = new StreamCapture('anthropic')
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let lastFullText = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          capture.processChunk(text)

          const assembled = capture.getAssembledResponse()
          const newText = assembled.fullText.slice(lastFullText.length)
          lastFullText = assembled.fullText

          const toolCallsInfo =
            assembled.toolCalls.length > 0
              ? assembled.toolCalls.map((tc, idx) => ({
                  index: idx,
                  id: tc.id,
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                }))
              : undefined

          yield {
            content: newText,
            fullContent: assembled.fullText,
            type: newText ? 'text' : 'tool_use',
            toolCalls: toolCallsInfo,
          }
        }
      } finally {
        reader.releaseLock()
      }

      const endTime = Date.now()
      const assembled = capture.getAssembledResponse()
      const metrics = capture.getStreamingMetrics()
      const streamLatency = capture.getTimeToFirstToken()

      if (this._context.onStep) {
        const inputText = params.messages.map((m) => m.content).join('\n') + (params.system ?? '')
        const promptTokens = assembled.usage?.promptTokens ?? tokenCounter.estimateTokens(inputText)
        const completionTokens =
          assembled.usage?.completionTokens ?? tokenCounter.estimateTokens(assembled.fullText)
        const totalTokens = assembled.usage?.totalTokens ?? promptTokens + completionTokens
        const cost = costCalculator.calculate(params.model, promptTokens, completionTokens)

        const assembledToolCalls = assembled.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }))

        this._context.onStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sequence: 0,
          type: 'llm_call',
          startedAt: new Date(startTime),
          endedAt: new Date(endTime),
          duration: endTime - startTime,
          llmProvider: 'anthropic',
          llmModel: params.model,
          llmRequest: {
            provider: 'anthropic',
            model: params.model,
            messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: params.temperature ?? 0.7,
            maxTokens: params.max_tokens,
          },
          llmResponse: {
            content: assembled.fullText || null,
            toolCalls: assembledToolCalls.length > 0 ? assembledToolCalls : undefined,
            finishReason: assembled.finishReason,
            usage: { promptTokens, completionTokens, totalTokens },
            model: params.model,
          },
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          status: 'success',
          isStreaming: true,
          streamChunks: metrics.chunkCount,
          streamLatency,
        } as TraceStep)
      }
    } catch (err) {
      this._emitError(startTime, err)
      throw err
    }
  }

  private _emitError(startTime: number, err: unknown): void {
    const endTime = Date.now()
    this._context.onStep?.({
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sequence: 0,
      type: 'error',
      startedAt: new Date(startTime),
      endedAt: new Date(endTime),
      duration: endTime - startTime,
      status: 'error',
      error: {
        message: err instanceof Error ? err.message : String(err),
        type: 'api_error',
        retryable: true,
      },
    } as TraceStep)
  }

  private async _callAnthropic(body: Record<string, unknown>): Promise<AnthropicAPIResponse> {
    const url = `${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.config.anthropicVersion ?? '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(
          `Anthropic API error ${res.status}: ${(errBody as { error?: { message?: string } }).error?.message ?? res.statusText}`
        )
      }
      return (await res.json()) as AnthropicAPIResponse
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ── AgentBenchProvider Lifecycle ─────────────────────────────────────────

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.apiKey) this.config.apiKey = config.apiKey
    if (config.baseUrl) this.config.baseURL = config.baseUrl
    if (config.timeout) this.config.timeout = config.timeout
    if (config.maxRetries !== undefined) this.config.maxRetries = config.maxRetries
    if (config.extra?.anthropicVersion)
      this.config.anthropicVersion = config.extra.anthropicVersion as string
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    const text =
      typeof params.text === 'string'
        ? params.text
        : (params.messages
            ?.map((m: ChatMessage) => (typeof m.content === 'string' ? m.content : ''))
            .join('\n') ?? '')
    return {
      tokens: tokenCounter.estimateTokens(text, 'anthropic'),
      model: params.model,
      method: 'heuristic',
    }
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    const pricing = costCalculator.getPricing(model)
    const promptCost = (usage.promptTokens / 1_000_000) * pricing.input
    const completionCost = (usage.completionTokens / 1_000_000) * pricing.output
    return {
      promptCost,
      completionCost,
      totalCost: promptCost + completionCost,
      currency: 'USD',
      model,
      rates: { promptPer1K: pricing.input / 1000, completionPer1K: pricing.output / 1000 },
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.config.anthropicVersion ?? '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(10000),
      })
      return {
        healthy: res.ok || res.status === 400,
        latency: Date.now() - start,
        message: res.ok ? 'Connected' : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - start,
        message: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async dispose(): Promise<void> {
    this._context = {}
  }

  // ── Extended Thinking Support ────────────────────────────────────────────

  /**
   * Check if the model supports extended thinking.
   * Claude 3.5 Sonnet, Claude 3 Opus, and all Claude 4 models support it.
   */
  supportsExtendedThinking(model: string): boolean {
    return (
      model.includes('claude-3-5-sonnet') ||
      model.includes('claude-3-opus') ||
      model.includes('claude-4') ||
      model.includes('claude-sonnet-4') ||
      model.includes('claude-opus-4') ||
      model.includes('claude-haiku-4')
    )
  }

  private async _callAnthropicStreamRaw(
    body: Record<string, unknown>
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': this.config.anthropicVersion ?? '2023-06-01',
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: { message?: string }
        }
        throw new Error(
          `Anthropic API error ${res.status}: ${errBody.error?.message ?? res.statusText}`
        )
      }

      if (!res.body) {
        throw new Error('No response body for streaming')
      }

      return res.body
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export interface AnthropicMessageResult {
  id: string
  model: string
  content: string
  content_blocks: Array<{ type: string; text: string }>
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
  cost: number
  duration: number
  trace: TraceStep
}

export interface AnthropicStreamChunk {
  content: string
  fullContent: string
  type: string
  /** Tool call deltas accumulated so far (for streaming tool calls) */
  toolCalls?: Array<{
    index: number
    id: string
    name: string
    arguments: string
  }>
}

interface AnthropicAPIResponse {
  id: string
  model: string
  content?: Array<{ type: string; text: string; thinking?: string }>
  stop_reason?: string
  usage?: { input_tokens: number; output_tokens: number }
}

// ============================================================
// Type alias — Provider S suffix convention
// ============================================================

export { AgentBenchAnthropic as AnthropicProvider }

// ============================================================
// Factory function
// ============================================================

export function createAnthropicProvider(config: AgentBenchAnthropicConfig): AgentBenchAnthropic {
  return new AgentBenchAnthropic(config)
}

/** @deprecated Use {@link createAnthropicProvider} instead */
export const createAnthropicClient = createAnthropicProvider
