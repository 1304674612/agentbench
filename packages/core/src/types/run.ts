import type { ExecutionTrace } from './trace'

export type RunStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error'
  | 'timeout'
  | 'cancelled'

/**
 * Persisted Run record in the database.
 */
export interface Run {
  id: string
  projectId: string
  testCaseId?: string
  userId?: string
  name: string
  status: RunStatus
  config: Record<string, unknown>
  metrics?: Record<string, unknown>
  startedAt?: Date
  endedAt?: Date
  duration?: number
  summary?: string
  error?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface RunConfig {
  name: string
  description?: string
  projectId: string
  testCaseId?: string

  agent: AgentConfig
  input: RunInput
  options: RunOptions

  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface AgentConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom'
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  tools?: ToolConfig[]
  apiKey?: string
  apiBase?: string
}

export interface ToolConfig {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface RunInput {
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  variables?: Record<string, string>
  context?: Record<string, unknown>
}

export interface RunOptions {
  timeout: number
  maxSteps: number
  retries: number
  concurrency: number
  seed?: number
}

export interface RunResult {
  id: string
  config: RunConfig
  status: RunStatus

  trace: ExecutionTrace
  metrics: RunMetrics

  scores: Score[]
  assertionResults: AssertionResult[]

  startedAt: Date
  endedAt?: Date
  duration?: number

  summary?: string
  error?: string
}

export interface RunMetrics {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  totalCost: number
  totalLatency: number
  firstTokenLatency?: number
  toolCallCount: number
  toolSuccessCount: number
  toolFailureCount: number
  stepCount: number
  llmCallCount: number
}

export interface Score {
  evaluator: string
  score: number
  maxScore: number
  reason?: string
  judgeModel?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface AssertionResult {
  type: string
  status: 'passed' | 'failed' | 'error' | 'skipped'
  expected?: unknown
  actual?: unknown
  message?: string
  duration?: number
}

export interface RunSummary {
  id: string
  name: string
  status: RunStatus
  projectId: string
  testCaseId?: string
  duration?: number
  totalTokens?: number
  totalCost?: number
  createdAt: Date
  tags?: string[]
}
