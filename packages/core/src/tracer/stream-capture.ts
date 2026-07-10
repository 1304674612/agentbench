/**
 * StreamCapture — captures SSE stream chunks and assembles them into full responses.
 *
 * Handles both OpenAI and Anthropic streaming formats, tracking text deltas,
 * tool call fragments, and usage information across chunks.
 */
import type { TraceStep } from '../types'

// ============================================================
// Types
// ============================================================

export interface StreamChunk {
  index: number
  type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'finish'
  content?: string
  toolCallId?: string
  toolName?: string
  toolArguments?: string
  timestamp: number
}

export interface AssembledStreamResponse {
  fullText: string
  toolCalls: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
  }>
  finishReason: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface ToolCallAccumulator {
  id: string
  name: string
  arguments: string
}

interface StreamingMetrics {
  firstTokenTime: number | undefined
  chunkCount: number
}

/**
 * Parse a JSON string into Record<string, unknown>, returning {} on failure.
 */
function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Parse tool call arguments string into a record.
 */
function parseToolArguments(args: string): Record<string, unknown> {
  try {
    return JSON.parse(args) as Record<string, unknown>
  } catch {
    return { _raw: args }
  }
}

// ============================================================
// StreamCapture
// ============================================================

export class StreamCapture {
  private chunks: StreamChunk[] = []
  private startTime: number
  private streamType: 'openai' | 'anthropic' | 'generic'
  private fullText = ''
  private toolCallsById: Map<string, ToolCallAccumulator> = new Map()
  private toolCallsByIndex: Map<number, string> = new Map()
  private finishReason = ''
  private usage: AssembledStreamResponse['usage']
  private firstTokenTime: number | undefined
  private buffer = ''
  private anthropicActiveBlockIndex = -1
  private anthropicActiveBlockId = ''

