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
    create: (params: AnthropicMessageParams) => Promise<AnthropicMessageResponse>
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

interface AnthropicSDKStreamEvent {
  type: string
  message?: {
    id?: string
    model?: string
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  content_block?: {
    type?: string
    id?: string
    name?: string
    text?: string
  }
  delta?: {
    type?: string
    text?: string
    partial_json?: string
    stop_reason?: string
    stop_sequence?: string
  }
  index?: number
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
  error?: {
    type?: string
    message?: string
  }
}

/**
 * Wrap an Anthropic-compatible client for automatic tracing.
 *
 * Handles both streaming and non-streaming responses transparently.
 * When streaming, chunks are consumed internally and assembled into a full response
 * before being traced, so the caller still receives a single assembled result.
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
          const textBlocks = m.content.filter((c) => c.type === 'text')
          return { role: m.role, content: textBlocks.map((b) => b.text ?? '').join('\n') }
        })

        if (params.system) {
          normalizedMessages.unshift({ role: 'system', content: params.system })
        }

        const openAITools = params.tools?.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          },
        }))

        if (params.stream) {
          return _traceStreamingCall(tracer, params, normalizedMessages, openAITools, () =>
            client.messages.create(params)
          )
        }

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

/**
 * Handle a streaming Anthropic call by consuming all SSE events and assembling
 * the full response, then tracing it as a single LLM call.
 */
async function _traceStreamingCall(
  tracer: Tracer,
  params: AnthropicMessageParams,
  normalizedMessages: Array<{ role: string; content: string | null }>,
  openAITools:
    | Array<{
        type: 'function'
        function: { name: string; description?: string; parameters: Record<string, unknown> }
      }>
    | undefined,
  execute: () => Promise<AsyncIterable<AnthropicSDKStreamEvent>>
): Promise<AnthropicMessageResponse> {
  const streamStart = Date.now()
  let firstTokenTime: number | undefined
  let chunkCount = 0

  // Accumulators
  const textBlocks: Array<{ type: 'text'; text: string }> = []
  const toolUseBlocks = new Map<number, { id: string; name: string; input_json: string }>()
  let activeBlockIndex = -1
  let stopReason = 'end_turn'
  let inputTokens = 0
  let outputTokens = 0
  let responseId = ''
  let responseModel = params.model

  try {
    const stream = await execute()

    for await (const event of stream) {
      chunkCount++

      switch (event.type) {
        case 'message_start': {
          if (event.message) {
            responseId = event.message.id ?? responseId
            responseModel = event.message.model ?? responseModel
            inputTokens = event.message.usage?.input_tokens ?? 0
          }
          break
        }

        case 'content_block_start': {
          const block = event.content_block
          if (!block) break
          activeBlockIndex = event.index ?? activeBlockIndex

          if (block.type === 'text') {
            textBlocks.push({ type: 'text', text: block.text ?? '' })
          } else if (block.type === 'tool_use') {
            const blockId = block.id ?? `toolu_${Date.now()}`
            const blockName = block.name ?? 'unknown'
            toolUseBlocks.set(activeBlockIndex, {
              id: blockId,
              name: blockName,
              input_json: '',
            })
          }
          break
        }

        case 'content_block_delta': {
          const delta = event.delta
          if (!delta) break
          const blockIdx = event.index ?? activeBlockIndex

          if (delta.text) {
            if (!firstTokenTime) {
              firstTokenTime = Date.now()
            }
            // Find the text block at this index or append
            if (textBlocks[blockIdx]) {
              textBlocks[blockIdx].text += delta.text
            } else {
              textBlocks.push({ type: 'text', text: delta.text })
            }
          } else if (delta.type === 'input_json_delta' && delta.partial_json) {
            const acc = toolUseBlocks.get(blockIdx)
            if (acc) {
              acc.input_json += delta.partial_json
            }
          }
          break
        }

        case 'content_block_stop': {
          activeBlockIndex = -1
          break
        }

        case 'message_delta': {
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason
          }
          if (event.usage?.output_tokens) {
            outputTokens = event.usage.output_tokens
          }
          break
        }

        case 'message_stop':
          // Terminal event
          break

        case 'ping':
          // Keep-alive, ignore
          break

        case 'error':
          throw new Error(
            `Anthropic streaming error: ${event.error?.message ?? 'Unknown stream error'}`
          )

        default:
          break
      }
    }
  } catch (error) {
    throw error
  }

  // Assemble the response
  const content: AnthropicMessageResponse['content'] = [
    ...textBlocks.map((b) => ({ type: 'text' as const, text: b.text })),
    ...Array.from(toolUseBlocks.values()).map((tc) => {
      let input: Record<string, unknown> = {}
      try {
        input = JSON.parse(tc.input_json || '{}') as Record<string, unknown>
      } catch (error) {
        console.error('[ANTHROPIC-INTERCEPTOR] Failed to parse tool input JSON:', error)
        input = { _raw: tc.input_json }
      }
      return {
        type: 'tool_use' as const,
        id: tc.id,
        name: tc.name,
        input,
      }
    }),
  ]

  const assembledResponse: AnthropicMessageResponse = {
    id: responseId || `msg_${Date.now()}`,
    model: responseModel,
    content,
    stop_reason: stopReason,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  }

  // Trace the assembled response
  const result = await tracer.traceLLMCall(
    'anthropic',
    params.model,
    {
      messages: normalizedMessages,
      tools: openAITools,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    },
    async () => assembledResponse,
    (res) => {
      const toolCalls = res.content
        .filter((c) => c.type === 'tool_use')
        .map((c) => ({
          id: c.id ?? `toolu_${Date.now()}`,
          type: 'function' as const,
          function: {
            name: c.name ?? 'unknown',
            arguments: JSON.stringify(c.input ?? {}),
          },
        }))

      const textContent = res.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('\n')

      return {
        content: textContent || null,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: res.stop_reason,
        usage: {
          prompt_tokens: res.usage.input_tokens,
          completion_tokens: res.usage.output_tokens,
          total_tokens: res.usage.input_tokens + res.usage.output_tokens,
        },
        model: res.model,
      }
    }
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
