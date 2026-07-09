/**
 * @agentbench/openai
 *
 * OpenAI SDK wrapper with automatic tracing.
 * Wraps the official `openai` npm package and intercepts all API calls
 * to capture traces, count tokens, and calculate costs.
 *
 * @example
 * ```typescript
 * import { AgentBenchOpenAI } from '@agentbench/openai'
 * import { Runner } from '@agentbench/core'
 *
 * const client = new AgentBenchOpenAI({ apiKey: process.env.OPENAI_API_KEY })
 * const runner = new Runner({ agent: { provider: 'openai', model: 'gpt-4o', ... } })
 *
 * // The wrapper transparently intercepts all calls
 * const response = await client.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * })
 * ```
 */

import type {
  AgentConfig,
  RunResult,
  ExecutionTrace,
  TraceStep,
  LLMRequest,
  LLMResponse,
  ToolDefinition,
  TokenUsage,
} from '@agentbench/core'
import { tokenCounter, costCalculator } from '@agentbench/core'

// ============================================================
// Types
// ============================================================

export interface AgentBenchOpenAIConfig {
  apiKey: string
  baseURL?: string
  organization?: string
  /** Enable automatic tracing */
  tracing?: boolean
  /** Custom timeout (ms) */
  timeout?: number
  /** Max retries */
  maxRetries?: number
}

export interface OpenAIInterceptContext {
  runId?: string
  agentConfig?: AgentConfig
  onStep?: (step: TraceStep) => void
}

// ============================================================
// Main Client
// ============================================================

export class AgentBenchOpenAI {
  public config: AgentBenchOpenAIConfig
  private _context: OpenAIInterceptContext = {}

  constructor(config: AgentBenchOpenAIConfig) {
    this.config = {
      tracing: true,
      timeout: 60000,
      maxRetries: 2,
      ...config,
    }
  }

  /**
   * Set the interception context for a specific agent run.
   */
  setContext(ctx: OpenAIInterceptContext): void {
    this._context = ctx
  }

