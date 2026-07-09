/**
 * @agentbench/anthropic
 *
 * Anthropic Claude SDK wrapper with automatic tracing.
 * Intercepts messages.create calls to capture traces, count tokens, and calculate costs.
 */

import type { TraceStep } from '@agentbench/core'
import { tokenCounter, costCalculator } from '@agentbench/core'

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

export class AgentBenchAnthropic {
  public config: AgentBenchAnthropicConfig
  private _context: AnthropicInterceptContext = {}

  constructor(config: AgentBenchAnthropicConfig) {
    this.config = { tracing: true, timeout: 60000, maxRetries: 2, anthropicVersion: '2023-06-01', ...config }
  }

  setContext(ctx: AnthropicInterceptContext): void { this._context = ctx }

  async createMessage(params: {
    model: string
    system?: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    max_tokens: number
    temperature?: number
    tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
    stop_sequences?: string[]
  }): Promise<AnthropicMessageResult> {
    const startTime = Date.now()
    const traceStep: Partial<TraceStep> = {
      type: 'llm_call',
      startedAt: new Date(startTime),
      llmProvider: 'anthropic',
      llmModel: params.model,
    }

    try {
      const response = await this._callAnthropic(params)
      const endTime = Date.now()

      // Count tokens
      const inputText = params.messages.map((m) => m.content).join('\n') + (params.system ?? '')
      const outputText = response.content?.map((b) => b.text).join('\n') ?? ''
      const promptTokens = response.usage?.input_tokens ?? tokenCounter.count(inputText)
      const completionTokens = response.usage?.output_tokens ?? tokenCounter.count(outputText)
      const totalTokens = promptTokens + completionTokens
      const cost = costCalculator.calculate({
        provider: 'anthropic',
        model: params.model,
        promptTokens,
        completionTokens,
      })

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
        content_blocks: response.content,
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
  }): AsyncGenerator<AnthropicStreamChunk> {
    const startTime = Date.now()
    let fullContent = ''

    try {
      const stream = await this._callAnthropicStream(params)
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullContent += event.delta.text
          yield { content: event.delta.text, fullContent, type: 'text' }
        }
      }

      const endTime = Date.now()
      if (this._context.onStep) {
        const promptTokens = tokenCounter.count(params.messages.map((m) => m.content).join('\n'))
        const completionTokens = tokenCounter.count(fullContent)
        const cost = costCalculator.calculate({ provider: 'anthropic', model: params.model, promptTokens, completionTokens })
        this._context.onStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sequence: 0, type: 'response',
          startedAt: new Date(startTime), endedAt: new Date(endTime), duration: endTime - startTime,
          llmResponse: { content: fullContent, finishReason: 'end_turn', usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }, model: params.model },
          promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, cost, status: 'success',
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
      sequence: 0, type: 'error',
      startedAt: new Date(startTime), endedAt: new Date(endTime), duration: endTime - startTime,
      status: 'error',
      error: { message: err instanceof Error ? err.message : String(err), type: 'api_error', retryable: true },
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
        throw new Error(`Anthropic API error ${res.status}: ${(errBody as { error?: { message?: string } }).error?.message ?? res.statusText}`)
      }
      return (await res.json()) as AnthropicAPIResponse
    } finally { clearTimeout(timeoutId) }
  }

  private async *_callAnthropicStream(body: Record<string, unknown>): AsyncGenerator<AnthropicStreamEvent> {
    const url = `${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': this.config.anthropicVersion ?? '2023-06-01',
      },
      body: JSON.stringify({ ...body, stream: true }),
    })
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try { yield JSON.parse(data) as AnthropicStreamEvent } catch { /* skip */ }
      }
    }
  }
}

export interface AnthropicMessageResult {
  id: string; model: string; content: string
  content_blocks: Array<{ type: string; text: string }>
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
  cost: number; duration: number; trace: TraceStep
}

export interface AnthropicStreamChunk {
  content: string; fullContent: string; type: string
}

interface AnthropicAPIResponse {
  id: string; model: string
  content?: Array<{ type: string; text: string }>
  stop_reason?: string
  usage?: { input_tokens: number; output_tokens: number }
}

interface AnthropicStreamEvent {
  type: string
  delta?: { text?: string }
}

export function createAnthropicClient(config: AgentBenchAnthropicConfig): AgentBenchAnthropic {
  return new AgentBenchAnthropic(config)
}
