/**
 * Shared type definitions for the AgentBench VS Code extension.
 */

// ---- Test Results (matches agentbench test --json output) ----

export interface TestAssertion {
  passed: number;
  failed: number;
  total: number;
}

export interface TestCaseResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  duration: number;
  assertions: TestAssertion;
}

export interface TestRunSummary {
  total: number;
  passed: number;
  failed: number;
  errored: number;
}

export interface TestRunOutput {
  results: TestCaseResult[];
  summary: TestRunSummary;
}

// ---- Run config ----

export interface RunConfig {
  name: string;
  description?: string;
  projectId: string;
  testCaseId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ---- Agent Config ----

export interface AgentConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom';
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools?: ToolConfig[];
}

export interface ToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ---- Run Results (from AgentBench Core) ----

export type RunStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error'
  | 'timeout'
  | 'cancelled';

export interface RunMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  totalLatency: number;
  firstTokenLatency?: number;
  toolCallCount: number;
  toolSuccessCount: number;
  toolFailureCount: number;
  stepCount: number;
  llmCallCount: number;
}

export interface Score {
  evaluator: string;
  score: number;
  maxScore: number;
  reason?: string;
  judgeModel?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface AssertionResult {
  type: string;
  status: 'passed' | 'failed' | 'error' | 'skipped';
  expected?: unknown;
  actual?: unknown;
  message?: string;
  duration?: number;
}

// ---- Execution Trace (from AgentBench Core) ----

export interface ExecutionTrace {
  id: string;
  runId: string;
  steps: TraceStep[];
  metadata: TraceMetadata;
  createdAt: string;
}

export interface TraceMetadata {
  agentName: string;
  agentVersion?: string;
  environment: 'development' | 'staging' | 'production' | 'ci';
  os?: string;
  runtime?: string;
  dependencies?: Record<string, string>;
  tags?: string[];
  custom?: Record<string, unknown>;
}

export interface TraceStep {
  id: string;
  sequence: number;
  type: TraceStepType;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  llmProvider?: string;
  llmModel?: string;
  llmRequest?: LLMRequest;
  llmResponse?: LLMResponse;
  toolName?: string;
  toolRequest?: ToolRequest;
  toolResponse?: ToolResponse;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  status: StepStatus;
  error?: TraceError;
  isStreaming?: boolean;
  streamChunks?: number;
  streamLatency?: number;
  metadata?: Record<string, unknown>;
}

export type TraceStepType = 'llm_call' | 'tool_call' | 'response' | 'error';
export type StepStatus = 'success' | 'error' | 'timeout';

export interface LLMRequest {
  provider: string;
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  temperature: number;
  maxTokens: number;
  topP?: number;
  stop?: string[];
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  finishReason: string;
  usage: TokenUsage;
  model: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResponse {
  result: unknown;
  error?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TraceError {
  message: string;
  type: 'api_error' | 'timeout' | 'rate_limit' | 'validation' | 'unknown';
  statusCode?: number;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ---- Coverage ----

export interface CoverageReport {
  suites: number;
  tests: number;
  assertions: number;
  evaluated: number;
  coverage: number; // percentage
  uncovered: Array<{ suite: string; test: string; assertion: string }>;
}

// ---- History ----

export interface HistoryEntry {
  id: string;
  timestamp: string;
  summary: TestRunSummary;
  command: string;
}

// ---- Tree View Items ----

export type TreeItemType =
  | 'runAll'
  | 'runSuite'
  | 'runFile'
  | 'historyEntry'
  | 'suite'
  | 'testCase'
  | 'coverageSummary'
  | 'coverageFile'
  | 'snapshotGroup'
  | 'snapshot';
