/**
 * Execution trace types — the core data model for Agent observability.
 */

export interface ExecutionTrace {
  id: string
  runId: string
  steps: TraceStep[]
  metadata: TraceMetadata
  createdAt: Date
}

export interface TraceMetadata {
  agentName: string
  agentVersion?: string
  environment: 'development' | 'staging' | 'production' | 'ci'
  os?: string
  runtime?: string
  dependencies?: Record<string, string>
  tags?: string[]
  custom?: Record<string, unknown>
}

export interface TraceStep {
  id: string
  sequence: number
  type: TraceStepType

  // Timing
  startedAt: Date
  endedAt?: Date
  duration?: number // milliseconds

  // LLM Call specific
  llmProvider?: string
  llmModel?: string
  llmRequest?: LLMRequest
  llmResponse?: LLMResponse

  // Tool Call specific
  toolName?: string
  toolRequest?: ToolRequest
  toolResponse?: ToolResponse

  // Usage (per step)
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number

  // Status
  status: StepStatus
  error?: TraceError

  // Streaming
  isStreaming?: boolean
  streamChunks?: number
  streamLatency?: number

  // Metadata
  metadata?: Record<string, unknown>
}

export type TraceStepType =
  | 'llm_call'
  | 'tool_call'
  | 'response'
  | 'error'

export type StepStatus =
  | 'success'
  | 'error'
  | 'timeout'

export interface LLMRequest {
  provider: string
  model: string
  messages: Message[]
  tools?: ToolDefinition[]
  temperature: number
  maxTokens: number
  topP?: number
  stop?: string[]
  seed?: number
  metadata?: Record<string, unknown>
}

export interface LLMResponse {
  content: string | null
  toolCalls?: ToolCall[]
  finishReason: string
  usage: TokenUsage
  model: string
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  name?: string
  toolCalls?: ToolCall[]
  toolCallId?: string
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolRequest {
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResponse {
  result: unknown
  error?: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface TraceError {
  message: string
  type: 'api_error' | 'timeout' | 'rate_limit' | 'validation' | 'unknown'
  statusCode?: number
  retryable: boolean
  details?: Record<string, unknown>
}
