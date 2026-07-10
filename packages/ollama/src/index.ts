/**
 * @agentbench/ollama
 *
 * Ollama provider — extends OpenAICompatibleProvider.
 * Auto-detects local Ollama instance and serves local models.
 *
 * Default Endpoint: http://localhost:11434/v1
 *
 * @packageDocumentation
 */

import {
  OpenAICompatibleProvider,
  tokenCounter,
} from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  ToolCall,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

const OLLAMA_DEFAULT_MODELS = [
  'llama3.3',
  'llama3.2',
  'llama3.1',
  'mistral',
  'codellama',
  'gemma2',
  'qwen2.5',
  'phi3',
  'deepseek-r1',
  'nomic-embed-text',
]

export class OllamaProvider extends OpenAICompatibleProvider {
  readonly id = 'ollama'
  readonly name = 'Ollama'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: true,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 131072,
    supportedModels: OLLAMA_DEFAULT_MODELS,
  }

  override async initialize(config: ProviderConfig): Promise<void> {
    this.timeout = config.timeout ?? 120000 // Local models can be slow
    this.maxRetries = config.maxRetries ?? 1
    this.apiKey = 'ollama' // Ollama doesn't require auth

    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    } else {
      // Auto-detect: try default port first, then common alternatives
      this.baseUrl = await this._autoDetectBaseUrl()
    }
  }

  /**
   * Auto-detect Ollama instance by probing common endpoints.
   */
  private async _autoDetectBaseUrl(): Promise<string> {
    const candidates = [
      'http://localhost:11434/v1',
      'http://127.0.0.1:11434/v1',
      'http://host.docker.internal:11434/v1',
      'http://ollama:11434/v1', // Docker compose service name
    ]

    for (const url of candidates) {
      try {
        const res = await fetch(`${url}/models`, {
          signal: AbortSignal.timeout(3000),
        })
        if (res.ok) return url
      } catch {
        continue
      }
    }

    // Fall back to default if auto-detection fails
    return 'http://localhost:11434/v1'
  }

  protected override buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      // Ollama doesn't require Authorization header
    }
  }

  protected adaptParams(params: ChatCompletionParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
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
    if (params.seed !== undefined) body.seed = params.seed

    // Ollama-specific options
    const options: Record<string, unknown> = {}
    if (params.temperature !== undefined) options.temperature = params.temperature
    if (params.topP !== undefined) options.top_p = params.topP
    if (params.frequencyPenalty !== undefined) options.frequency_penalty = params.frequencyPenalty
    if (params.presencePenalty !== undefined) options.presence_penalty = params.presencePenalty
    if (Object.keys(options).length > 0) {
      body.options = options
    }

    // Num predict (max tokens) as Ollama-specific
    if (params.maxTokens !== undefined) {
      if (!body.options) body.options = {}
      ;(body.options as Record<string, unknown>).num_predict = params.maxTokens
    }

    return body
  }

  protected override adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: r.id as string ?? `ollama-${Date.now()}`,
      model: r.model as string ?? 'llama3.2',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as ToolCall[] } : {}),
        },
        finishReason: (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        // Ollama provides eval_count and prompt_eval_count
        breakdown: usage ? {
          promptEvalCount: usage.prompt_eval_count ?? usage.prompt_tokens ?? 0,
          evalCount: usage.eval_count ?? usage.completion_tokens ?? 0,
          evalDuration: usage.eval_duration ?? 0,
          loadDuration: usage.load_duration ?? 0,
          totalDuration: usage.total_duration ?? 0,
        } : undefined,
      },
      created: r.created as number ?? Math.floor(Date.now() / 1000),
      provider: 'ollama',
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(_usage: Usage, _model: string): CostBreakdown {
    // Ollama is free (local models)
    return {
      promptCost: 0,
      completionCost: 0,
      totalCost: 0,
      currency: 'USD',
      model: _model,
      rates: { promptPer1K: 0, completionPer1K: 0 },
    }
  }

  override async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json().catch(() => null) as { data?: Array<{ id: string }> } | null
        const models = data?.data?.map((m) => m.id) ?? []
        // Update supported models dynamically
        if (models.length > 0) {
          this.capabilities.supportedModels = models
        }
        return {
          healthy: true,
          latency: Date.now() - start,
          message: `Connected — ${models.length} models available`,
        }
      }
      return {
        healthy: false,
        latency: Date.now() - start,
        message: `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - start,
        message: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  /**
   * List available models from the Ollama instance.
   */
  async listLocalModels(): Promise<Array<{ id: string; size: number; modified_at: string }>> {
    const res = await fetch(`${this.baseUrl.replace(/\/v1$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json() as { models?: Array<{ name: string; size: number; modified_at: string }> }
    return (data.models ?? []).map((m) => ({
      id: m.name,
      size: m.size,
      modified_at: m.modified_at,
    }))
  }

  /**
   * Get detailed info about a specific model.
   */
  async getModelInfo(modelId: string): Promise<Record<string, unknown> | null> {
    const res = await fetch(`${this.baseUrl.replace(/\/v1$/, '')}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelId }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  }
}

export async function createOllamaProvider(config: ProviderConfig = {}): Promise<OllamaProvider> {
  const provider = new OllamaProvider()
  await provider.initialize(config)
  return provider
}
