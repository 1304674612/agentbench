/**
 * @agentbench/core
 *
 * The core engine for AgentBench — Agent Regression Testing Framework.
 *
 * @packageDocumentation
 */

// Types — re-export all public types
export type * from './types'

// Core Engine (Phase 1)
export * from './runner'
export * from './tracer'
export * from './storage'
export { tokenCounter, costCalculator, TokenCounter, CostCalculator } from './utils/token-counter'

// Phase 2: Evaluation & Assertion
export * from './evaluator'
export * from './assertion'
// Phase 3: Regression & Replay
export * from './snapshot'
export * from './replay'
export * from './diff'
// Phase 4: Experiments & Coverage
export * from './experiment'
export * from './coverage'

// Version
export const VERSION = '0.1.0'
