/**
 * OpenAI SDK Interceptor — wraps the OpenAI client for automatic tracing.
 *
 * Usage:
 *   import OpenAI from 'openai'
 *   import { wrapOpenAI } from '@agentbench/core/tracer'
 *
 *   const client = wrapOpenAI(new OpenAI(), tracer)
 *   const response = await client.chat.completions.create({ ... })
 *   // Automatically traced!
 */
import type { Tracer } from '../tracer'

export interface WrappedOpenAI {
  chat: {
    completions: {
      create: (
        params: OpenAIChatParams,
        options?: { signal?: AbortSignal }
      ) => Promise<OpenAIChatResponse>
    }
  }
}

interface OpenAIChatParams {
  model: string
  messages: Array<{ role: string; content: string | null }>
  tools?: Array<{
    type: 'function'
    function: { name: string; description?: string; parameters: Record<string, unknown> }
  }>
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface OpenAIChatResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Wrap an OpenAI-compatible client for automatic tracing.
 * The `client` can be any object with `chat.completions.create(params)` signature.
 */
export function wrapOpenAI(
  client: { chat: { completions: { create: Function } } },
  tracer: Tracer
): WrappedOpenAI {
  return {
    chat: {
      completions: {
        create: async (
          params: OpenAIChatParams,
          options?: { signal?: AbortSignal }
        ): Promise<OpenAIChatResponse> => {
          return tracer.traceLLMCall(
            'openai',
            params.model,
            {
              messages: params.messages,
              tools: params.tools,
              temperature: params.temperature,
              max_tokens: params.max_tokens,
            },
            async () => {
              return client.chat.completions.create(params, options) as Promise<OpenAIChatResponse>
            },
            (result) => ({
              content: result.choices[0]?.message?.content ?? null,
              toolCalls: result.choices[0]?.message?.tool_calls,
              finishReason: result.choices[0]?.finish_reason,
              usage: result.usage
                ? {
                    prompt_tokens: result.usage.prompt_tokens,
                    completion_tokens: result.usage.completion_tokens,
                    total_tokens: result.usage.total_tokens,
                  }
                : undefined,
              model: result.model,
            })
          )
        },
      },
    },
  }
}
