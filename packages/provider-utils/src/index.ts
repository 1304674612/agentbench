/**
 * @agentbench/provider-utils
 *
 * Shared foundation for building AgentBench LLM provider plugins.
 * Provides the canonical `AgentBenchProvider` interface, an abstract
 * `OpenAICompatibleProvider` base class, token counting, cost calculation,
 * and SSE streaming utilities.
 *
 * @example
 * ```typescript
 * import { OpenAICompatibleProvider, AgentBenchProvider, tokenCounter, costCalculator } from '@agentbench/provider-utils'
 * ```
 *
 * @packageDocumentation
 */

// ── Types ──────────────────────────────────────────────────────────────────────
export type {
  AgentBenchProvider,
  ProviderCapabilities,
  ProviderConfig,
  HealthStatus,
  ChatCompletionParams,
  ChatCompletionResult,
  ChatMessage,
  ChatContentPart,
  ChatChoice,
  StreamChunk,
  StreamChoice,
  ToolCall,
  ToolDefinition,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
} from './types'

// ── Base Class ─────────────────────────────────────────────────────────────────
export { OpenAICompatibleProvider } from './openai-compatible'

// ── Utilities ──────────────────────────────────────────────────────────────────
export { TokenCounter, tokenCounter } from './token-counter'
export { CostCalculator, costCalculator, calculateCost } from './cost-calculator'

// ── Streaming ──────────────────────────────────────────────────────────────────
export {
  createSSEParser,
  parseSSEBody,
  extractTextFromEvent,
} from './streaming'
export type {
  ParsedSSEEvent,
  SSEParserState,
  StreamingToolCall,
} from './streaming'
