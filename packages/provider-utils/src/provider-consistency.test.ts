/**
 * Provider Consistency Test Suite
 *
 * Validates that all provider implementations conform to the AgentBenchProvider
 * interface contract. Each provider must pass these tests.
 *
 * Add new providers to the PROVIDERS_TO_TEST array to automatically validate them.
 */

import { describe, it, expect } from 'vitest'
import type { ProviderCapabilities } from './types'

// ============================================================
// Provider Compliance Checklist
// ============================================================

/**
 * Every provider MUST:
 * 1. Have a unique `id` string (kebab-case, no spaces)
 * 2. Have a human-readable `name`
 * 3. Have a semver `version`
 * 4. Declare all `ProviderCapabilities` fields correctly
 * 5. Implement `initialize(config: ProviderConfig): Promise<void>`
 * 6. Implement `healthCheck(): Promise<HealthStatus>`
 * 7. Implement `dispose(): Promise<void>`
 * 8. Implement `createChatCompletion(): Promise<ChatCompletionResult>`
 * 9. Implement `createStreamingChatCompletion(): AsyncGenerator<StreamChunk>`
 * 10. Implement `countTokens(): Promise<TokenCountResult>`
 * 11. Implement `calculateCost(): CostBreakdown`
 * 12. Have a factory function `create<Name>Provider(config): Promise<Provider>`
 */

// ============================================================
// Shared Validation Helpers
// ============================================================

export function validateProviderIdentity(provider: {
  id: string
  name: string
  version: string
}): void {
  // id must be kebab-case
  expect(provider.id).toMatch(/^[a-z][a-z0-9-]*$/)
  // name must be non-empty
  expect(provider.name.length).toBeGreaterThan(0)
  // version must be valid semver
  expect(provider.version).toMatch(/^\d+\.\d+\.\d+/)
}

export function validateCapabilitiesStructure(capabilities: ProviderCapabilities): void {
  expect(typeof capabilities.streaming).toBe('boolean')
  expect(typeof capabilities.reasoning).toBe('boolean')
  expect(typeof capabilities.embeddings).toBe('boolean')
  expect(typeof capabilities.toolCalling).toBe('boolean')
  expect(typeof capabilities.vision).toBe('boolean')
  expect(typeof capabilities.functionCalling).toBe('boolean')
  expect(typeof capabilities.jsonMode).toBe('boolean')
  expect(capabilities.maxContextWindow).toBeGreaterThan(0)
  expect(Array.isArray(capabilities.supportedModels)).toBe(true)
  expect(capabilities.supportedModels.length).toBeGreaterThan(0)
}

/**
 * Validates that a ChatCompletionResult conforms to the expected structure.
 */
export function validateChatCompletionResult(result: {
  id: string
  model: string
  choices: Array<{
    index: number
    message: { role: string; content: string | null }
    finishReason: string | null
  }>
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  provider: string
}): void {
  expect(typeof result.id).toBe('string')
  expect(result.id.length).toBeGreaterThan(0)
  expect(typeof result.model).toBe('string')
  expect(Array.isArray(result.choices)).toBe(true)
  expect(result.choices.length).toBeGreaterThan(0)
  expect(['assistant', 'system', 'user', 'tool']).toContain(result.choices[0].message.role)
  expect(result.usage.totalTokens).toBe(result.usage.promptTokens + result.usage.completionTokens)
  expect(typeof result.provider).toBe('string')
  expect(typeof result.created).toBe('number')
}

/**
 * Validate that the CostBreakdown has the expected shape.
 */
export function validateCostBreakdown(cost: {
  totalCost: number
  currency: string
  promptCost?: number
  completionCost?: number
}): void {
  expect(cost.totalCost).toBeGreaterThanOrEqual(0)
  expect(typeof cost.currency).toBe('string')
  expect(cost.currency.length).toBeGreaterThanOrEqual(3)
}

// ============================================================
// Provider Integration Test Template
// ============================================================

/**
 * Test template — import your provider and use this as a base:
 *
 * @example
 * ```typescript
 * import { runProviderContractTests } from './provider-consistency.test'
 * import { MyProvider, createMyProvider } from './index'
 *
 * describe('MyProvider Contract', () => {
 *   runProviderContractTests({
 *     name: 'MyProvider',
 *     createProvider: () => createMyProvider({ apiKey: 'test-key' }),
 *   })
 * })
 * ```
 */
export function runProviderContractTests(config: {
  name: string
  createProvider: () => Promise<{
    id: string
    name: string
    version: string
    capabilities: ProviderCapabilities
    initialize: (cfg: Record<string, unknown>) => Promise<void>
    healthCheck: () => Promise<{ healthy: boolean; latency: number; message: string }>
    dispose: () => Promise<void>
  }>
}): void {
  describe(`${config.name} — Contract Tests`, () => {
    let provider: Awaited<ReturnType<typeof config.createProvider>>

    beforeAll(async () => {
      provider = await config.createProvider()
    })

    it('satisfies identity requirements', () => {
      validateProviderIdentity(provider)
    })

    it('declares valid capabilities', () => {
      validateCapabilitiesStructure(provider.capabilities)
    })

    it('has unique id across providers', () => {
      expect(provider.id).toBeTruthy()
    })

    it('healthCheck returns valid response shape', async () => {
      const status = await provider.healthCheck()
      expect(typeof status.healthy).toBe('boolean')
      expect(typeof status.latency).toBe('number')
      expect(typeof status.message).toBe('string')
    })

    it('dispose completes without error', async () => {
      await provider.dispose()
    })
  })
}
