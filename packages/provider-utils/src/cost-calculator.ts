/**
 * Cost Calculator — unified pricing table for 50+ models and cost calculation.
 *
 * Maintains an up-to-date pricing registry for major LLM providers
 * (OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Cohere, xAI, etc.)
 * and provides a unified interface for calculating completion costs.
 *
 * Costs are in USD per 1 million tokens.
 *
 * @packageDocumentation
 */

import type { Usage, CostBreakdown } from './types'

// ── Pricing Table (USD per 1M tokens, input/output) ────────────────────────────

interface ModelPricing {
  input: number
  output: number
  /** Cache hit / cached input if supported */
  cachedInput?: number
}

const PRICING_TABLE: Record<string, ModelPricing> = {
  // ── OpenAI ───────────────────────────────────────────────────────────────
  'gpt-5': { input: 2.5, output: 10.0 },
  'gpt-5-mini': { input: 0.15, output: 0.6 },
  'gpt-5-nano': { input: 0.075, output: 0.3 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.5, output: 10.0 },
  'gpt-4.1-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-nano': { input: 0.075, output: 0.3 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-32k': { input: 60.0, output: 120.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'gpt-3.5-turbo-16k': { input: 3.0, output: 4.0 },
  o1: { input: 15.0, output: 60.0 },
  'o1-mini': { input: 1.1, output: 4.4 },
  'o1-pro': { input: 15.0, output: 60.0 },
  o3: { input: 10.0, output: 40.0 },
  'o3-mini': { input: 1.1, output: 4.4 },
  o5: { input: 10.0, output: 40.0 },
  'o4-mini': { input: 1.1, output: 4.4 },
  'gpt-4o-realtime': { input: 5.0, output: 20.0 },

  // ── Anthropic (Claude) ───────────────────────────────────────────────────
  'claude-opus-4-20250514': { input: 15.0, output: 75.0, cachedInput: 3.75 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cachedInput: 0.75 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0, cachedInput: 0.2 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  // Prefix aliases for common usage
  'claude-opus-4': { input: 15.0, output: 75.0, cachedInput: 3.75 },
  'claude-sonnet-4': { input: 3.0, output: 15.0, cachedInput: 0.75 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0, cachedInput: 0.2 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku': { input: 0.8, output: 4.0 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },

  // ── Google (Gemini) ──────────────────────────────────────────────────────
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },

  // ── DeepSeek ─────────────────────────────────────────────────────────────
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },

  // ── Groq ─────────────────────────────────────────────────────────────────
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.3-70b-specdec': { input: 0.59, output: 0.99 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
  'llama-3.2-90b-vision-preview': { input: 0.59, output: 0.79 },
  'llama-3.2-11b-vision-preview': { input: 0.05, output: 0.08 },
  'llama-3.2-3b-preview': { input: 0.04, output: 0.04 },
  'llama-3.2-1b-preview': { input: 0.04, output: 0.04 },
  'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  'gemma2-9b-it': { input: 0.1, output: 0.1 },
  'deepseek-r1-distill-llama-70b': { input: 0.59, output: 0.79 },
  'deepseek-r1-distill-qwen-32b': { input: 0.23, output: 0.23 },

  // ── Mistral AI ───────────────────────────────────────────────────────────
  'mistral-large-latest': { input: 2.0, output: 6.0 },
  'mistral-large-2411': { input: 2.0, output: 6.0 },
  'mistral-medium-latest': { input: 2.7, output: 8.1 },
  'mistral-small-latest': { input: 1.0, output: 3.0 },
  'mistral-small-2501': { input: 1.0, output: 3.0 },
  'pixtral-large-2411': { input: 2.0, output: 6.0 },
  'codestral-latest': { input: 0.3, output: 0.9 },
  'codestral-2501': { input: 0.3, output: 0.9 },
  'mistral-nemo': { input: 0.15, output: 0.15 },
  'ministral-8b-latest': { input: 0.1, output: 0.1 },
  'ministral-3b-latest': { input: 0.04, output: 0.04 },
  'open-mistral-nemo': { input: 0.15, output: 0.15 },

  // ── xAI (Grok) ───────────────────────────────────────────────────────────
  'grok-2-1212': { input: 2.0, output: 10.0 },
  'grok-2-vision-1212': { input: 2.0, output: 10.0 },
  'grok-2-mini': { input: 0.24, output: 0.24 },
  'grok-2': { input: 2.0, output: 10.0 },
  'grok-beta': { input: 5.0, output: 15.0 },

  // ── Cohere ───────────────────────────────────────────────────────────────
  'command-r-plus': { input: 2.5, output: 10.0 },
  'command-r': { input: 0.5, output: 1.5 },
  command: { input: 1.0, output: 2.0 },
  'command-light': { input: 0.3, output: 0.6 },

  // ── Perplexity ───────────────────────────────────────────────────────────
  'sonar-pro': { input: 3.0, output: 15.0 },
  sonar: { input: 1.0, output: 1.0 },
  'sonar-reasoning': { input: 1.0, output: 5.0 },

  // ── Fireworks AI ─────────────────────────────────────────────────────────
  'accounts/fireworks/models/llama-v3p3-70b-instruct': { input: 0.59, output: 0.79 },
  'accounts/fireworks/models/mixtral-8x22b-instruct': { input: 0.9, output: 0.9 },
  'accounts/fireworks/models/deepseek-r1': { input: 0.55, output: 2.19 },

  // ── Together AI ──────────────────────────────────────────────────────────
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { input: 0.88, output: 0.88 },
  'meta-llama/Llama-3.1-8B-Instruct-Turbo': { input: 0.18, output: 0.18 },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { input: 0.6, output: 0.6 },
  'deepseek-ai/DeepSeek-R1': { input: 0.55, output: 2.19 },
  'deepseek-ai/DeepSeek-V3': { input: 0.27, output: 1.1 },
  'Qwen/Qwen2.5-72B-Instruct-Turbo': { input: 1.2, output: 1.2 },
}

// ── Default Pricing (used when model is unknown) ───────────────────────────────

const DEFAULT_PRICING: ModelPricing = { input: 2.5, output: 10.0 }

// ── Cost Calculator Class ──────────────────────────────────────────────────────

export class CostCalculator {
  private pricing: Record<string, ModelPricing>

  constructor(customPricing?: Record<string, ModelPricing>) {
    this.pricing = { ...PRICING_TABLE, ...customPricing }
  }

  /**
   * Get pricing for a model. Returns default pricing if model is unknown.
   */
  getPricing(model: string): ModelPricing {
    // Exact match
    if (this.pricing[model]) return this.pricing[model]

    // Prefix match (gpt-4o-2024-08-06 matches gpt-4o)
    for (const [key, price] of Object.entries(this.pricing)) {
      if (model.startsWith(key)) return price
    }

    return DEFAULT_PRICING
  }

  /**
   * Calculate cost based on token usage and model.
   */
  calculateCost(usage: Partial<Usage>, model: string): CostBreakdown {
    const pricing = this.getPricing(model)
    const promptTokens = usage.promptTokens ?? 0
    const completionTokens = usage.completionTokens ?? 0

    const promptCost = (promptTokens / 1_000_000) * pricing.input
    const completionCost = (completionTokens / 1_000_000) * pricing.output
    const totalCost = promptCost + completionCost

    return {
      promptCost: roundUSD(promptCost),
      completionCost: roundUSD(completionCost),
      totalCost: roundUSD(totalCost),
      currency: 'USD',
      model,
      rates: {
        promptPer1K: pricing.input / 1000,
        completionPer1K: pricing.output / 1000,
      },
    }
  }

  /**
   * Calculate cost with separate prompt/completion token counts.
   */
  calculate(model: string, promptTokens: number, completionTokens: number): number {
    const { totalCost } = this.calculateCost(
      { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
      model
    )
    return totalCost
  }

  /**
   * Format a cost as a USD string.
   */
  formatCost(cost: number): string {
    if (cost < 0.0001) return '$0.0000'
    return `$${cost.toFixed(cost < 0.01 ? 6 : 4)}`
  }

  /**
   * Add or update pricing for a model at runtime.
   */
  setPricing(model: string, pricing: ModelPricing): void {
    this.pricing[model] = pricing
  }

  /**
   * List all known models with pricing.
   */
  listModels(): string[] {
    return Object.keys(this.pricing)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function roundUSD(amount: number): number {
  // Round to 6 decimal places (micro-dollars)
  return Math.round(amount * 1_000_000) / 1_000_000
}

// ── Singleton ──────────────────────────────────────────────────────────────────

export const costCalculator = new CostCalculator()

/**
 * Convenience function: calculate cost using the default pricing table.
 * Equivalent to `costCalculator.calculateCost(usage, model)`.
 */
export function calculateCost(usage: Partial<Usage>, model: string): CostBreakdown {
  return costCalculator.calculateCost(usage, model)
}
