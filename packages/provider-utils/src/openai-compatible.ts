import type {
  AgentBenchProvider,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  StreamChunk,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
  ProviderCapabilities,
} from './types'

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
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ── Abstract Methods (subclass must implement) ────────────────────────────

  /** Translate unified ChatCompletionParams to provider-specific request body */
  protected abstract adaptParams(params: ChatCompletionParams): unknown

  /** Translate provider response to unified ChatCompletionResult */
  protected abstract adaptResponse(raw: unknown): ChatCompletionResult

  /** Translate provider SSE chunk to unified StreamChunk */
  protected adaptStreamChunk(raw: unknown): StreamChunk {
    // Default: assume OpenAI-compatible format
    return raw as StreamChunk
  }

  abstract countTokens(params: TokenCountParams): Promise<TokenCountResult>

  abstract calculateCost(usage: Usage, model: string): CostBreakdown

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
    } catch {
      detail = await response.text().catch(() => '')
    }
    throw new Error(
      `${this.name} API error (${response.status}): ${detail || response.statusText}`
    )
  }
}
