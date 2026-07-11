import type { AgentBenchConfig, AgentBenchUserConfig } from './types'
import { defaults } from './defaults'

// ─────────────────────────────────────────────────────────────────────────────
// Deep Merge Utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively merge `source` into `target`.
 *
 * - Objects are merged deeply (nested properties are combined).
 * - Arrays and primitives from `source` **replace** those in `target`.
 * - `undefined` values in `source` are ignored (they do not clobber `target`).
 * - `null` values in `source` **do** replace `target` values.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  // Cast to plain record types so we can index with string keys freely.
  const result = { ...target } as Record<string, unknown>
  const src = source as Record<string, unknown>

  for (const key of Object.keys(src)) {
    const sourceVal = src[key]
    const targetVal = result[key]

    if (sourceVal === undefined) {
      continue
    }

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      targetVal !== undefined &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      )
    } else {
      result[key] = sourceVal
    }
  }

  return result as T
}

/** Recursive partial — mirrors the type exported from types.ts. */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge user-provided config with defaults to produce a complete,
 * resolved `AgentBenchConfig`.
 *
 * Called internally by both `defineConfig` and `loadConfig`.
 * Also exported for use by consumers that need to merge programmatically.
 *
 * @param userConfig - Partial config supplied by the user.
 * @returns A fully-populated `AgentBenchConfig` with all defaults applied.
 */
export function resolveConfig(userConfig: AgentBenchUserConfig): AgentBenchConfig {
  return deepMerge(
    defaults as unknown as Record<string, unknown>,
    userConfig as unknown as Record<string, unknown>
  ) as unknown as AgentBenchConfig
}

/**
 * Define the AgentBench configuration with full type safety.
 *
 * Accepts a partial config object — every key is optional. The
 * returned value is a fully-resolved `AgentBenchConfig` with all
 * smart defaults applied.
 *
 * Supports both synchronous and asynchronous config factories
 * (the latter is useful when you need to fetch API keys or read
 * environment variables at config-resolution time).
 *
 * @example
 * ```ts
 * // Synchronous
 * import { defineConfig } from '@agentbench/config'
 *
 * export default defineConfig({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY, provider: 'openai' }
 *   }
 * })
 * ```
 *
 * @example
 * ```ts
 * // Asynchronous — fetch secrets from a vault
 * import { defineConfig } from '@agentbench/config'
 *
 * export default defineConfig(async () => {
 *   const secret = await fetchSecret('prod/openai-key')
 *   return {
 *     providers: {
 *       openai: { apiKey: secret, provider: 'openai' }
 *     }
 *   }
 * })
 * ```
 */
export function defineConfig(config: AgentBenchUserConfig): AgentBenchConfig
export function defineConfig(
  config: () => AgentBenchUserConfig | Promise<AgentBenchUserConfig>
): () => Promise<AgentBenchConfig>
export function defineConfig(
  config: AgentBenchUserConfig | (() => AgentBenchUserConfig | Promise<AgentBenchUserConfig>)
): AgentBenchConfig | (() => Promise<AgentBenchConfig>) {
  if (typeof config === 'function') {
    return async () => {
      const resolved = await config()
      return resolveConfig(resolved)
    }
  }

  return resolveConfig(config)
}
