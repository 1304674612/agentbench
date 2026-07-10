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
  ExecutionTrace,
  TraceStep,
  ToolDefinition,
} from '@agentbench/core'
import { tokenCounter, costCalculator, StreamCapture } from '@agentbench/core'
import type {
  ChatMessage,
  ProviderCapabilities,
  ProviderConfig,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

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

const OPENAI_MODELS = [
  'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
  'gpt-4-turbo', 'gpt-4', 'gpt-4-32k', 'gpt-3.5-turbo',
  'o1', 'o1-mini', 'o1-pro', 'o3', 'o3-mini', 'o4-mini',
]

export class AgentBenchOpenAI {
  // ── AgentBenchProvider identity ──────────────────────────────────────────
  readonly id = 'openai'
  readonly name = 'OpenAI'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: true,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 200000,
    supportedModels: OPENAI_MODELS,
  }

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

    let requestBody: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      tools: params.tools,
      tool_choice: params.tool_choice,
      seed: params.seed,
      stop: params.stop,
    }

    // Adapt for reasoning models (o1, o3)
    if (this._isReasoningModel(params.model)) {
      requestBody = this._adaptForReasoning(requestBody, params.model)
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
          toolCalls: response.tool_calls?.map((tc: { id: string; type: string; function: { name: string; arguments: string } }) => ({
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
   * Yields traced chunks as they arrive, with tool call support.
   */
  async *createStreamingChatCompletion(params: {
    model: string
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    temperature?: number
    max_tokens?: number
    tools?: Array<{
      type: 'function'
      function: { name: string; description: string; parameters: Record<string, unknown> }
    }>
  }): AsyncGenerator<OpenAIStreamingChunk> {
    const startTime = Date.now()
    const requestBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      tools: params.tools,
      stream: true as const,
    }

    try {
      const stream = await this._callOpenAIStreamRaw(requestBody)
      const capture = new StreamCapture('openai')
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let lastFullText = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          capture.processChunk(text)

          const assembled = capture.getAssembledResponse()
          const newText = assembled.fullText.slice(lastFullText.length)
          lastFullText = assembled.fullText

          const toolCallsInfo = assembled.toolCalls.map((tc, idx) => ({
            index: idx,
            id: tc.id,
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          }))

          yield {
            content: newText,
            fullContent: assembled.fullText,
            finishReason: null,
            model: params.model,
            toolCalls: toolCallsInfo.length > 0 ? toolCallsInfo : undefined,
          }
        }
      } finally {
        reader.releaseLock()
      }

      const endTime = Date.now()
      const assembled = capture.getAssembledResponse()
      const metrics = capture.getStreamingMetrics()
      const streamLatency = capture.getTimeToFirstToken()

      // Emit trace step for the full streaming response
      if (this._context.onStep) {
        const promptText = params.messages.map((m) => m.content).join('\n')
        const promptTokens = assembled.usage?.promptTokens ?? tokenCounter.estimateTokens(promptText)
        const completionTokens =
          assembled.usage?.completionTokens ?? tokenCounter.estimateTokens(assembled.fullText)
        const totalTokens = assembled.usage?.totalTokens ?? promptTokens + completionTokens
        const cost = costCalculator.calculate(params.model, promptTokens, completionTokens)

        const assembledToolCalls = assembled.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }))

        this._context.onStep({
          id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          sequence: 0,
          type: 'llm_call',
          startedAt: new Date(startTime),
          endedAt: new Date(endTime),
          duration: endTime - startTime,
          llmRequest: {
            provider: 'openai',
            model: params.model,
            messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: params.temperature ?? 0.7,
            maxTokens: params.max_tokens ?? 4096,
          },
          llmResponse: {
            content: assembled.fullText || null,
            toolCalls: assembledToolCalls.length > 0 ? assembledToolCalls : undefined,
            finishReason: assembled.finishReason,
            usage: { promptTokens, completionTokens, totalTokens },
            model: params.model,
          },
          llmProvider: 'openai',
          llmModel: params.model,
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          status: 'success',
          isStreaming: true,
          streamChunks: metrics.chunkCount,
          streamLatency,
        } as TraceStep)
      }
    } catch (err) {
      const endTime = Date.now()
      this._context.onStep?.({
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'error',
        startedAt: new Date(startTime),
        endedAt: new Date(endTime),
        duration: endTime - startTime,
        status: 'error' as const,
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'api_error' as const,
          retryable: true,
        },
      } as TraceStep)
      throw err
    }
  }

  /**
   * Create a streaming chat completion that returns a ReadableStream
   * plus an assemble() callback for deferred tracing and full response assembly.
   */
  async streamChatCompletion(params: {
    model: string
    messages: Array<{ role: string; content: string; name?: string }>
    temperature?: number
    max_tokens?: number
    tools?: Array<{
      type: 'function'
      function: { name: string; description: string; parameters: Record<string, unknown> }
    }>
  }): Promise<ChatCompletionStreamResult> {
    const requestBody = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4096,
      tools: params.tools,
      stream: true,
    }

    // Make the HTTP call and get the raw response stream
    const url = `${this.config.baseURL ?? 'https://api.openai.com/v1'}/chat/completions`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
        },
        body: JSON.stringify({ ...requestBody, stream: true }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      throw new Error(
        `OpenAI API error ${response.status}: ${errBody.error?.message ?? response.statusText}`
      )
    }

    if (!response.body) {
      throw new Error('No response body for streaming')
    }

    // Tee the stream so we can return it raw AND capture it
    const [returnStream, captureStream] = response.body.tee()

    // Build the assemble callback that runs StreamCapture on the tee'd stream
    const assemble = async (): Promise<ChatCompletionResult> => {
      const streamStart = Date.now()
      const capture = new StreamCapture('openai')
      await capture.captureStream(captureStream)
      const assembleEndTime = Date.now()
      const assembled = capture.getAssembledResponse()
      const metrics = capture.getStreamingMetrics()

      const promptText = params.messages.map((m) => m.content ?? '').join('\n')
      const promptTokens =
        assembled.usage?.promptTokens ?? tokenCounter.estimateTokens(promptText)
      const completionTokens =
        assembled.usage?.completionTokens ?? tokenCounter.estimateTokens(assembled.fullText)
      const totalTokens = assembled.usage?.totalTokens ?? promptTokens + completionTokens
      const cost = costCalculator.calculate(params.model, promptTokens, completionTokens)

      const assembledToolCalls = assembled.toolCalls?.map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }))

      const step: TraceStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sequence: 0,
        type: 'llm_call',
        startedAt: new Date(streamStart),
        endedAt: new Date(assembleEndTime),
        duration: assembleEndTime - streamStart,
        llmProvider: 'openai',
        llmModel: params.model,
        llmRequest: {
          provider: 'openai',
          model: params.model,
          messages: params.messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant' | 'tool',
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
        llmResponse: {
          content: assembled.fullText || null,
          toolCalls: assembledToolCalls,
          finishReason: assembled.finishReason,
          usage: { promptTokens, completionTokens, totalTokens },
          model: params.model,
        },
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        status: 'success',
        isStreaming: true,
        streamChunks: metrics.chunkCount,
        streamLatency: capture.getTimeToFirstToken(),
      }

      this._context.onStep?.(step)

      return {
        id: `chatcmpl-${Date.now()}`,
        model: params.model,
        content: assembled.fullText || null,
        tool_calls: assembledToolCalls,
        finish_reason: assembled.finishReason,
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
        cost,
        duration: assembleEndTime - streamStart,
        trace: step,
      }
    }

    return { stream: returnStream, assemble }
  }

  /**
   * Internal: Make the HTTP request to OpenAI API.
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

      const raw = (await res.json()) as RawOpenAIResponse
      const choice = raw.choices?.[0]

      return {
        id: raw.id,
        model: raw.model,
        content: choice?.message?.content ?? null,
        tool_calls: choice?.message?.tool_calls,
        finish_reason: choice?.finish_reason,
        usage: raw.usage,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Internal: Stream from OpenAI API, returning a ReadableStream.
   */
  private async _callOpenAIStreamRaw(body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
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

    if (!res.body) {
      throw new Error('No response body for streaming')
    }

    return res.body
  }

  // ── AgentBenchProvider Lifecycle ─────────────────────────────────────────

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.apiKey) this.config.apiKey = config.apiKey
    if (config.baseUrl) this.config.baseURL = config.baseUrl
    if (config.timeout) this.config.timeout = config.timeout
    if (config.maxRetries !== undefined) this.config.maxRetries = config.maxRetries
    // Initialize tracing context
    if (config.extra?.tracing !== undefined) this.config.tracing = config.extra.tracing as boolean
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    return { tokens: await Promise.resolve(tokenCounter.estimateTokens(
      typeof params.text === 'string'
        ? params.text
        : params.messages?.map((m: ChatMessage) => typeof m.content === 'string' ? m.content : '').join('\n') ?? ''
    )), model: params.model, method: 'heuristic' }
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    const pricing = costCalculator.getPricing(model)
    const promptCost = (usage.promptTokens / 1_000_000) * pricing.input
    const completionCost = (usage.completionTokens / 1_000_000) * pricing.output
    return {
      promptCost, completionCost, totalCost: promptCost + completionCost,
      currency: 'USD', model,
      rates: { promptPer1K: pricing.input / 1000, completionPer1K: pricing.output / 1000 },
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.config.baseURL ?? 'https://api.openai.com/v1'}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      return { healthy: res.ok, latency: Date.now() - start, message: res.ok ? 'Connected' : `HTTP ${res.status}` }
    } catch (err) {
      return { healthy: false, latency: Date.now() - start, message: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  async dispose(): Promise<void> {
    this._context = {}
  }

  // ── Reasoning Model Support ───────────────────────────────────────────────

  /** Check if the model is a reasoning model (o1, o3 family) */
  private _isReasoningModel(model: string): boolean {
    return model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4')
  }

  /** Adapt request body for reasoning models */
  private _adaptForReasoning(body: Record<string, unknown>, model: string): Record<string, unknown> {
    const adapted = { ...body }
    // Reasoning models use max_completion_tokens instead of max_tokens
    if ('max_tokens' in adapted) {
      adapted.max_completion_tokens = adapted.max_tokens
      delete adapted.max_tokens
    }
    // Reasoning models don't support temperature
    delete adapted.temperature
    // Add reasoning_effort parameter for o1/o3 models
    adapted.reasoning_effort = (body.reasoning_effort as string) ?? 'medium'
    // o1-mini and o1-preview need system message converted to user
    // o1 and o3 (GA) support system messages natively
    if (model.includes('mini') || model.includes('preview')) {
      const messages = adapted.messages as Array<{ role: string; content: string }>
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'system') {
          messages[i].role = 'user'
        }
      }
    }
    return adapted
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

export interface OpenAIStreamingChunk {
  content: string
  fullContent: string
  finishReason: string | null
  model: string
  toolCalls?: Array<{
    index: number
    id: string
    name: string
    arguments: string
  }>
}

export interface ChatCompletionStreamResult {
  stream: ReadableStream<Uint8Array>
  assemble: () => Promise<ChatCompletionResult>
}

interface OpenAIResponse {
  id: string
  model: string
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  finish_reason?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface RawOpenAIResponse {
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

// ============================================================
// Factory function
// ============================================================

export function createOpenAIClient(config: AgentBenchOpenAIConfig): AgentBenchOpenAI {
  return new AgentBenchOpenAI(config)
}

export async function runWithOpenAI(params: {
  client: AgentBenchOpenAI
  agent: AgentConfig
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  tools?: ToolDefinition[]
  maxSteps?: number
}): Promise<{ output: string; trace: ExecutionTrace; cost: number }> {
  const { client, agent, messages, tools, maxSteps = 10 } = params
  const steps: TraceStep[] = []

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

    if (result.tool_calls && result.tool_calls.length > 0) {
      for (const tc of result.tool_calls) {
        currentMessages.push({
          role: 'assistant',
          content: JSON.stringify({ tool_calls: [tc] }),
        } as { role: 'user' | 'assistant'; content: string })
      }
    } else {
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
