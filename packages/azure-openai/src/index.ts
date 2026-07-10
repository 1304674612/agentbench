/**
 * @agentbench/azure-openai
 *
 * Azure OpenAI provider — extends OpenAICompatibleProvider.
 * Uses Azure AD auth or API key authentication with deployment-based endpoints.
 *
 * Endpoint: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version={version}
 *
 * @packageDocumentation
 */

import {
  OpenAICompatibleProvider,
  tokenCounter,
  costCalculator,
} from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
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
} from '@agentbench/provider-utils'

const AZURE_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o3-mini',
]

export class AzureOpenAIProvider extends OpenAICompatibleProvider {
  readonly id = 'azure-openai'
  readonly name = 'Azure OpenAI'
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
    supportedModels: AZURE_OPENAI_MODELS,
  }

  private resource = ''
  private deployment = ''
  private apiVersion = '2024-12-01-preview'
  private useADAuth = false

  override async initialize(config: ProviderConfig): Promise<void> {
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 60000
    this.maxRetries = config.maxRetries ?? 3

    // Extract Azure-specific config
    this.resource = (config.extra?.resource as string) ?? ''
    this.deployment = (config.extra?.deployment as string) ?? config.defaultModel ?? ''
    this.apiVersion = (config.extra?.apiVersion as string) ?? '2024-12-01-preview'
    this.useADAuth = (config.extra?.useADAuth as boolean) ?? false

    // Construct base URL from resource + deployment
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    } else if (this.resource && this.deployment) {
      this.baseUrl = `https://${this.resource}.openai.azure.com/openai/deployments/${this.deployment}`
    }
  }

  protected override buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.useADAuth) {
      // Azure AD auth: Bearer token with Entra ID
      headers['Authorization'] = `Bearer ${this.apiKey}`
    } else {
      // API Key auth
      headers['api-key'] = this.apiKey
    }

    return headers
  }

  /**
   * Get the full chat completions endpoint with api-version.
   */
  private getChatCompletionsUrl(): string {
    const base = this.baseUrl.replace(/\/+$/, '')
    return `${base}/chat/completions?api-version=${this.apiVersion}`
  }

  protected adaptParams(params: ChatCompletionParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      // Note: Azure uses the deployment name, not the model name in the body
      // The deployment already maps to a specific model
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

    // Azure content filter
    if (params.extra?.contentFilter) {
      body.content_filter = params.extra.contentFilter
    }

    return body
  }

  protected override adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: r.id as string ?? `azure-${Date.now()}`,
      model: r.model as string ?? this.deployment,
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as ToolCall[] } : {}),
        },
        finishReason: (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
        // Azure content filter results
        ...(c.content_filter_results ? { content_filter_results: c.content_filter_results } : {}),
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      created: r.created as number ?? Math.floor(Date.now() / 1000),
      provider: 'azure-openai',
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    // Azure pricing is same as OpenAI
    return costCalculator.calculateCost(usage, model)
  }

  override async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(this.getChatCompletionsUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(15000),
      })
      // 401/403 mean auth is working but missing scope; 200/400 mean API is reachable
      return {
        healthy: res.ok || res.status === 400,
        latency: Date.now() - start,
        message: res.ok ? 'Connected' : `HTTP ${res.status} — ${res.statusText}`,
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
   * Override createChatCompletion to use Azure-specific endpoint.
   */
  override async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const body = this.adaptParams({ ...params, stream: false })
    const response = await this.fetchWithRetry(this.getChatCompletionsUrl(), {
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

  /**
   * Override streaming to use Azure-specific endpoint.
   */
  override async *createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined> {
    const body = this.adaptParams({ ...params, stream: true })
    const response = await this.fetchWithRetry(this.getChatCompletionsUrl(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) await this.handleError(response)
    if (!response.body) throw new Error('Streaming response has no body')

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
            yield JSON.parse(data) as StreamChunk
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

export async function createAzureOpenAIProvider(config: ProviderConfig = {}): Promise<AzureOpenAIProvider> {
  const provider = new AzureOpenAIProvider()
  await provider.initialize(config)
  return provider
}
