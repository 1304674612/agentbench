/**
 * @agentbench/config
 *
 * Configuration system for AgentBench — type-safe config definition,
 * Jest / Vitest-style config file resolution, runtime Zod validation,
 * and smart defaults.
 *
 * @packageDocumentation
 *
 * @example Quick start
 * ```ts
 * import { defineConfig } from '@agentbench/config'
 *
 * export default defineConfig({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY, provider: 'openai' }
 *   }
 * })
 * ```
 *
 * @example Programmatic usage
 * ```ts
 * import { loadConfig, AgentBenchConfigSchema } from '@agentbench/config'
 *
 * const config = await loadConfig()
 * const parsed = AgentBenchConfigSchema.parse(config)
 * ```
 */

// ── Config definition ────────────────────────────────────────────────────────
export { defineConfig, resolveConfig } from './define-config'

// ── Config loading and resolution ────────────────────────────────────────────
export { loadConfig, resolveConfigPath } from './loader'

// ── Smart defaults ───────────────────────────────────────────────────────────
export { defaults } from './defaults'

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  // Provider
  ProviderId,
  ProviderConfig,
  // Agent
  ToolConfig,
  AgentConfig,
  // Test
  TestConfig,
  // Assertion
  AssertionDefaults,
  // Replay
  ReplayMode,
  ReplayConfig,
  // Evaluation
  JudgeDimension,
  EvaluationConfig,
  // Coverage
  CoverageDimensionName,
  CoverageConfig,
  // Report
  ReportFormat,
  ReportConfig,
  // CI
  CIProvider,
  CIConfig,
  // Top-level
  AgentBenchConfig,
  AgentBenchUserConfig,
  DeepPartial,
  AgentBenchConfigInferred,
} from './types'

// ── Zod schemas ──────────────────────────────────────────────────────────────
export {
  ToolConfigSchema,
  ProviderConfigSchema,
  AgentConfigSchema,
  TestConfigSchema,
  AssertionDefaultsSchema,
  ReplayConfigSchema,
  EvaluationConfigSchema,
  CoverageConfigSchema,
  ReportConfigSchema,
  CIConfigSchema,
  AgentBenchConfigSchema,
} from './types'
