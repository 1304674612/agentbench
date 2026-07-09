/**
 * Anthropic SDK Interceptor — wraps the Anthropic client for automatic tracing.
 *
 * Usage:
 *   import Anthropic from '@anthropic-ai/sdk'
 *   import { wrapAnthropic } from '@agentbench/core/tracer'
 *
 *   const client = wrapAnthropic(new Anthropic(), tracer)
 *   const response = await client.messages.create({ ... })
 *   // Automatically traced!
 */
import type { Tracer } from '../tracer'

export interface WrappedAnthropic {
  messages: {
    create: (
      params: AnthropicMessageParams
    ) => Promise<AnthropicMessageResponse>
  }
}

interface AnthropicMessageParams {
  model: string
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>
  tools?: Array<{
    name: string
    description?: string
    input_schema: Record<string, unknown>
  }>
  system?: string
  temperature?: number
  max_tokens: number
  stream?: boolean
}

interface AnthropicMessageResponse {
  id: string
  model: string
  content: Array<{
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }>
  stop_reason: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * Wrap an Anthropic-compatible client for automatic tracing.
 */
export function wrapAnthropic(
  client: { messages: { create: Function } },
  tracer: Tracer
): WrappedAnthropic {
  return {
    messages: {
      create: async (params: AnthropicMessageParams): Promise<AnthropicMessageResponse> => {
        // Extract text content from messages for token estimation
        const normalizedMessages = params.messages.map((m) => {
          if (typeof m.content === 'string') return { role: m.role, content: m.content }
          // Anthropic content blocks
          const textBlocks = m.content.filter((c) => c.type === 'text')
          return { role: m.role, content: textBlocks.map((b) => b.text ?? '').join('\n') }
        })

        // Add system prompt as a message
        if (params.system) {
          normalizedMessages.unshift({ role: 'system', content: params.system })
        }

        // Transform tools to OpenAI-compatible format for tracer
        const openAITools = params.tools?.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          },
        }))

        return tracer.traceLLMCall(
          'anthropic',
          params.model,
          {
            messages: normalizedMessages,
            tools: openAITools,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
          },
          async () => {
            return client.messages.create(params) as Promise<AnthropicMessageResponse>
          },
          (result) => {
            // Extract tool calls from Anthropic response
            const toolCalls = result.content
              .filter((c) => c.type === 'tool_use')
              .map((c) => ({
                id: c.id ?? `toolu_${Date.now()}`,
                type: 'function' as const,
                function: {
                  name: c.name ?? 'unknown',
                  arguments: JSON.stringify(c.input ?? {}),
                },
              }))

            // Extract text content
            const textContent = result.content
              .filter((c) => c.type === 'text')
              .map((c) => c.text ?? '')
              .join('\n')

            return {
              content: textContent || null,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              finishReason: result.stop_reason,
              usage: {
                prompt_tokens: result.usage.input_tokens,
                completion_tokens: result.usage.output_tokens,
                total_tokens: result.usage.input_tokens + result.usage.output_tokens,
              },
              model: result.model,
            }
          }
        )
      },
    },
  }
}
