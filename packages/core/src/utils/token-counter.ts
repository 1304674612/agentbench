/**
 * Token Counter — estimates token counts for LLM requests.
 * Uses heuristic counting (words ÷ 0.75 ≈ tokens) when tiktoken is unavailable.
 */

export interface TokenCount {
  promptTokens: number
  estimatedCompletionTokens: number
  totalEstimated: number
}

// Approximate tokens per character by model family
const CHARS_PER_TOKEN: Record<string, number> = {
  openai: 4.0, // ~4 chars per token for GPT models
  anthropic: 4.0,
  gemini: 4.0,
  deepseek: 3.5,
  default: 4.0,
}

// Pricing per 1M tokens (USD) — updated 2026
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2.5, output: 10.0 },
  'gpt-4.1-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-nano': { input: 0.075, output: 0.3 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // Anthropic (Claude)
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'claude-opus-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Google (Gemini)
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },

  // DeepSeek
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
}

export class TokenCounter {
  /**
   * Estimate tokens from text content.
   * Falls back to character-based heuristic when tiktoken is not available.
   */
  estimateTokens(text: string, provider = 'default'): number {
    if (!text) return 0
    const charsPerToken = CHARS_PER_TOKEN[provider] ?? CHARS_PER_TOKEN.default
    return Math.ceil(text.length / charsPerToken)
  }

  /**
   * Estimate tokens for a list of messages.
   */
  estimateMessagesTokens(
    messages: Array<{ role: string; content: string | null }>,
    provider = 'default'
  ): number {
    let total = 0
    // Each message has ~3 tokens of overhead (role formatting)
    const overheadPerMessage = 3
    for (const msg of messages) {
      total += overheadPerMessage + this.estimateTokens(msg.content ?? '', provider)
    }
    // ~3 tokens for overall formatting
    return total + 3
  }

  /**
   * Estimate tokens for tool definitions.
   */
  estimateToolTokens(
    tools: Array<{ function?: { name?: string; description?: string; parameters?: unknown } }>,
    provider = 'default'
  ): number {
    let total = 0
    for (const tool of tools) {
      const nameTokens = this.estimateTokens(tool.function?.name ?? '', provider)
      const descTokens = this.estimateTokens(tool.function?.description ?? '', provider)
      const paramsTokens = this.estimateTokens(
        JSON.stringify(tool.function?.parameters ?? {}),
        provider
      )
      // ~10 tokens overhead per tool
      total += nameTokens + descTokens + paramsTokens + 10
    }
    return total
  }
}

export class CostCalculator {
  private pricing: typeof MODEL_PRICING

  constructor(customPricing?: Record<string, { input: number; output: number }>) {
    this.pricing = { ...MODEL_PRICING, ...customPricing }
  }

  /**
   * Get pricing for a model. Returns default GPT-4o pricing if unknown.
   */
  getPricing(model: string): { input: number; output: number } {
    // Try exact match
    if (this.pricing[model]) return this.pricing[model]

    // Try prefix match (e.g., "gpt-4o-2024-08-06" matches "gpt-4o")
    for (const [key, price] of Object.entries(this.pricing)) {
      if (model.startsWith(key)) return price
    }

    // Default fallback
    return { input: 2.5, output: 10.0 }
  }

  /**
   * Calculate cost for a given token usage.
   * @returns cost in USD
   */
  calculate(model: string, promptTokens: number, completionTokens: number): number {
    const { input, output } = this.getPricing(model)
    const inputCost = (promptTokens / 1_000_000) * input
    const outputCost = (completionTokens / 1_000_000) * output
    return inputCost + outputCost
  }

  /**
   * Format cost as USD string.
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(6)}`
  }
}

// Singleton instances
export const tokenCounter = new TokenCounter()
export const costCalculator = new CostCalculator()
