import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AgentBenchConfig, AgentBenchUserConfig } from './types'
import { resolveConfig } from './define-config'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered list of config filenames to search for.
 *
 * Resolution order follows the Jest / Vitest convention:
 * `.ts` first (most common), then `.js`, `.mjs`, `.json`,
 * and finally the `agentbench` key in `package.json`.
 */
const CONFIG_FILENAMES = [
  'agentbench.config.ts',
  'agentbench.config.js',
  'agentbench.config.mjs',
  'agentbench.config.json',
] as const

/**
 * Extensions that can be loaded via `import()`.
 */
const IMPORTABLE_EXTENSIONS = new Set(['.ts', '.js', '.mjs'])

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a file can be loaded via `import()`.
 */
function isImportable(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.'))
  return IMPORTABLE_EXTENSIONS.has(ext)
}

/**
 * Dynamically import a JS / TS module and unwrap its default export.
 *
 * Supports both:
 * - `export default { … }` — config object
 * - `export default () => { … }` — config factory (sync or async)
 */
async function importConfigModule(
  filepath: string
): Promise<AgentBenchUserConfig | (() => AgentBenchUserConfig | Promise<AgentBenchUserConfig>)> {
  const url = pathToFileURL(filepath).href
  // Append a cache-busting query param so Node does not return a stale
  // module from the require / import cache (important for watch mode).
  const cacheBust = `${url}?t=${Date.now()}`
  const mod = await import(cacheBust)
  return mod.default ?? mod
}

/**
 * Read and parse a JSON config file.
 */
async function loadJsonConfig(filepath: string): Promise<AgentBenchUserConfig> {
  const contents = await readFile(filepath, 'utf-8')
  return JSON.parse(contents) as AgentBenchUserConfig
}

/**
 * Read the `agentbench` key from a `package.json` file.
 *
 * Returns `null` when the key is absent so the caller can fall
 * through to the next resolution step.
 */
async function loadPackageJsonConfig(
  filepath: string
): Promise<AgentBenchUserConfig | null> {
  const contents = await readFile(filepath, 'utf-8')
  const pkg = JSON.parse(contents) as { agentbench?: AgentBenchUserConfig }
  return pkg.agentbench ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the **absolute path** to the AgentBench config file.
 *
 * Searches the given directory (`cwd` defaults to `process.cwd()`)
 * for the first matching config file. When the only match is
 * `package.json` (because it contains an `agentbench` key),
 * that path is returned.
 *
 * @param cwd - Directory to search (defaults to `process.cwd()`).
 * @returns The absolute path to the resolved config file, or `null`
 *          if no config was found.
 *
 * @example
 * ```ts
 * import { resolveConfigPath } from '@agentbench/config'
 *
 * const path = resolveConfigPath()
 * // '/Users/jane/project/agentbench.config.ts'
 * ```
 */
export function resolveConfigPath(cwd?: string): string | null {
  const root = cwd ?? process.cwd()

  // 1. Check named config files in order.
  for (const filename of CONFIG_FILENAMES) {
    const filepath = join(root, filename)
    if (existsSync(filepath)) {
      return filepath
    }
  }

  // 2. Check for "agentbench" key in package.json.
  const pkgPath = join(root, 'package.json')
  if (existsSync(pkgPath)) {
    // We don't eagerly read the file here — resolving the path
    // is enough to signal that a config exists. loadConfig will
    // do the actual parsing.
    return pkgPath
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the full, resolved AgentBench configuration.
 *
 * Resolution order (first match wins):
 *
 * 1. `agentbench.config.ts`
 * 2. `agentbench.config.js`
 * 3. `agentbench.config.mjs`
 * 4. `agentbench.config.json`
 * 5. `package.json` → `"agentbench"` key
 * 6. Built-in defaults
 *
 * Loaded configs are **deep-merged** with the built-in defaults,
 * so users only need to specify the values they wish to override.
 *
 * If the config module exports a **function** (sync or async), it
 * is invoked and its return value is used as the user config.
 * This is useful for fetching secrets, reading environment
 * variables, or performing conditional logic at config time.
 *
 * @param cwd - Directory to search for config files (defaults to `process.cwd()`).
 * @returns A fully-resolved `AgentBenchConfig` with all defaults applied.
 *
 * @example
 * ```ts
 * import { loadConfig } from '@agentbench/config'
 *
 * const config = await loadConfig()
 * console.log(config.test?.timeout)
 * // => 30000
 * ```
 *
 * @example
 * ```ts
 * // With an async config factory in agentbench.config.ts:
 * // export default async () => ({
 * //   providers: {
 * //     openai: { apiKey: await fetchSecret('prod/key'), provider: 'openai' }
 * //   }
 * // })
 *
 * const config = await loadConfig()
 * ```
 */
export async function loadConfig(cwd?: string): Promise<AgentBenchConfig> {
  const root = cwd ?? process.cwd()

  // ── Step 1: Try importable config files (.ts, .js, .mjs) ──────────
  const importableFilenames = CONFIG_FILENAMES.filter((f) => isImportable(f))

  for (const filename of importableFilenames) {
    const filepath = join(root, filename)
    if (!existsSync(filepath)) continue

    try {
      const raw = await importConfigModule(filepath)

      let userConfig: AgentBenchUserConfig

      if (typeof raw === 'function') {
        userConfig = await raw()
      } else {
        userConfig = raw as AgentBenchUserConfig
      }

      return resolveConfig(userConfig)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Failed to load AgentBench config from "${filepath}": ${message}`
      )
    }
  }

  // ── Step 2: Try agentbench.config.json ────────────────────────────
  const jsonPath = join(root, 'agentbench.config.json')
  if (existsSync(jsonPath)) {
    try {
      const userConfig = await loadJsonConfig(jsonPath)
      return resolveConfig(userConfig)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Failed to parse config file "${jsonPath}": ${message}`
      )
    }
  }

  // ── Step 3: Try package.json "agentbench" key ─────────────────────
  const pkgPath = join(root, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkgConfig = await loadPackageJsonConfig(pkgPath)
      if (pkgConfig !== null) {
        return resolveConfig(pkgConfig)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Failed to parse "agentbench" key from "${pkgPath}": ${message}`
      )
    }
  }

  // ── Step 4: Fall back to defaults ─────────────────────────────────
  return resolveConfig({})
}
