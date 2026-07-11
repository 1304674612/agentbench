/**
 * @agentbench/langgraph
 *
 * LangGraph adapter — wraps any LangGraph-compatible compiled graph
 * and produces trace steps compatible with @agentbench/core.
 *
 * Uses duck-typing so that @langchain/langgraph is NOT a hard dependency —
 * any object with an .invoke() or .stream() method works.
 *
 * @example
 * ```typescript
 * import { createLangGraphAdapter } from '@agentbench/langgraph'
 * import { Runner } from '@agentbench/core'
 *
 * // Import your compiled LangGraph graph
 * import { graph } from './my-graph'
 *
 * const adapter = createLangGraphAdapter({ name: 'my-agent', graph })
 * const result = await adapter.run({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * })
 *
 * console.log(result.output)
 * console.log(result.traceSteps)
 * ```
 */

import type { TraceStep } from '@agentbench/core'

// ============================================================
// Types
// ============================================================

export interface LangGraphAgentConfig {
  /** Human-readable name for this agent */
  name: string
  /** LangGraph compiled graph — duck-typed, kept as unknown to avoid hard dep */
  graph: unknown
  /** Optional API key for the underlying LLM */
  apiKey?: string
  /** Maximum number of graph steps before timeout */
  maxSteps?: number
  /** Timeout in milliseconds */
  timeout?: number
}

export interface LangGraphRunInput {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  /** System prompt merged into graph state */
  systemPrompt?: string
  /** Additional variables injected into graph state */
  variables?: Record<string, string>
}

export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface LangGraphRunOutput {
  /** The final text output from the agent */
  output: string
  /** All tool calls observed during the run */
  toolCalls: ToolCallRecord[]
  /** Fine-grained trace steps for observability */
  traceSteps: TraceStep[]
  /** Aggregate metrics */
  metrics: {
    totalTokens: number
    totalCost: number
    totalLatency: number
    stepCount: number
    llmCallCount: number
    toolCallCount: number
  }
}

// ============================================================
// Helpers
// ============================================================

let _stepIdCounter = 0

function generateStepId(): string {
  return `step_${Date.now()}_${++_stepIdCounter}_${Math.random().toString(36).slice(2, 8)}`
}

function extractContent(msg: unknown): string | null {
  if (typeof msg === 'string') return msg
  if (typeof msg === 'object' && msg !== null) {
    const m = msg as Record<string, unknown>
    if (typeof m.content === 'string') return m.content
    // Handle LangChain message content that might be an array of content blocks
    if (Array.isArray(m.content)) {
      return m.content
        .map((block: unknown) => {
          if (typeof block === 'string') return block
          if (
            typeof block === 'object' &&
            block !== null &&
            'text' in (block as Record<string, unknown>)
          )
            return (block as Record<string, unknown>).text
          return ''
        })
        .join('')
    }
  }
  return null
}

function extractToolCalls(
  msg: unknown
): Array<{ name: string; args: Record<string, unknown>; id?: string }> {
  const results: Array<{ name: string; args: Record<string, unknown>; id?: string }> = []
  if (typeof msg !== 'object' || msg === null) return results

  const m = msg as Record<string, unknown>

  function pushToolCall(tc: Record<string, unknown>): void {
    const func = tc.function as Record<string, unknown> | undefined
    results.push({
      name: (tc.name as string) || (typeof func?.name === 'string' ? func.name : '') || 'unknown',
      args:
        (tc.args as Record<string, unknown>) || (func?.arguments as Record<string, unknown>) || {},
      id: tc.id as string | undefined,
    })
  }

  // LangChain format: msg.tool_calls is an array
  if (Array.isArray(m.tool_calls)) {
    for (const tc of m.tool_calls as Array<Record<string, unknown>>) {
      pushToolCall(tc)
    }
  }

  // Additional tool call detection: some frameworks use `additional_kwargs.tool_calls`
  const additionalKwargs = m.additional_kwargs as Record<string, unknown> | undefined
  if (additionalKwargs?.tool_calls && Array.isArray(additionalKwargs.tool_calls)) {
    for (const tc of additionalKwargs.tool_calls as Array<Record<string, unknown>>) {
      pushToolCall(tc)
    }
  }

  return results
}

// ============================================================
// LangGraph Adapter
// ============================================================

export class LangGraphAdapter {
  private config: LangGraphAgentConfig

  constructor(config: LangGraphAgentConfig) {
    this.config = {
      maxSteps: 50,
      timeout: 120000,
      ...config,
    }
  }

