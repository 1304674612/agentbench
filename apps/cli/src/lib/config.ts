import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

// ── API URL ──────────────────────────────────────────────────────────────────

export function getApiUrl(): string {
  return process.env.AGENTBENCH_API_URL ?? 'http://localhost:3000/api/v1'
}

// ── Env Config (.env.agentbench) ─────────────────────────────────────────────

const ENV_FILE_NAME = '.env.agentbench'

export function getEnvFilePath(cwd?: string): string {
  return nodePath.join(cwd ?? process.cwd(), ENV_FILE_NAME)
}

export function readEnvConfig(cwd?: string): Record<string, string> {
  const envPath = getEnvFilePath(cwd)
  if (!nodeFs.existsSync(envPath)) return {}
  const content = nodeFs.readFileSync(envPath, 'utf-8')
  const config: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    config[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
  }
  return config
}

export function writeEnvConfig(key: string, value: string, cwd?: string): void {
  const envPath = getEnvFilePath(cwd)
  const existing = readEnvConfig(cwd)
  existing[key] = value
  const lines = Object.entries(existing).map(([k, v]) => `${k}=${v}`)
  nodeFs.writeFileSync(envPath, lines.join('\n'), 'utf-8')
}

export function getEnvConfigValue(key: string, cwd?: string): string | undefined {
  return readEnvConfig(cwd)[key]
}

export function deleteEnvConfigValue(key: string, cwd?: string): void {
  const existing = readEnvConfig(cwd)
  delete existing[key]
  const lines = Object.entries(existing).map(([k, v]) => `${k}=${v}`)
  const envPath = getEnvFilePath(cwd)
  nodeFs.writeFileSync(envPath, lines.join('\n'), 'utf-8')
}

// ── Config File (agentbench.config.ts) ───────────────────────────────────────

const CONFIG_FILE_NAME = 'agentbench.config.ts'

export function configFileExists(cwd?: string): boolean {
  return nodeFs.existsSync(nodePath.join(cwd ?? process.cwd(), CONFIG_FILE_NAME))
}

export function getConfigFilePath(cwd?: string): string {
  return nodePath.join(cwd ?? process.cwd(), CONFIG_FILE_NAME)
}

// ── Default config template ──────────────────────────────────────────────────

export function getDefaultConfigContent(): string {
  return `import { defineConfig } from '@agentbench/core'

export default defineConfig({
  // Project name
  name: 'my-agent-project',

  // Default model
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  },

  // Test configuration
  tests: {
    timeout: 30000,
    maxSteps: 10,
    retries: 1,
  },

  // Plugins
  plugins: [],
})
`
}