  /**
   * Create a traced chat completion.
   *
   * This method wraps the OpenAI chat.completions.create call,
   * automatically capturing request/response data, token usage, and cost.
   */
  async createChatCompletion(params: {
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; name?: string }>
    temperature?: number
    max_tokens?: number
    tools?: Array<{
      type: 'function'
      function: { name: string; description: string; parameters: Record<string, unknown> }
    }>
    tool_choice?: string
    seed?: number
    stop?: string[]
  }): Promise<ChatCompletionResult> {
    const startTime = Date.now()

    const requestBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      tools: params.tools,
      tool_choice: params.tool_choice,
      seed: params.seed,
      stop: params.stop,
    }

    // Build trace step for the LLM request
    const traceStep: Partial<TraceStep> = {
      type: 'llm_call',
      startedAt: new Date(startTime),
      llmProvider: 'openai',
      llmModel: params.model,
      llmRequest: {
        provider: 'openai',
        model: params.model,
        messages: params.messages.map((m) => ({
          role: m.role,
          content: m.content,
          name: m.name,
        })),
        tools: params.tools?.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          },
        })),
        temperature: params.temperature ?? 0.7,
        maxTokens: params.max_tokens ?? 4096,
      },
    }

    try {
      // Make the actual API call
      const response = await this._callOpenAI(requestBody)
      const endTime = Date.now()
      const duration = endTime - startTime

      // Count tokens
      const promptText = params.messages.map((m) => m.content).join('\n')
      const completionText = response.content ?? ''
      const promptTokens = tokenCounter.estimateTokens(promptText)
      const completionTokens = tokenCounter.estimateTokens(completionText)
      const totalTokens = response.usage
        ? response.usage.total_tokens
        : promptTokens + completionTokens

      // Calculate cost
      const cost = costCalculator.calculate(
        params.model,
        response.usage?.prompt_tokens ?? promptTokens,
        response.usage?.completion_tokens ?? completionTokens,
      )

      // Complete the trace step
      const completedStep: TraceStep = {
        ...traceStep,
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0, // Set by tracer
        type: 'llm_call',
        startedAt: new Date(startTime),
        endedAt: new Date(endTime),
        duration,
        llmResponse: {
          content: response.content ?? null,
          toolCalls: response.tool_calls?.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
          finishReason: response.finish_reason ?? 'stop',
          usage: {
            promptTokens: response.usage?.prompt_tokens ?? promptTokens,
            completionTokens: response.usage?.completion_tokens ?? completionTokens,
            totalTokens,
          },
          model: params.model,
        },
        promptTokens: response.usage?.prompt_tokens ?? promptTokens,
        completionTokens: response.usage?.completion_tokens ?? completionTokens,
        totalTokens,
        cost,
        status: 'success',
      } as TraceStep

      // Notify tracer
      this._context.onStep?.(completedStep)

      return {
        id: `chatcmpl-${Date.now()}`,
        model: params.model,
        content: response.content ?? null,
        tool_calls: response.tool_calls,
        finish_reason: response.finish_reason ?? 'stop',
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? promptTokens,
          completion_tokens: response.usage?.completion_tokens ?? completionTokens,
          total_tokens: totalTokens,
        },
        cost,
        duration,
        trace: completedStep,
      }
    } catch (err) {
      const endTime = Date.now()
      const errorStep: TraceStep = {
        ...traceStep,
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'error',
        startedAt: new Date(startTime),
        endedAt: new Date(endTime),
        duration: endTime - startTime,
        status: 'error',
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'api_error',
          retryable: true,
        },
      } as TraceStep

      this._context.onStep?.(errorStep)
      throw err
    }
  }

  /**
   * Create a streaming chat completion.
   * Yields traced chunks as they arrive.
   */
  async *createStreamingChatCompletion(params: {
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    max_tokens?: number
  }): AsyncGenerator<StreamingChunk> {
    const startTime = Date.now()

    const requestBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      stream: true as const,
    }

    try {
      const response = await this._callOpenAIStream(requestBody)
      let fullContent = ''

      for await (const chunk of response) {
        const delta = chunk.choices?.[0]?.delta
        const content = delta?.content ?? ''
        fullContent += content

        yield {
          content,
          fullContent,
          finishReason: chunk.choices?.[0]?.finish_reason ?? null,
          model: params.model,
        }
      }

      const endTime = Date.now()

      // Emit trace step for the full streaming response
      if (this._context.onStep) {
        const promptText = params.messages.map((m) => m.content).join('\n')
        const promptTokens = tokenCounter.estimateTokens(promptText)
        const completionTokens = tokenCounter.estimateTokens(fullContent)
        const cost = costCalculator.calculate(params.model, promptTokens, completionTokens)

        this._context.onStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sequence: 0,
          type: 'response',
          startedAt: new Date(startTime),
          endedAt: new Date(endTime),
          duration: endTime - startTime,
          llmResponse: {
            content: fullContent,
            finishReason: 'stop',
            usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
            model: params.model,
          },
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost,
          status: 'success',
        } as TraceStep)
      }
    } catch (err) {
      const errorStep: TraceStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'error',
        startedAt: new Date(startTime),
        endedAt: new Date(),
        duration: Date.now() - startTime,
        status: 'error' as const,
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'api_error' as const,
          retryable: true,
        },
      }
      this._context.onStep?.(errorStep)
      throw err
    }
  }

  /**
   * Internal: Make the HTTP request to OpenAI API.
   * In production, this would use the `openai` npm package.
   * This implementation uses fetch for zero-dependency compatibility.
   */
  private async _callOpenAI(body: Record<string, unknown>): Promise<OpenAIResponse> {
    const url = `${this.config.baseURL ?? 'https://api.openai.com/v1'}/chat/completions`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
        },
        body: JSON.stringify({ ...body, stream: false }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(
          `OpenAI API error ${res.status}: ${(errBody as { error?: { message?: string } }).error?.message ?? res.statusText}`,
        )
      }

      return (await res.json()) as OpenAIResponse
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Internal: Stream from OpenAI API.
   */
  private async *_callOpenAIStream(body: Record<string, unknown>): AsyncGenerator<StreamingDelta> {
    const url = `${this.config.baseURL ?? 'https://api.openai.com/v1'}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
      },
      body: JSON.stringify({ ...body, stream: true }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(
        `OpenAI API error ${res.status}: ${(errBody as { error?: { message?: string } }).error?.message ?? res.statusText}`,
      )
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body for streaming')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') return
        try {
          yield JSON.parse(data) as StreamingDelta
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}

// ============================================================
// Response types
// ============================================================

export interface ChatCompletionResult {
  id: string
  model: string
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  finish_reason: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cost: number
  duration: number
  trace: TraceStep
}

export interface StreamingChunk {
  content: string
  fullContent: string
  finishReason: string | null
  model: string
}

interface OpenAIResponse {
  id: string
  model: string
  choices?: Array<{
    message?: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface StreamingDelta {
  choices?: Array<{
    delta?: { role?: string; content?: string }
    finish_reason?: string | null
  }>
}

// ============================================================
// Factory function
// ============================================================

/**
 * Create an AgentBench-wrapped OpenAI client.
 */
export function createOpenAIClient(config: AgentBenchOpenAIConfig): AgentBenchOpenAI {
  return new AgentBenchOpenAI(config)
}

/**
 * Run an agent using the OpenAI wrapper with full tracing.
 */
export async function runWithOpenAI(params: {
  client: AgentBenchOpenAI
  agent: AgentConfig
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  tools?: ToolDefinition[]
  maxSteps?: number
}): Promise<{ output: string; trace: ExecutionTrace; cost: number }> {
  const { client, agent, messages, tools, maxSteps = 10 } = params
  const steps: TraceStep[] = []
  const startTime = Date.now()

  client.setContext({
    onStep: (step) => steps.push(step),
    agentConfig: agent,
  })

  let currentMessages = [...messages]
  let output = ''

  for (let i = 0; i < maxSteps; i++) {
    const result = await client.createChatCompletion({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        ...currentMessages,
      ],
      temperature: agent.temperature,
      max_tokens: agent.maxTokens,
      tools: tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      })),
    })

    if (result.content) {
      output = result.content
      currentMessages.push({ role: 'assistant', content: result.content })
    }

    // Handle tool calls
    if (result.tool_calls && result.tool_calls.length > 0) {
      for (const tc of result.tool_calls) {
        currentMessages.push({
          role: 'assistant',
          content: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls: [tc] as any,
        })
        // Tool response would be handled by the agent's tool executor
      }
    } else {
      // No tool calls — agent is done
      break
    }
  }

  const trace: ExecutionTrace = {
    id: `trace-${Date.now()}`,
    runId: '',
    steps,
    metadata: {
      agentName: agent.model,
      environment: 'development',
    },
    createdAt: new Date(),
  }

  const totalCost = steps.reduce((s, st) => s + (st.cost ?? 0), 0)

  return { output, trace, cost: totalCost }
}
