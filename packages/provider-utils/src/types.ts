/**
 * @agentbench/provider-utils
 *
 * Shared utilities for building AgentBench provider plugins.
 * Every provider (OpenAI, Anthropic, Gemini, DeepSeek, etc.) implements
 * the AgentBenchProvider interface defined here.
 *
 * @packageDocumentation
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Capabilities that a provider may support.
 */
export interface ProviderCapabilities {
  /** Whether the provider supports SSE streaming */
  streaming: boolean
  /** Whether the provider supports reasoning/thinking models (o1, o3, Claude thinking) */
  reasoning: boolean
  /** Whether the provider supports embeddings */
  embeddings: boolean
  /** Whether the provider supports tool calling */
  toolCalling: boolean
  /** Whether the provider supports vision/image inputs */
  vision: boolean
  /** Whether the provider supports function calling (legacy OpenAI) */
  functionCalling: boolean
  /** Whether the provider supports structured JSON output mode */
  jsonMode: boolean
  /** Maximum context window size in tokens */
  maxContextWindow: number
  /** List of supported model IDs */
  supportedModels: string[]
}

// ── Chat Completion Types ───────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ChatContentPart[]
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatCompletionParams {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
  tools?: ToolDefinition[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  responseFormat?: { type: 'text' | 'json_object' | 'json_schema'; json_schema?: unknown }
  seed?: number
  stream?: boolean
  /** Provider-specific extra options */
  extra?: Record<string, unknown>
}

export interface ChatCompletionResult {
  id: string
  model: string
  choices: ChatChoice[]
  usage: Usage
  created: number
  /** Provider that generated this result */
  provider: string
}

export interface ChatChoice {
  index: number
  message: ChatMessage
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call' | null
}

export interface StreamChunk {
  id: string
  model: string
  choices: StreamChoice[]
  usage?: Partial<Usage>
  created: number
  provider: string
}

export interface StreamChoice {
  index: number
  delta: {
    role?: string
    content?: string
    tool_calls?: Partial<ToolCall>[]
    function_call?: { name?: string; arguments?: string }
  }
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call' | null
}

// ── Usage & Cost ────────────────────────────────────────────────────────────

export interface Usage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** Provider-specific usage breakdown */
  breakdown?: Record<string, number>
}

export interface CostBreakdown {
  promptCost: number
  completionCost: number
  totalCost: number
  currency: string
  model: string
  /** Per-token rates used */
  rates: {
    promptPer1K: number
    completionPer1K: number
  }
}

// ── Token Counting ──────────────────────────────────────────────────────────

export interface TokenCountParams {
  model: string
  messages?: ChatMessage[]
  text?: string
}

export interface TokenCountResult {
  tokens: number
  model: string
  /** Method used: 'tiktoken' | 'heuristic' | 'api' */
  method: 'tiktoken' | 'heuristic' | 'api'
}

// ── Provider Lifecycle ──────────────────────────────────────────────────────

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  organizationId?: string
  defaultModel?: string
  timeout?: number
  maxRetries?: number
  /** Provider-specific config */
  extra?: Record<string, unknown>
}

export interface HealthStatus {
  healthy: boolean
  latency?: number
  message?: string
  model?: string
}

// ── The Provider Interface ──────────────────────────────────────────────────

/**
 * The canonical provider interface.
 *
 * Every LLM provider (OpenAI, Anthropic, Gemini, DeepSeek, etc.)
 * implements this interface. This enables AgentBench to work
 * uniformly with any provider.
 *
 * To add a new provider:
 * 1. Create a class implementing this interface
 * 2. Export it from a package named @agentbench/provider-<name>
 * 3. It will be auto-discovered by AgentBench at startup
 *
 * @example
 * ```ts
 * class MyProvider implements AgentBenchProvider {
 *   readonly id = 'my-provider'
 *   readonly name = 'My Custom Provider'
 *   readonly version = '1.0.0'
 *   readonly capabilities = { ... }
 *
 *   async createChatCompletion(params) { ... }
 *   async createStreamingChatCompletion(params) { ... }
 *   async countTokens(params) { ... }
 *   calculateCost(usage, model) { ... }
 *   async initialize(config) { ... }
 *   async healthCheck() { ... }
 *   async dispose() { ... }
 * }
 * ```
 */
export interface AgentBenchProvider {
  /** Unique provider identifier (e.g. 'openai', 'anthropic', 'gemini') */
  readonly id: string

  /** Human-readable provider name */
  readonly name: string

  /** Provider package version */
  readonly version: string

  /** What this provider can do */
  readonly capabilities: ProviderCapabilities

  // ── Core Methods ──────────────────────────────────────────────────────────

  /**
   * Create a chat completion (non-streaming).
   * Returns the full response with all choices, usage, and metadata.
   */
  createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>

  /**
   * Create a streaming chat completion.
   * Returns an async generator that yields chunks as they arrive.
   */
  createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined>

  /**
   * Count tokens for the given input.
   * Used for cost estimation before making the actual call.
   */
  countTokens(params: TokenCountParams): Promise<TokenCountResult>

  /**
   * Calculate the cost of a completion based on token usage.
   */
  calculateCost(usage: Usage, model: string): CostBreakdown

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Initialize the provider.
   * Called once at startup. Use this to validate API keys, warm up connections, etc.
   */
  initialize(config: ProviderConfig): Promise<void>

  /**
   * Check if the provider is healthy.
   * Makes a minimal API call (e.g., list models) to verify connectivity.
   */
  healthCheck(): Promise<HealthStatus>

  /**
   * Clean up resources.
   * Called on shutdown or when the provider is no longer needed.
   */
  dispose(): Promise<void>
}
