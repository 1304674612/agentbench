/**
 * @agentbench/groq
 *
 * Groq provider — extends OpenAICompatibleProvider.
 * Ultra-fast inference via Groq's LPU-powered API.
 *
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
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
  ToolCall,
} from '@agentbench/provider-utils'

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.3-70b-specdec',
  'llama-3.1-8b-instant',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-qwen-32b',
]

export class GroqProvider extends OpenAICompatibleProvider {
  readonly id = 'groq'
  readonly name = 'Groq'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: false,
    embeddings: false,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 131072,
    supportedModels: GROQ_MODELS,
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl ?? 'https://api.groq.com/openai/v1'
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 30000 // Groq is fast — shorter timeout
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

  protected adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: r.id as string ?? `groq-${Date.now()}`,
      model: r.model as string ?? 'llama-3.3-70b-versatile',
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
      },
      created: r.created as number ?? Math.floor(Date.now() / 1000),
      provider: 'groq',
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return tokenCounter.countTokens(params)
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    return costCalculator.calculateCost(usage, model)
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
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

export async function createGroqProvider(config: ProviderConfig = {}): Promise<GroqProvider> {
  const provider = new GroqProvider()
  await provider.initialize(config)
  return provider
}
