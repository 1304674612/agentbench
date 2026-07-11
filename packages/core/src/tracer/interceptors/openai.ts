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

interface OpenAISDKStreamChunk {
  id?: string
  choices?: Array<{
    delta?: {
      content?: string | null
      tool_calls?: Array<{
        index?: number
        id?: string
        type?: 'function'
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

/**
 * Wrap an OpenAI-compatible client for automatic tracing.
 * The `client` can be any object with `chat.completions.create(params)` signature.
 *
 * Handles both streaming and non-streaming responses transparently.
 * When streaming, chunks are consumed internally and assembled into a full response
 * before being traced, so the caller still receives a single assembled result.
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
          if (params.stream) {
            return _traceStreamingCall(tracer, params, () =>
              client.chat.completions.create(params, options)
            )
          }

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

/**
 * Handle a streaming call by consuming all chunks and assembling a full response,
 * then tracing it as a single LLM call.
 */
async function _traceStreamingCall(
  tracer: Tracer,
  params: OpenAIChatParams,
  execute: () => Promise<AsyncIterable<OpenAISDKStreamChunk>>
): Promise<OpenAIChatResponse> {
  const streamStart = Date.now()
  let firstTokenTime: number | undefined
  let chunkCount = 0

  // Accumulators
  let fullContent = ''
  const toolCallsByIndex = new Map<number, { id: string; name: string; arguments: string }>()
  let finishReason = 'stop'
  let usage: OpenAIChatResponse['usage']
  let streamId = ''

  try {
    const stream = await execute()

    for await (const chunk of stream) {
      chunkCount++

      if (chunk.id && !streamId) {
        streamId = chunk.id
      }

      const choice = chunk.choices?.[0]
      if (!choice) continue

      const delta = choice.delta
      if (delta) {
        // Text content
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          if (!firstTokenTime) {
            firstTokenTime = Date.now()
          }
          fullContent += delta.content
        }

        // Tool calls — accumulate by index
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!toolCallsByIndex.has(idx)) {
              toolCallsByIndex.set(idx, { id: tc.id ?? '', name: '', arguments: '' })
            }
            const acc = toolCallsByIndex.get(idx)!
            if (tc.id) acc.id = tc.id
            if (tc.function?.name) acc.name += tc.function.name
            if (tc.function?.arguments) acc.arguments += tc.function.arguments
          }
        }
      }

      // Finish reason
      if (choice.finish_reason) {
        finishReason = choice.finish_reason
      }

      // Usage (usually on final chunk)
      if (chunk.usage) {
        usage = {
          prompt_tokens: chunk.usage.prompt_tokens ?? 0,
          completion_tokens: chunk.usage.completion_tokens ?? 0,
          total_tokens: chunk.usage.total_tokens ?? 0,
        }
      }
    }
  } catch (error) {
    throw error
  }

  // Build the assembled response
  const assembledToolCalls = Array.from(toolCallsByIndex.values()).map((tc) => ({
    id: tc.id || `call_${Date.now()}`,
    type: 'function' as const,
    function: { name: tc.name || 'unknown', arguments: tc.arguments || '{}' },
  }))

  const assembledResponse: OpenAIChatResponse = {
    id: streamId || `chatcmpl-${Date.now()}`,
    model: params.model,
    choices: [
      {
        message: {
          role: 'assistant',
          content: fullContent || null,
          tool_calls: assembledToolCalls.length > 0 ? assembledToolCalls : undefined,
        },
        finish_reason: finishReason,
      },
    ],
    usage,
  }

  // Trace via the standard path, but enrich the step with streaming metadata
  const result = await tracer.traceLLMCall(
    'openai',
    params.model,
    {
      messages: params.messages,
      tools: params.tools,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    },
    async () => assembledResponse,
    (res) => ({
      content: res.choices[0]?.message?.content ?? null,
      toolCalls: res.choices[0]?.message?.tool_calls,
      finishReason: res.choices[0]?.finish_reason,
      usage: res.usage
        ? {
            prompt_tokens: res.usage.prompt_tokens,
            completion_tokens: res.usage.completion_tokens,
            total_tokens: res.usage.total_tokens,
          }
        : undefined,
      model: res.model,
    })
  )

  // Enrich the last step with streaming metadata
  const lastStep = tracer.steps[tracer.steps.length - 1]
  if (lastStep) {
    lastStep.isStreaming = true
    lastStep.streamChunks = chunkCount
    if (firstTokenTime) {
      lastStep.streamLatency = firstTokenTime - streamStart
    }
  }

  return result
}