  /**
   * Run the LangGraph agent and produce trace steps.
   *
   * Uses duck-typing — works with any LangGraph-compatible graph object
   * that has an .invoke() method (LangGraph's CompiledStateGraph).
   */
  async run(input: LangGraphRunInput): Promise<LangGraphRunOutput> {
    const startTime = Date.now()
    const traceSteps: TraceStep[] = []
    const toolCalls: ToolCallRecord[] = []

    const graph = this.config.graph as Record<string, unknown>
    const graphInvoke = graph?.invoke as
      | ((state: Record<string, unknown>, config?: Record<string, unknown>) => Promise<unknown>)
      | undefined

    if (typeof graphInvoke !== 'function') {
      throw new Error(
        'Invalid LangGraph graph: expected an object with an .invoke() method. ' +
          'Make sure you pass a compiled LangGraph graph (CompiledStateGraph).'
      )
    }

    try {
      // Convert AgentBench input to LangGraph state format.
      // LangGraph typically uses [role, content] tuples or message objects.
      const state: Record<string, unknown> = {
        messages: input.messages.map((m) => [m.role, m.content]),
        ...(input.systemPrompt ? { systemPrompt: input.systemPrompt } : {}),
        ...input.variables,
      }

      // Invoke the graph with optional timeout
      const invokePromise = graphInvoke(state, {
        recursion_limit: this.config.maxSteps,
      })

      let result: unknown
      if (this.config.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`LangGraph agent timed out after ${this.config.timeout}ms`)),
            this.config.timeout
          )
        )
        result = await Promise.race([invokePromise, timeoutPromise])
      } else {
        result = await invokePromise
      }

      // Process the result messages
      const resultObj = result as Record<string, unknown> | undefined
      const outputMessages: unknown[] = (resultObj?.messages as unknown[]) ?? []

      let outputText = ''
      let llmCallCount = 0

      for (const msg of outputMessages) {
        if (Array.isArray(msg)) {
          // Tuple format: [role, content]
          const [role, content] = msg as [string, unknown]
          const contentStr = typeof content === 'string' ? content : ''

          if (role === 'ai' || role === 'assistant') {
            outputText += contentStr + '\n'

            // Record LLM call trace step
            llmCallCount++
            const stepStart = new Date()
            traceSteps.push({
              id: generateStepId(),
              sequence: traceSteps.length,
              type: 'llm_call' as const,
              startedAt: stepStart,
              endedAt: stepStart,
              duration: 0,
              llmProvider: 'langgraph',
              llmModel: this.config.name,
              llmResponse: {
                content: contentStr,
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model: this.config.name,
              },
              status: 'success' as const,
            })
          }
        } else if (typeof msg === 'object' && msg !== null) {
          const msgObj = msg as Record<string, unknown>
          const role = msgObj.role ?? msgObj.type ?? ''

          // Extract content
          const content = extractContent(msg)
          if (content && (role === 'ai' || role === 'assistant' || !role)) {
            outputText += content + '\n'
          }

          // Record LLM call for AI messages
          if (role === 'ai' || role === 'assistant') {
            llmCallCount++
            const stepStart = new Date()
            traceSteps.push({
              id: generateStepId(),
              sequence: traceSteps.length,
              type: 'llm_call' as const,
              startedAt: stepStart,
              endedAt: stepStart,
              duration: 0,
              llmProvider: 'langgraph',
              llmModel: this.config.name,
              llmResponse: {
                content: content ?? JSON.stringify(msgObj),
                finishReason: 'stop',
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                model: this.config.name,
              },
              status: 'success' as const,
            })
          }

          // Extract tool calls from AI messages
          const msgToolCalls = extractToolCalls(msg)
          for (const tc of msgToolCalls) {
            toolCalls.push({
              name: tc.name,
              arguments: tc.args,
            })

            const stepStart = new Date()
            traceSteps.push({
              id: generateStepId(),
              sequence: traceSteps.length,
              type: 'tool_call' as const,
              startedAt: stepStart,
              endedAt: stepStart,
              duration: 0,
              toolName: tc.name,
              toolRequest: { name: tc.name, arguments: tc.args },
              toolResponse: { result: null },
              status: 'success' as const,
            })
          }

          // Handle tool results (ToolMessage in LangChain)
          if (role === 'tool' || msgObj.tool_call_id) {
            // Find the matching tool call and attach the result
            const toolCallId = msgObj.tool_call_id as string | undefined
            const toolContent = content ?? JSON.stringify(msgObj)

            if (toolCallId && toolCalls.length > 0) {
              // Try to match with the last tool call without a result
              for (let i = toolCalls.length - 1; i >= 0; i--) {
                if (toolCalls[i].result === undefined) {
                  toolCalls[i].result = toolContent
                  // Also update the corresponding trace step
                  for (let j = traceSteps.length - 1; j >= 0; j--) {
                    if (
                      traceSteps[j].type === 'tool_call' &&
                      traceSteps[j].toolName === toolCalls[i].name &&
                      traceSteps[j].toolResponse?.result === null
                    ) {
                      traceSteps[j].toolResponse = { result: toolContent }
                      break
                    }
                  }
                  break
                }
              }
            }
          }
        } else if (typeof msg === 'string') {
          outputText += msg + '\n'
        }
      }

      // If no output was extracted, stringify the whole result
      const finalOutput = outputText.trim() || JSON.stringify(result)

      const totalLatency = Date.now() - startTime

      return {
        output: finalOutput,
        toolCalls,
        traceSteps,
        metrics: {
          totalTokens: 0,
          totalCost: 0,
          totalLatency,
          stepCount: traceSteps.length,
          llmCallCount,
          toolCallCount: toolCalls.length,
        },
      }
    } catch (err) {
      const stepStart = new Date()
      traceSteps.push({
        id: generateStepId(),
        sequence: traceSteps.length,
        type: 'error' as const,
        startedAt: stepStart,
        endedAt: stepStart,
        duration: 0,
        status: 'error' as const,
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'unknown',
          retryable: false,
        },
      })

      throw err
    }
  }

  /**
   * Run the LangGraph agent with streaming.
   *
   * Uses duck-typing — works with any LangGraph-compatible graph object
   * that has a .stream() method (LangGraph's CompiledStateGraph).
   * Falls back to non-streaming if .stream() is not available.
   */
  async *stream(input: LangGraphRunInput): AsyncGenerator<{
    type: 'text' | 'tool_call' | 'error' | 'done'
    content?: string
    toolCall?: { name: string; arguments: Record<string, unknown> }
  }> {
    const graph = this.config.graph as Record<string, unknown>
    const graphStream = graph?.stream as
      | ((
          state: Record<string, unknown>,
          config?: Record<string, unknown>
        ) => AsyncIterable<unknown>)
      | undefined

    if (typeof graphStream !== 'function') {
      // Fall back to non-streaming
      try {
        const result = await this.run(input)
        yield { type: 'text', content: result.output }
        for (const tc of result.toolCalls) {
          yield {
            type: 'tool_call',
            toolCall: { name: tc.name, arguments: tc.arguments },
          }
        }
      } catch (err) {
        yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
      }
      yield { type: 'done' }
      return
    }

    try {
      const state: Record<string, unknown> = {
        messages: input.messages.map((m) => [m.role, m.content]),
        ...(input.systemPrompt ? { systemPrompt: input.systemPrompt } : {}),
        ...input.variables,
      }

      for await (const chunk of graphStream(state, {
        recursion_limit: this.config.maxSteps,
      })) {
        if (typeof chunk === 'string') {
          yield { type: 'text', content: chunk }
        } else if (typeof chunk === 'object' && chunk !== null) {
          const chunkObj = chunk as Record<string, unknown>

          // LangGraph streaming produces { nodeName: update } chunks
          // Walk through each node's output
          for (const [, nodeOutput] of Object.entries(chunkObj)) {
            if (typeof nodeOutput === 'string') {
              yield { type: 'text', content: nodeOutput }
            } else if (typeof nodeOutput === 'object' && nodeOutput !== null) {
              const out = nodeOutput as Record<string, unknown>

              // Check for messages in node output
              const messages = out.messages as unknown[] | undefined
              if (messages) {
                for (const msg of messages) {
                  if (Array.isArray(msg)) {
                    const [, content] = msg as [string, unknown]
                    if (typeof content === 'string') {
                      yield { type: 'text', content }
                    }
                  } else if (typeof msg === 'object' && msg !== null) {
                    const content = extractContent(msg)
                    if (content) {
                      yield { type: 'text', content }
                    }
                    const toolCalls = extractToolCalls(msg)
                    for (const tc of toolCalls) {
                      yield {
                        type: 'tool_call',
                        toolCall: { name: tc.name, arguments: tc.args },
                      }
                    }
                  }
                }
              }

              // Direct content in node output
              const content = extractContent(nodeOutput)
              if (content && !messages) {
                yield { type: 'text', content }
              }
            }
          }
        }
      }
    } catch (err) {
      yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
    }
    yield { type: 'done' }
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a LangGraph adapter for the given compiled graph.
 *
 * @example
 * ```typescript
 * import { createLangGraphAdapter } from '@agentbench/langgraph'
 *
 * const adapter = createLangGraphAdapter({
 *   name: 'my-agent',
 *   graph: compiledGraph,
 * })
 *
 * const result = await adapter.run({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * })
 * ```
 */
export function createLangGraphAdapter(config: LangGraphAgentConfig): LangGraphAdapter {
  return new LangGraphAdapter(config)
}

/**
 * Register a LangGraph graph as an adapter.
 * Convenience helper for quick setup.
 */
export function registerLangGraphAdapter(name: string, graph: unknown): LangGraphAdapter {
  return new LangGraphAdapter({ name, graph })
}
