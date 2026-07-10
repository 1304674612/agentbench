import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Provider Config
// ─────────────────────────────────────────────────────────────────────────────

/** Supported LLM provider identifiers. */
export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom'

/**
 * Configuration for a single LLM provider.
 *
 * Each provider entry maps to an API connection. You may define multiple
 * named providers (e.g. `openai`, `anthropic`) and reference them
 * individually via `agent.provider`.
 */
export interface ProviderConfig {
  /** Provider identifier. Determines the SDK/HTTP adapter to use. */
  provider: ProviderId
  /** API key for the provider. Prefer reading from `process.env`. */
  apiKey?: string
  /** Base URL override (useful for proxies / self-hosted endpoints). */
  apiBase?: string
  /** Organization ID (OpenAI-specific). */
  organization?: string
  /** Additional HTTP headers to send with every request. */
  headers?: Record<string, string>
  /** Request timeout in milliseconds. */
  timeout?: number
  /** Maximum number of retries for transient failures. */
  maxRetries?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Config
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration for a single tool available to the agent. */
export interface ToolConfig {
  /** Unique tool name (must match the registered tool). */
  name: string
  /** Human-readable description passed to the LLM. */
  description: string
  /** JSON Schema describing the tool's parameters. */
  parameters: Record<string, unknown>
}

/**
 * Configuration for the agent under test.
 *
 * Defines which model to use, its system prompt, available tools,
 * and LLM sampling parameters.
 */
export interface AgentConfig {
  /** Provider ID (must match a key in `providers` or one of the built-in provider ids). */
  provider?: string
  /** Model string (e.g. `gpt-4o`, `claude-sonnet-4-20250514`). */
  model?: string
  /** System prompt injected at the start of every conversation. */
  systemPrompt?: string
  /** LLM temperature (0-2). Lower = more deterministic. */
  temperature?: number
  /** Maximum tokens per LLM completion. */
  maxTokens?: number
  /** Nucleus sampling parameter (0-1). */
  topP?: number
  /** Frequency penalty (-2.0 to 2.0). Positive values reduce repetition. */
  frequencyPenalty?: number
  /** Presence penalty (-2.0 to 2.0). Positive values encourage new topics. */
  presencePenalty?: number
  /** Stop sequences that halt generation. */
  stop?: string[]
  /** Tools available to the agent during execution. */
  tools?: ToolConfig[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test-execution configuration.
 *
 * Controls how test cases are discovered, executed, and retried.
 * Follows Jest / Vitest naming conventions so the mental model
 * transfers directly.
 */
export interface TestConfig {
  /** Directory containing test files (default: `'./tests'`). */
  testDir: string
  /** Glob pattern(s) to match test files within `testDir`. */
  testMatch?: string | string[]
  /** Per-test timeout in milliseconds (default: 30000). */
  timeout: number
  /** Number of retries for failed tests (default: 2). */
  retry: number
  /** Maximum number of tests to run concurrently (default: 4). */
  maxConcurrency: number
  /** Stop after the first test failure. */
  bail?: boolean
  /** Files to run before each test suite (e.g. env setup). */
  setupFiles?: string[]
  /** Path to a global setup module (runs once before all tests). */
  globalSetup?: string
  /** Path to a global teardown module (runs once after all tests). */
  globalTeardown?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion Defaults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default assertion thresholds applied to every test case.
 *
 * Individual tests can override these via inline `assert` blocks.
 */
export interface AssertionDefaults {
  /** Minimum score threshold on a 1-10 scale (default: 7). */
  scoreThreshold: number
  /** Maximum allowed tokens per test run (default: 4096). */
  maxTokens: number
  /** Maximum allowed end-to-end latency in milliseconds (default: 30000). */
  maxLatency: number
  /** Tools the agent must call at least once (empty = no requirement). */
  requiredTools?: string[]
  /** Tools the agent must never call. */
  forbiddenTools?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Replay Config
// ─────────────────────────────────────────────────────────────────────────────

/** Replay strategy for deterministic or semi-deterministic test runs. */
export type ReplayMode = 'deterministic' | 'llm' | 'mixed'

/**
 * Replay configuration — controls how AgentBench records and
 * replays agent interactions during test runs.
 */
export interface ReplayConfig {
  /** Enable replay recording and playback. */
  enabled: boolean
  /** Directory where replay snapshots are stored. */
  storageDir?: string
  /** Maximum number of replay snapshots to retain. */
  maxReplays?: number
  /** Time-to-live for replay snapshots in seconds (0 = indefinite). */
  ttl?: number
  /** Replay mode. */
  mode?: ReplayMode
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation Config
// ─────────────────────────────────────────────────────────────────────────────

/** Known LLM-as-Judge evaluation dimensions. */
export type JudgeDimension =
  | 'correctness'
  | 'faithfulness'
  | 'safety'
  | 'relevance'
  | 'completeness'
  | 'reasoning'
  | 'conciseness'
  | 'tool_usage'

/**
 * Evaluation configuration — which judges to run and which model
 * powers LLM-as-Judge scoring.
 */
export interface EvaluationConfig {
  /** Judge dimensions to evaluate on every test case (default: `['correctness', 'faithfulness', 'safety']`). */
  judges: JudgeDimension[]
  /** Model for LLM-as-Judge (should be cheap and fast, e.g. `openai/gpt-4o-mini`). */
  judgeModel: string
  /** Minimum score threshold (1-10) below which a test is marked failed (default: 7). */
  scoreThreshold: number
  /** Custom scoring rubric fed to the LLM judge. */
  rubric?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Coverage Config
// ─────────────────────────────────────────────────────────────────────────────

/** Known coverage-analysis dimensions. */
export type CoverageDimensionName =
  | 'prompt'
  | 'workflow'
  | 'tool'
  | 'state'
  | 'edge'
  | 'edge-case'

/**
 * Coverage-analysis configuration.
 *
 * Controls which dimensions to track and the per-dimension
 * coverage thresholds.
 */
export interface CoverageConfig {
  /** Coverage dimensions to track (default: `['prompt', 'workflow', 'tool', 'edge-case']`). */
  dimensions: CoverageDimensionName[]
  /** Per-dimension coverage thresholds (0-1). Tests that fall below a threshold trigger a warning. */
  thresholds?: Record<string, number>
  /** Files or globs to exclude from coverage analysis. */
  exclude?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Report Config
// ─────────────────────────────────────────────────────────────────────────────

/** Supported report output formats. */
export type ReportFormat = 'terminal' | 'json' | 'html' | 'markdown' | 'junit'

/**
 * Report-output configuration.
 *
 * Controls which formats are generated and where they are written.
 */
export interface ReportConfig {
  /** Output formats (default: `['terminal', 'json', 'html']`). */
  formats: ReportFormat[]
  /** Directory for generated reports. */
  outputDir?: string
  /** Include execution traces in the report. */
  includeTrace?: boolean
  /** Include numeric metrics in the report. */
  includeMetrics?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// CI Config
// ─────────────────────────────────────────────────────────────────────────────

/** Supported CI providers. */
export type CIProvider = 'github-actions' | 'gitlab-ci' | 'circleci' | 'jenkins' | 'none'

/**
 * CI/CD integration configuration.
 *
 * Controls how AgentBench behaves inside CI pipelines.
 */
export interface CIConfig {
  /** CI provider (default: `'github-actions'`). */
  provider: CIProvider
  /** Fail the CI run when score thresholds are not met. */
  failOnThreshold?: boolean
  /** Post a PR comment with test results (when supported by the provider). */
  commentOnPR?: boolean
  /** Directory for CI artifacts (reports, traces, snapshots). */
  artifactsDir?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Level AgentBench Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete AgentBench project configuration.
 *
 * This is the resolved, fully-populated config returned by
 * `defineConfig()` and `loadConfig()`. Users normally only supply
 * a partial `AgentBenchUserConfig`.
 *
 * @example
 * ```ts
 * import { defineConfig } from '@agentbench/config'
 *
 * export default defineConfig({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY }
 *   },
 *   test: {
 *     timeout: 60000
 *   }
 * })
 * ```
 */
export interface AgentBenchConfig {
  /** Providers defined for this project, keyed by a short name. */
  providers?: Record<string, ProviderConfig>
  /** Agent-under-test configuration. */
  agent?: AgentConfig
  /** Test-execution settings. */
  test?: TestConfig
  /** Default assertion thresholds. */
  assertions?: AssertionDefaults
  /** Replay recording / playback settings. */
  replay?: ReplayConfig
  /** LLM-as-Judge evaluation settings. */
  evaluation?: EvaluationConfig
  /** Coverage-analysis settings. */
  coverage?: CoverageConfig
  /** Report-output settings. */
  report?: ReportConfig
  /** CI/CD integration settings. */
  ci?: CIConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// User-Facing Partial Config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partial config supplied by the user in `agentbench.config.ts`.
 *
 * Every field is optional — `defineConfig` fills in the
 * gaps with defaults. Types are structurally compatible with
 * `AgentBenchConfig` so users can spread and override.
 */
export type AgentBenchUserConfig = DeepPartial<AgentBenchConfig>

/**
 * Recursive `Partial` that also makes nested object properties
 * optional. Arrays are left intact.
 */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (Runtime Validation)
// ─────────────────────────────────────────────────────────────────────────────

const providerIdSchema = z.enum([
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'openrouter',
  'custom',
])

const replayModeSchema = z.enum(['deterministic', 'llm', 'mixed'])

const judgeDimensionSchema = z.enum([
  'correctness',
  'faithfulness',
  'safety',
  'relevance',
  'completeness',
  'reasoning',
  'conciseness',
  'tool_usage',
])

const coverageDimensionSchema = z.enum([
  'prompt',
  'workflow',
  'tool',
  'state',
  'edge',
  'edge-case',
])

const reportFormatSchema = z.enum(['terminal', 'json', 'html', 'markdown', 'junit'])

const ciProviderSchema = z.enum([
  'github-actions',
  'gitlab-ci',
  'circleci',
  'jenkins',
  'none',
])

/** Zod schema for a single tool definition. */
export const ToolConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  parameters: z.record(z.unknown()),
})

/** Zod schema for {@link ProviderConfig}. */
export const ProviderConfigSchema = z.object({
  provider: providerIdSchema,
  apiKey: z.string().optional(),
  apiBase: z.string().url().optional(),
  organization: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().nonnegative().optional(),
})

/** Zod schema for {@link AgentConfig}. */
export const AgentConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
  tools: z.array(ToolConfigSchema).optional(),
})

/** Zod schema for {@link TestConfig}. */
export const TestConfigSchema = z.object({
  testDir: z.string(),
  testMatch: z.union([z.string(), z.array(z.string())]).optional(),
  timeout: z.number().positive(),
  retry: z.number().nonnegative(),
  maxConcurrency: z.number().positive(),
  bail: z.boolean().optional(),
  setupFiles: z.array(z.string()).optional(),
  globalSetup: z.string().optional(),
  globalTeardown: z.string().optional(),
})

/** Zod schema for {@link AssertionDefaults}. */
export const AssertionDefaultsSchema = z.object({
  scoreThreshold: z.number().min(1).max(10),
  maxTokens: z.number().positive(),
  maxLatency: z.number().positive(),
  requiredTools: z.array(z.string()).optional(),
  forbiddenTools: z.array(z.string()).optional(),
})

/** Zod schema for {@link ReplayConfig}. */
export const ReplayConfigSchema = z.object({
  enabled: z.boolean(),
  storageDir: z.string().optional(),
  maxReplays: z.number().positive().optional(),
  ttl: z.number().nonnegative().optional(),
  mode: replayModeSchema.optional(),
})

/** Zod schema for {@link EvaluationConfig}. */
export const EvaluationConfigSchema = z.object({
  judges: z.array(judgeDimensionSchema),
  judgeModel: z.string(),
  scoreThreshold: z.number().min(1).max(10),
  rubric: z.string().optional(),
})

/** Zod schema for {@link CoverageConfig}. */
export const CoverageConfigSchema = z.object({
  dimensions: z.array(coverageDimensionSchema),
  thresholds: z.record(z.number().min(0).max(1)).optional(),
  exclude: z.array(z.string()).optional(),
})

/** Zod schema for {@link ReportConfig}. */
export const ReportConfigSchema = z.object({
  formats: z.array(reportFormatSchema),
  outputDir: z.string().optional(),
  includeTrace: z.boolean().optional(),
  includeMetrics: z.boolean().optional(),
})

/** Zod schema for {@link CIConfig}. */
export const CIConfigSchema = z.object({
  provider: ciProviderSchema,
  failOnThreshold: z.boolean().optional(),
  commentOnPR: z.boolean().optional(),
  artifactsDir: z.string().optional(),
})

/**
 * Full Zod schema for validating an `AgentBenchConfig` object at runtime.
 *
 * Use `AgentBenchConfigSchema.parse(config)` to validate, or
 * `AgentBenchConfigSchema.safeParse(config)` for a non-throwing variant.
 */
export const AgentBenchConfigSchema = z.object({
  providers: z.record(ProviderConfigSchema).optional(),
  agent: AgentConfigSchema.optional(),
  test: TestConfigSchema.optional(),
  assertions: AssertionDefaultsSchema.optional(),
  replay: ReplayConfigSchema.optional(),
  evaluation: EvaluationConfigSchema.optional(),
  coverage: CoverageConfigSchema.optional(),
  report: ReportConfigSchema.optional(),
  ci: CIConfigSchema.optional(),
})

/**
 * Inferred static type from `AgentBenchConfigSchema` — equivalent
 * to `AgentBenchConfig` but guaranteed to match the Zod shape.
 */
export type AgentBenchConfigInferred = z.infer<typeof AgentBenchConfigSchema>
