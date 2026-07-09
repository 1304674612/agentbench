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

// Coming in Phase 2:
// export * from './evaluator'
// export * from './assertion'
// Coming in Phase 3:
// export * from './snapshot'
// export * from './diff'
// export * from './replay'
// Coming in Phase 4:
// export * from './coverage'
// export * from './experiment'
// export * from './reporter'

// Version
export const VERSION = '0.1.0'