  constructor(streamType: 'openai' | 'anthropic' | 'generic') {
    this.streamType = streamType
    this.startTime = Date.now()
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Process a raw SSE data payload string. Handles buffering of partial
   * lines so callers can feed in arbitrary byte chunks.
   */
  processChunk(raw: string): void {
    this.buffer += raw
    const lines = this.buffer.split('\n')
    // The last element may be an incomplete line — keep it in the buffer
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)

      if (data === '[DONE]') {
        this.chunks.push({
          index: this.chunks.length,
          type: 'finish',
          content: '[DONE]',
          timestamp: Date.now(),
        })
        continue
      }

      const parsed = safeParseJson(data)
      if (Object.keys(parsed).length === 0) continue

      switch (this.streamType) {
        case 'openai':
          this._processOpenAIChunk(parsed)
          break
        case 'anthropic':
          this._processAnthropicEvent(parsed)
          break
        default:
          this._processGenericChunk(parsed)
      }
    }
  }

  /**
   * Process an entire ReadableStream (e.g. from fetch's response.body).
   */
  async captureStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        this.processChunk(decoder.decode(value, { stream: true }))
      }
    } finally {
      reader.releaseLock()
    }

    // Flush any remaining data in the buffer
    if (this.buffer.trim()) {
      // Force a newline to finalize any hanging data line
      this.processChunk('\n')
    }
  }

  /**
   * Get the fully assembled response including text, tool calls, and usage.
   */
  getAssembledResponse(): AssembledStreamResponse {
    return {
      fullText: this.fullText,
      toolCalls: Array.from(this.toolCallsById.values()).map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: parseToolArguments(tc.arguments),
      })),
      finishReason: this.finishReason || 'stop',
      usage: this.usage,
    }
  }

  /**
   * Get streaming-specific metrics for trace steps.
   */
  getStreamingMetrics(): StreamingMetrics {
    return {
      firstTokenTime: this.firstTokenTime,
      chunkCount: this.chunks.length,
    }
  }

  /**
   * Get the time to first token in milliseconds (0 if no token received).
   */
  getTimeToFirstToken(): number {
    if (!this.firstTokenTime) return 0
    return this.firstTokenTime - this.startTime
  }

  /**
   * Create trace steps from the captured stream.
   * Returns a partial TraceStep with the assembled response and streaming metadata.
   */
  toTraceStep(): Partial<TraceStep> {
    const now = Date.now()
    const assembled = this.getAssembledResponse()
    const metrics = this.getStreamingMetrics()
    const streamLatency = this.getTimeToFirstToken()

    return {
      startedAt: new Date(this.startTime),
      endedAt: new Date(now),
      duration: now - this.startTime,
      isStreaming: true,
      streamChunks: metrics.chunkCount,
      streamLatency,
      llmResponse: {
        content: assembled.fullText || null,
        toolCalls: assembled.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
        finishReason: assembled.finishReason,
        usage: assembled.usage ?? {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        model: '',
      },
      promptTokens: assembled.usage?.promptTokens ?? 0,
      completionTokens: assembled.usage?.completionTokens ?? 0,
      totalTokens: assembled.usage?.totalTokens ?? 0,
      status: 'success' as const,
      metadata: {
        streamType: this.streamType,
        timeToFirstToken: streamLatency,
      },
    }
  }

  /**
   * Reset all internal state for reuse.
   */
  reset(): void {
    this.chunks = []
    this.fullText = ''
    this.toolCallsById.clear()
    this.toolCallsByIndex.clear()
    this.finishReason = ''
    this.usage = undefined
    this.firstTokenTime = undefined
    this.buffer = ''
    this.anthropicActiveBlockIndex = -1
    this.anthropicActiveBlockId = ''
    this.startTime = Date.now()
  }

  // ============================================================
  // OpenAI SSE Parsing
  // ============================================================

  private _processOpenAIChunk(parsed: Record<string, unknown>): void {
    const choices = parsed.choices as Array<Record<string, unknown>> | undefined
    if (!choices) return

    for (const choice of choices) {
      const delta = choice.delta as Record<string, unknown> | undefined
      if (!delta) continue

      // --- Text content ---
      if (typeof delta.content === 'string' && delta.content.length > 0) {
        this._recordFirstToken()
        this.fullText += delta.content
        this.chunks.push({
          index: this.chunks.length,
          type: 'text',
          content: delta.content,
          timestamp: Date.now(),
        })
      }

      // --- Tool calls ---
      const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
      if (toolCalls) {
        for (const tc of toolCalls) {
          this._processOpenAIToolCallDelta(tc)
        }
      }

      // --- Finish reason ---
      if (typeof choice.finish_reason === 'string' && choice.finish_reason) {
        this.finishReason = choice.finish_reason
      }
    }

    // --- Usage (usually on final chunk) ---
    if (parsed.usage) {
      const u = parsed.usage as Record<string, number>
      this.usage = {
        promptTokens: u.prompt_tokens ?? this.usage?.promptTokens ?? 0,
        completionTokens: u.completion_tokens ?? this.usage?.completionTokens ?? 0,
        totalTokens: u.total_tokens ?? 0,
      }
    }
  }

  private _processOpenAIToolCallDelta(tc: Record<string, unknown>): void {
    const idx =
      typeof tc.index === 'number' ? tc.index : 0

    // Get or create the accumulator
    let mappingId = this.toolCallsByIndex.get(idx)
    if (!mappingId) {
      mappingId = typeof tc.id === 'string' ? tc.id : `tool_call_${idx}`
      this.toolCallsByIndex.set(idx, mappingId)
      this.toolCallsById.set(mappingId, { id: mappingId, name: '', arguments: '' })
      this.chunks.push({
        index: this.chunks.length,
        type: 'tool_call_start',
        toolCallId: mappingId,
        timestamp: Date.now(),
      })
    }

    const acc = this.toolCallsById.get(mappingId)
    if (!acc) return

    // Update id if present
    if (typeof tc.id === 'string' && tc.id) {
      // If the id changed, update the mapping
      if (acc.id !== tc.id && acc.id.startsWith('tool_call_')) {
        this.toolCallsById.delete(acc.id)
        acc.id = tc.id
        this.toolCallsById.set(tc.id, acc)
        this.toolCallsByIndex.set(idx, tc.id)
      }
      acc.id = tc.id
    }

    // Merge function name
    const fn = tc.function as Record<string, unknown> | undefined
    if (fn) {
      if (typeof fn.name === 'string' && fn.name) {
        acc.name += fn.name
        this.chunks.push({
          index: this.chunks.length,
          type: 'tool_call_delta',
          toolCallId: acc.id,
          toolName: fn.name,
          timestamp: Date.now(),
        })
      }
      if (typeof fn.arguments === 'string' && fn.arguments) {
        acc.arguments += fn.arguments
        this.chunks.push({
          index: this.chunks.length,
          type: 'tool_call_delta',
          toolCallId: acc.id,
          toolArguments: fn.arguments,
          timestamp: Date.now(),
        })
      }
    }
  }

  // ============================================================
  // Anthropic SSE Parsing
  // ============================================================

  private _processAnthropicEvent(parsed: Record<string, unknown>): void {
    const eventType = typeof parsed.type === 'string' ? parsed.type : ''

    switch (eventType) {
      case 'message_start': {
        const message = parsed.message as Record<string, unknown> | undefined
        if (message?.usage) {
          const u = message.usage as Record<string, number>
          this.usage = {
            promptTokens: u.input_tokens ?? 0,
            completionTokens: 0,
            totalTokens: u.input_tokens ?? 0,
          }
        }
        if (typeof message?.model === 'string') {
          // model info is available at message_start
        }
        break
      }

      case 'content_block_start': {
        const block = parsed.content_block as Record<string, unknown> | undefined
        if (!block) break

        if (block.type === 'tool_use') {
          this.anthropicActiveBlockIndex =
            typeof parsed.index === 'number' ? parsed.index : -1
          const blockId = typeof block.id === 'string' ? block.id : `toolu_${Date.now()}`
          const blockName = typeof block.name === 'string' ? block.name : 'unknown'

          this.anthropicActiveBlockId = blockId
          this.toolCallsById.set(blockId, { id: blockId, name: blockName, arguments: '' })

          this.chunks.push({
            index: this.chunks.length,
            type: 'tool_call_start',
            toolCallId: blockId,
            toolName: blockName,
            timestamp: Date.now(),
          })
        }
        break
      }

      case 'content_block_delta': {
        const delta = parsed.delta as Record<string, unknown> | undefined
        if (!delta) break

        if (typeof delta.text === 'string' && delta.text.length > 0) {
          this._recordFirstToken()
          this.fullText += delta.text
          this.chunks.push({
            index: this.chunks.length,
            type: 'text',
            content: delta.text,
            timestamp: Date.now(),
          })
        } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          const blockId = this.anthropicActiveBlockId

          if (blockId) {
            const acc = this.toolCallsById.get(blockId)
            if (acc) {
              acc.arguments += delta.partial_json
            }
          }

          this.chunks.push({
            index: this.chunks.length,
            type: 'tool_call_delta',
            toolCallId: blockId,
            toolArguments: delta.partial_json,
            timestamp: Date.now(),
          })
        }
        break
      }

      case 'content_block_stop': {
        const blockIndex = typeof parsed.index === 'number' ? parsed.index : -1
        if (blockIndex === this.anthropicActiveBlockIndex) {
          this.chunks.push({
            index: this.chunks.length,
            type: 'tool_call_end',
            toolCallId: this.anthropicActiveBlockId,
            timestamp: Date.now(),
          })
          this.anthropicActiveBlockIndex = -1
          this.anthropicActiveBlockId = ''
        }
        break
      }

      case 'message_delta': {
        const delta = parsed.delta as Record<string, unknown> | undefined
        if (delta?.stop_reason && typeof delta.stop_reason === 'string') {
          this.finishReason = delta.stop_reason
        }
        if (parsed.usage) {
          const u = parsed.usage as Record<string, number>
          if (!this.usage) {
            this.usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          }
          this.usage.completionTokens = u.output_tokens ?? this.usage.completionTokens
          this.usage.totalTokens = this.usage.promptTokens + this.usage.completionTokens
        }
        break
      }

      case 'message_stop':
        // Terminal event — no additional processing needed
        break

      case 'ping':
        // Keep-alive ping — ignore
        break

      case 'error': {
        const error = parsed.error as Record<string, unknown> | undefined
        throw new Error(
          `Anthropic streaming error: ${typeof error?.message === 'string' ? error.message : 'Unknown stream error'}`
        )
      }

      default:
        // Unknown event types are silently ignored
        break
    }
  }

  // ============================================================
  // Generic SSE Parsing (best-effort)
  // ============================================================

  private _processGenericChunk(parsed: Record<string, unknown>): void {
    // Try common content fields
    const text = parsed.text ?? parsed.content ?? parsed.delta ?? parsed.message
    if (typeof text === 'string' && text.length > 0) {
      this._recordFirstToken()
      this.fullText += text
      this.chunks.push({
        index: this.chunks.length,
        type: 'text',
        content: text,
        timestamp: Date.now(),
      })
    }

    // Try usage fields
    if (parsed.usage) {
      const u = parsed.usage as Record<string, number>
      this.usage = {
        promptTokens: u.prompt_tokens ?? u.input_tokens ?? this.usage?.promptTokens ?? 0,
        completionTokens: u.completion_tokens ?? u.output_tokens ?? this.usage?.completionTokens ?? 0,
        totalTokens: u.total_tokens ?? 0,
      }
    }

    // Try finish reason
    const reason = parsed.finish_reason ?? parsed.stop_reason
    if (typeof reason === 'string' && reason) {
      this.finishReason = reason
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private _recordFirstToken(): void {
    if (!this.firstTokenTime) {
      this.firstTokenTime = Date.now()
    }
  }
}
