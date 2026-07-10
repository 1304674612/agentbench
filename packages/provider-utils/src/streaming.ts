/**
 * SSE (Server-Sent Events) parsing utilities for streaming LLM responses.
 *
 * Handles both OpenAI-compatible and Anthropic streaming formats.
 * Provides buffered line-by-line parsing for incremental text chunks.
 *
 * @packageDocumentation
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedSSEEvent {
  /** Raw event data string */
  data: string
  /** Parsed JSON object (null if parsing failed) */
  parsed: Record<string, unknown> | null
  /** Whether this is the [DONE] sentinel */
  isDone: boolean
}

export interface SSEParserState {
  /** Accumulated buffer for partial lines */
  buffer: string
  /** Total events parsed so far */
  eventsParsed: number
  /** Time of first meaningful event (text/tool_call) */
  firstTokenTime: number | null
  /** Accumulated text content */
  textContent: string
  /** Accumulated tool calls by index */
  toolCalls: Map<number, StreamingToolCall>
  /** Final finish reason */
  finishReason: string | null
  /** Accumulated usage info */
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
}

export interface StreamingToolCall {
  id: string
  name: string
  arguments: string
}

// ── SSE Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a raw text chunk into SSE events.
 * Handles buffering of partial lines across calls.
 */
export function createSSEParser() {
  const state: SSEParserState = {
    buffer: '',
    eventsParsed: 0,
    firstTokenTime: null,
    textContent: '',
    toolCalls: new Map(),
    finishReason: null,
    usage: null,
  }

  /**
   * Feed a raw text chunk and extract SSE events.
   * Handles line buffering so partial lines are preserved across calls.
   */
  function feed(raw: string): ParsedSSEEvent[] {
    const events: ParsedSSEEvent[] = []
    state.buffer += raw
    const lines = state.buffer.split('\n')
    // Keep the last (possibly partial) line in the buffer
    state.buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) {
        // Non-data lines (comments, empty) are skipped
        continue
      }

      const data = trimmed.slice(6)

      if (data === '[DONE]') {
        events.push({ data, parsed: null, isDone: true })
        continue
      }

      let parsed: Record<string, unknown> | null = null
      try {
        parsed = JSON.parse(data)
      } catch {
        // Skip malformed JSON
        continue
      }

      events.push({ data, parsed, isDone: false })
      state.eventsParsed++
    }

    return events
  }

  /**
   * Process SSE events and update parser state.
   * Handles OpenAI-compatible streaming format.
   */
  function processOpenAIEvents(events: ParsedSSEEvent[]): void {
    for (const event of events) {
      if (event.isDone || !event.parsed) continue

      const choices = event.parsed.choices as Array<Record<string, unknown>> | undefined
      if (!choices) continue

      for (const choice of choices) {
        const delta = choice.delta as Record<string, unknown> | undefined
        if (!delta) continue

        // Text content
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          if (state.firstTokenTime === null) {
            state.firstTokenTime = Date.now()
          }
          state.textContent += delta.content
        }

        // Tool calls
        const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
        if (toolCalls) {
          for (const tc of toolCalls) {
            const index = typeof tc.index === 'number' ? tc.index : 0
            let acc = state.toolCalls.get(index)
            if (!acc) {
              acc = { id: typeof tc.id === 'string' ? tc.id : `call_${index}`, name: '', arguments: '' }
              state.toolCalls.set(index, acc)
            }
            if (typeof tc.id === 'string' && tc.id) acc.id = tc.id
            const fn = tc.function as Record<string, unknown> | undefined
            if (fn) {
              if (typeof fn.name === 'string') acc.name += fn.name
              if (typeof fn.arguments === 'string') acc.arguments += fn.arguments
            }
          }
        }

        // Finish reason
        if (typeof choice.finish_reason === 'string' && choice.finish_reason) {
          state.finishReason = choice.finish_reason
        }
      }

      // Usage (typically on the final chunk)
      if (event.parsed.usage) {
        const u = event.parsed.usage as Record<string, number>
        state.usage = {
          promptTokens: u.prompt_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
        }
      }
    }
  }

  /**
   * Process SSE events in Anthropic streaming format.
   */
  function processAnthropicEvents(events: ParsedSSEEvent[]): void {
    for (const event of events) {
      if (event.isDone || !event.parsed) continue

      const type = event.parsed.type as string | undefined

      switch (type) {
        case 'message_start': {
          const message = event.parsed.message as Record<string, unknown> | undefined
          if (message?.usage) {
            const u = message.usage as Record<string, number>
            state.usage = {
              promptTokens: u.input_tokens ?? 0,
              completionTokens: 0,
              totalTokens: u.input_tokens ?? 0,
            }
          }
          break
        }
        case 'content_block_start': {
          const block = event.parsed.content_block as Record<string, unknown> | undefined
          if (block?.type === 'tool_use') {
            const idx = typeof event.parsed.index === 'number' ? event.parsed.index : state.toolCalls.size
            state.toolCalls.set(idx, {
              id: typeof block.id === 'string' ? block.id : `toolu_${Date.now()}`,
              name: typeof block.name === 'string' ? block.name : 'unknown',
              arguments: '',
            })
          }
          break
        }
        case 'content_block_delta': {
          const delta = event.parsed.delta as Record<string, unknown> | undefined
          if (!delta) break
          if (typeof delta.text === 'string' && delta.text.length > 0) {
            if (state.firstTokenTime === null) state.firstTokenTime = Date.now()
            state.textContent += delta.text
          } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
            // Tool argument accumulation: append to the last tool call
            const lastIdx = state.toolCalls.size - 1
            const last = state.toolCalls.get(lastIdx >= 0 ? lastIdx : 0)
            if (last) last.arguments += delta.partial_json
          }
          break
        }
        case 'message_delta': {
          const delta = event.parsed.delta as Record<string, unknown> | undefined
          if (delta?.stop_reason && typeof delta.stop_reason === 'string') {
            state.finishReason = delta.stop_reason
          }
          if (event.parsed.usage) {
            const u = event.parsed.usage as Record<string, number>
            if (state.usage) {
              state.usage.completionTokens = u.output_tokens ?? state.usage.completionTokens
              state.usage.totalTokens = state.usage.promptTokens + state.usage.completionTokens
            }
          }
          break
        }
        case 'error': {
          const error = event.parsed.error as Record<string, unknown> | undefined
          throw new Error(
            `Anthropic streaming error: ${typeof error?.message === 'string' ? error.message : 'Unknown stream error'}`
          )
        }
      }
    }
  }

  /** Reset the parser state for reuse. */
  function reset(): void {
    state.buffer = ''
    state.eventsParsed = 0
    state.firstTokenTime = null
    state.textContent = ''
    state.toolCalls.clear()
    state.finishReason = null
    state.usage = null
  }

  /** Get the time to first token in milliseconds. */
  function getTimeToFirstToken(startTime: number): number {
    if (state.firstTokenTime === null) return 0
    return state.firstTokenTime - startTime
  }

  return {
    state,
    feed,
    processOpenAIEvents,
    processAnthropicEvents,
    reset,
    getTimeToFirstToken,
  }
}

// ── Convenience Functions ──────────────────────────────────────────────────────

/**
 * Parse a complete SSE response body into an array of parsed events.
 * Useful for testing or non-streaming SSE parsing.
 */
export function parseSSEBody(body: string): ParsedSSEEvent[] {
  const parser = createSSEParser()
  return parser.feed(body)
}

/**
 * Extract text content from an SSE event.
 */
export function extractTextFromEvent(event: ParsedSSEEvent): string | null {
  if (!event.parsed) return null
  const choices = event.parsed.choices as Array<Record<string, unknown>> | undefined
  if (!choices?.[0]) return null
  const delta = choices[0].delta as Record<string, unknown> | undefined
  if (typeof delta?.content === 'string') return delta.content
  return null
}
