/**
 * @agentbench/deepseek
 *
 * DeepSeek provider — extends OpenAICompatibleProvider.
 * Supports reasoning models (deepseek-reasoner) with `reasoning_content` in responses.
 *
 * Endpoint: https://api.deepseek.com/v1/chat/completions
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

  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

const DEEPSEEK_MODELS = [
  'deepseek-chat',
  'deepseek-reasoner',
]

export class DeepSeekProvider extends OpenAICompatibleProvider {
  readonly id = 'deepseek'
  readonly name = 'DeepSeek'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: false,
    toolCalling: true,
    vision: false,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 65536,
    supportedModels: DEEPSEEK_MODELS,
  }

  override async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1'
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 60000
    this.maxRetries = config.maxRetries ?? 2
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

    // DeepSeek supports temperature but reasoner ignores it
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

    return body
  }

  protected override adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: r.id as string ?? `deepseek-${Date.now()}`,
      model: r.model as string ?? 'deepseek-chat',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.reasoning_content ? { reasoning_content: message.reasoning_content as string } : {}),
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as unknown[] } : {}),
        } as any,
        finishReason: (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      created: r.created as number ?? Math.floor(Date.now() / 1000),
      provider: 'deepseek',
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    return costCalculator.calculateCost(usage, model)
  }

  override async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
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
 * Create a configured DeepSeek provider instance.
 *
 * @example
 * ```ts
 * const deepseek = await createDeepSeekProvider({ apiKey: 'sk-...' })
 * ```
 */
export async function createDeepSeekProvider(
  config: ProviderConfig = {}
): Promise<DeepSeekProvider> {
  const provider = new DeepSeekProvider()
  await provider.initialize(config)
  return provider
}
