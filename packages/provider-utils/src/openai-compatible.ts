import type {
  AgentBenchProvider,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  StreamChunk,
  ToolCall,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
  ProviderCapabilities,
} from './types'
import { tokenCounter } from './token-counter'
import { costCalculator } from './cost-calculator'

/**
 * Base class for any provider that speaks the OpenAI Chat Completions API format.
 *
 * Most providers (Ollama, vLLM, LM Studio, Groq, OpenRouter, DeepSeek, Azure OpenAI)
 * implement the OpenAI-compatible `/chat/completions` endpoint. This base class
 * handles all the HTTP plumbing — subclasses only need to override:
 *
 * - `id`, `name`, `capabilities` — identity and feature flags
 * - `adaptParams()` — translate unified params to provider-specific format
 * - `adaptResponse()` — translate provider response to unified format
 * - `countTokens()` — token counting logic
 * - `calculateCost()` — pricing model
 *
 * @example
 * ```ts
 * class GroqProvider extends OpenAICompatibleProvider {
 *   readonly id = 'groq'
 *   readonly name = 'Groq'
 *   readonly capabilities = { streaming: true, reasoning: false, ... }
 *
 *   protected adaptParams(params) { return params } // Groq is fully OpenAI-compatible
 *   protected adaptResponse(raw) { return raw }
 *   async countTokens(params) { ... }
 *   calculateCost(usage, model) { ... }
 * }
 * ```
 */
export abstract class OpenAICompatibleProvider implements AgentBenchProvider {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly version: string
  abstract readonly capabilities: ProviderCapabilities

  protected baseUrl = 'https://api.openai.com/v1'
  protected apiKey = ''
  protected timeout = 60000
  protected maxRetries = 2

  // ── Initialization ────────────────────────────────────────────────────────

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.baseUrl) this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    if (config.apiKey) this.apiKey = config.apiKey
    if (config.timeout) this.timeout = config.timeout
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(10000),
      })
      return {
        healthy: res.ok,
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
    // No-op by default. Override if provider needs cleanup.
  }

  // ── Core Methods ──────────────────────────────────────────────────────────

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const body = this.adaptParams({ ...params, stream: false })
    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const raw = await response.json()
    return this.adaptResponse(raw)
  }

  async *createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined> {
    const body = this.adaptParams({ ...params, stream: true })
    const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    if (!response.body) {
      throw new Error('Streaming response has no body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const json = JSON.parse(data)
            yield this.adaptStreamChunk(json)
          } catch (error) {
            console.error('[OPENAI-COMPATIBLE] Failed to parse SSE chunk:', error)
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ── Overridable Methods (defaults for OpenAI-compatible providers) ─────────

  /**
   * Translate unified ChatCompletionParams to provider-specific request body.
   *
   * Default implementation handles the common OpenAI-compatible mapping.
   * Override for provider-specific fields (e.g. Ollama options, OpenRouter transforms).
   */
  protected adaptParams(params: ChatCompletionParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      stream: params.stream ?? false,
    }

    if (params.temperature !== undefined) body.temperature = params.temperature
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens
    if (params.topP !== undefined) body.top_p = params.topP
    if (params.stop) body.stop = params.stop
    if (params.tools) {
      body.tools = params.tools
      body.tool_choice = params.toolChoice ?? 'auto'
    }
    if (params.responseFormat?.type === 'json_object') {
      body.response_format = { type: 'json_object' }
    }
    if (params.frequencyPenalty !== undefined) body.frequency_penalty = params.frequencyPenalty
    if (params.presencePenalty !== undefined) body.presence_penalty = params.presencePenalty
    if (params.seed !== undefined) body.seed = params.seed

    return body
  }

  /**
   * Translate provider response to unified ChatCompletionResult.
   *
   * Default implementation handles the standard OpenAI response format.
   * Override for provider-specific fields (e.g. reasoning_content, content_filter_results).
   */
  protected adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: (r.id as string) ?? `${this.id}-${Date.now()}`,
      model: (r.model as string) ?? '',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as ToolCall[] } : {}),
        },
        finishReason:
          (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      created: (r.created as number) ?? Math.floor(Date.now() / 1000),
      provider: this.id,
    }
  }

  /** Translate provider SSE chunk to unified StreamChunk */
  protected adaptStreamChunk(raw: unknown): StreamChunk {
    // Default: assume OpenAI-compatible format
    return raw as StreamChunk
  }

  /** Count tokens for the given params. Default: delegates to tokenCounter. */
  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  /** Calculate cost for the given usage and model. Default: delegates to costCalculator. */
  calculateCost(usage: Usage, model: string): CostBreakdown {
    return costCalculator.calculateCost(usage, model)
  }

  // ── Internal Helpers ──────────────────────────────────────────────────────

  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  protected async fetchWithRetry(
    url: string,
    init: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, init)
        // Don't retry client errors (4xx) except 429 (rate limit)
        if (response.status < 500 && response.status !== 429) {
          return response
        }
        if (attempt < retries) {
          const delay = Math.min(1000 * 2 ** attempt, 30000)
          await new Promise((r) => setTimeout(r, delay))
        }
        return response
      } catch (err) {
        if (attempt >= retries) throw err
        const delay = Math.min(1000 * 2 ** attempt, 30000)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`)
  }

  protected async handleError(response: Response): Promise<never> {
    let detail = ''
    try {
      const body = await response.json()
      detail = JSON.stringify(body)
    } catch (error) {
      console.error('[OPENAI-COMPATIBLE] Failed to parse error response body:', error)
      detail = await response.text().catch(() => '')
    }
    throw new Error(`${this.name} API error (${response.status}): ${detail || response.statusText}`)
  }
}
