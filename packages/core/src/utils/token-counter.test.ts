import { describe, it, expect } from 'vitest'
import { TokenCounter, CostCalculator, tokenCounter, costCalculator } from './token-counter'

describe('TokenCounter', () => {
  const counter = new TokenCounter()

  it('estimates tokens from text', () => {
    const tokens = counter.estimateTokens('Hello world')
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThanOrEqual(3) // ~11 chars / 4 = 2.75 → 3
  })

  it('returns 0 for empty text', () => {
    expect(counter.estimateTokens('')).toBe(0)
  })

  it('estimates message tokens with overhead', () => {
    const tokens = counter.estimateMessagesTokens([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ])
    expect(tokens).toBeGreaterThan(0)
    // "Hello"(2) + 3 overhead + "Hi there!"(3) + 3 overhead + 3 format = ~14
    expect(tokens).toBeGreaterThanOrEqual(5)
  })

  it('estimates tool definition tokens', () => {
    const tokens = counter.estimateToolTokens([
      { function: { name: 'search', description: 'Search docs', parameters: { query: 'string' } } },
    ])
    expect(tokens).toBeGreaterThan(0)
  })

  it('uses provider-specific ratios', () => {
    const gpt = counter.estimateTokens('Hello world', 'openai')
    const ds = counter.estimateTokens('Hello world', 'deepseek')
    expect(ds).toBeGreaterThanOrEqual(gpt) // deepseek has 3.5 chars/token vs 4.0
  })

  it('handles null content in messages', () => {
    const tokens = counter.estimateMessagesTokens([
      { role: 'assistant', content: null },
    ])
    expect(tokens).toBeGreaterThan(0) // just overhead
  })
})

describe('CostCalculator', () => {
  const calc = new CostCalculator()

  it('calculates GPT-4o cost', () => {
    const cost = calc.calculate('gpt-4o', 1000, 500)
    // 1000/1M * $2.5 + 500/1M * $10 = $0.0025 + $0.005 = $0.0075
    expect(cost).toBeCloseTo(0.0075, 3)
  })

  it('calculates Claude cost', () => {
    const cost = calc.calculate('claude-sonnet-4-20250514', 1000, 500)
    // 1000/1M * $3 + 500/1M * $15 = $0.003 + $0.0075 = $0.0105
    expect(cost).toBeCloseTo(0.0105, 3)
  })

  it('falls back for unknown models', () => {
    const cost = calc.calculate('unknown-model-123', 1000, 500)
    expect(cost).toBeGreaterThan(0)
  })

  it('formats cost', () => {
    expect(calc.formatCost(0.0075)).toBe('$0.007500')
  })

  it('returns 0 cost for 0 tokens', () => {
    expect(calc.calculate('gpt-4o', 0, 0)).toBe(0)
  })
})

describe('singletons', () => {
  it('exported tokenCounter is a TokenCounter instance', () => {
    expect(tokenCounter).toBeInstanceOf(TokenCounter)
  })
  it('exported costCalculator is a CostCalculator instance', () => {
    expect(costCalculator).toBeInstanceOf(CostCalculator)
  })
})
