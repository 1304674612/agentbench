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

import { OpenAICompatibleProvider } from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionResult,
} from '@agentbench/provider-utils'

const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner']

export class DeepSeekProvider extends OpenAICompatibleProvider {
  readonly id = 'deepseek'
  readonly name = 'DeepSeek'
  readonly version = '0.5.0'
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

  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl ?? 'https://api.deepseek.com/v1'
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 60000
    this.maxRetries = config.maxRetries ?? 2
  }

  protected adaptResponse(raw: unknown): ChatCompletionResult {
    const r = raw as Record<string, unknown>
    const choices = (r.choices as Array<Record<string, unknown>>) ?? []
    const usage = r.usage as Record<string, number> | undefined
    const message = choices[0]?.message as Record<string, unknown> | undefined

    return {
      id: (r.id as string) ?? `deepseek-${Date.now()}`,
      model: (r.model as string) ?? 'deepseek-chat',
      choices: choices.map((c, i) => ({
        index: i,
        message: {
          role: (message?.role as 'assistant') ?? 'assistant',
          content: (message?.content as string) ?? null,
          ...(message?.reasoning_content
            ? { reasoning_content: message.reasoning_content as string }
            : {}),
          ...(message?.tool_calls ? { tool_calls: message.tool_calls as unknown[] } : {}),
        } as any,
        finishReason:
          (c.finish_reason as ChatCompletionResult['choices'][0]['finishReason']) ?? null,
      })),
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      created: (r.created as number) ?? Math.floor(Date.now() / 1000),
      provider: 'deepseek',
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
