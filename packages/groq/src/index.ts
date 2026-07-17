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

import { OpenAICompatibleProvider } from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionResult,
  TokenCountParams,
  TokenCountResult,
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

/** Approximate tokens-per-character ratios for Groq-hosted models. */
const TOKEN_ESTIMATES: Record<string, number> = {
  'llama-3.3-70b-versatile': 4.0,
  'llama-3.3-70b-specdec': 4.0,
  'llama-3.1-8b-instant': 4.0,
  'llama-3.2-90b-vision-preview': 4.0,
  'llama-3.2-11b-vision-preview': 4.0,
  'llama-3.2-3b-preview': 4.0,
  'llama-3.2-1b-preview': 4.0,
  'mixtral-8x7b-32768': 4.0,
  'gemma2-9b-it': 4.0,
  'deepseek-r1-distill-llama-70b': 4.0,
  'deepseek-r1-distill-qwen-32b': 4.0,
}

export class GroqProvider extends OpenAICompatibleProvider {
  readonly id = 'groq'
  readonly name = 'Groq'
  readonly version = '0.5.0'
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

  /**
   * Adapt the Groq response to the unified ChatCompletionResult.
   * Groq is OpenAI-compatible, but we explicitly handle Groq-specific fields
   * such as `x_groq` metadata that may appear in streaming responses.
   */
  protected adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: (r.id as string) ?? `groq-${Date.now()}`,
      model: (r.model as string) ?? 'llama-3.3-70b-versatile',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as any[] } : {}),
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
      provider: 'groq',
    }
  }

  /**
   * Estimate token count for Groq models using character-based approximation.
   */
  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    const ratio = TOKEN_ESTIMATES[params.model] ?? 4.0
    const text =
      typeof params.messages === 'string'
        ? params.messages
        : JSON.stringify(params.messages)
    const estimatedTokens = Math.ceil(text.length / ratio)
    return {
      totalTokens: estimatedTokens,
      promptTokens: estimatedTokens,
      completionTokens: 0,
    }
  }
}

export async function createGroqProvider(config: ProviderConfig = {}): Promise<GroqProvider> {
  const provider = new GroqProvider()
  await provider.initialize(config)
  return provider
}
