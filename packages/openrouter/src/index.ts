/**
 * @agentbench/openrouter
 *
 * OpenRouter provider — extends OpenAICompatibleProvider.
 * Multi-model pass-through gateway to 200+ models.
 *
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
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
  ToolCall,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

const OPENROUTER_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/o1',
  'openai/o3-mini',
  'anthropic/claude-sonnet-4-20250514',
  'anthropic/claude-opus-4-20250514',
  'anthropic/claude-haiku-4-5-20251001',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-chat',
  'deepseek/deepseek-reasoner',
  'mistralai/mistral-large-2411',
  'mistralai/mistral-small-2501',
  'x-ai/grok-2-1212',
  'cohere/command-r-plus',
]

export class OpenRouterProvider extends OpenAICompatibleProvider {
  readonly id = 'openrouter'
  readonly name = 'OpenRouter'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: false,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 200000,
    supportedModels: OPENROUTER_MODELS,
  }

  private appName = 'agentbench'
  private siteUrl = ''

  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl ?? 'https://openrouter.ai/api/v1'
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 120000 // OpenRouter can be slower
    this.maxRetries = config.maxRetries ?? 2
    this.appName = (config.extra?.appName as string) ?? 'agentbench'
    this.siteUrl = (config.extra?.siteUrl as string) ?? ''
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': this.siteUrl || 'https://github.com/agentbench',
      'X-Title': this.appName,
    }
    return headers
  }

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

    // OpenRouter-specific: transforms array for provider routing preferences
    if (params.extra?.transforms) {
      body.transforms = params.extra.transforms
    }
    // OpenRouter-specific: max_price for cost control
    if (params.extra?.max_price) {
      body.max_price = params.extra.max_price
    }

    return body
  }

  protected adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: r.id as string ?? `or-${Date.now()}`,
      model: r.model as string ?? 'openai/gpt-4o',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.reasoning ? { reasoning_content: message.reasoning as string } : {}),
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as ToolCall[] } : {}),
        },
        finishReason: (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        // OpenRouter includes cost info
        breakdown: {
          ...(usage?.prompt_tokens_details ? { promptDetails: usage.prompt_tokens_details as number } : {}),
          ...(usage?.completion_tokens_details ? { completionDetails: usage.completion_tokens_details as number } : {}),
        },
      },
      created: r.created as number ?? Math.floor(Date.now() / 1000),
      provider: 'openrouter',
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    // Strip OpenRouter prefix for pricing lookup
    const cleanModel = model.includes('/') ? model.split('/').slice(1).join('/') : model
    return costCalculator.calculateCost(usage, cleanModel)
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
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
}

/**
 * Create a configured OpenRouter provider instance.
 *
 * @example
 * ```ts
 * const openrouter = await createOpenRouterProvider({
 *   apiKey: 'sk-or-...',
 *   extra: { siteUrl: 'https://example.com', appName: 'My App' },
 * })
 * ```
 */
export async function createOpenRouterProvider(
  config: ProviderConfig = {}
): Promise<OpenRouterProvider> {
  const provider = new OpenRouterProvider()
  await provider.initialize(config)
  return provider
}
