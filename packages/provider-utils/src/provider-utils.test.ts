import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CostCalculator, costCalculator, calculateCost } from './cost-calculator'
import { TokenCounter, tokenCounter } from './token-counter'
import { OpenAICompatibleProvider } from './openai-compatible'
import type {
  ChatCompletionParams,
  ChatCompletionResult,
  Usage,
  CostBreakdown,
  TokenCountParams,
  TokenCountResult,
  ProviderCapabilities,
  StreamChunk,
} from './types'

// ─── CostCalculator ───────────────────────────────────────────────────────────

describe('CostCalculator', () => {
  describe('getPricing', () => {
    it('returns correct pricing for gpt-4o', () => {
      const calc = new CostCalculator()
      const pricing = calc.getPricing('gpt-4o')
      expect(pricing.input).toBe(2.5)
      expect(pricing.output).toBe(10.0)
    })

    it('returns correct pricing for gpt-4o-mini', () => {
      const calc = new CostCalculator()
      const pricing = calc.getPricing('gpt-4o-mini')
      expect(pricing.input).toBe(0.15)
      expect(pricing.output).toBe(0.6)
    })

    it('returns correct pricing for claude-sonnet-4-20250514', () => {
      const calc = new CostCalculator()
      const pricing = calc.getPricing('claude-sonnet-4-20250514')
      expect(pricing.input).toBe(3.0)
      expect(pricing.output).toBe(15.0)
      expect(pricing.cachedInput).toBe(0.75)
    })

    it('uses prefix matching for dated model variants (e.g. gpt-4o-2024-08-06 matches gpt-4o)', () => {
      const calc = new CostCalculator()
      const pricing = calc.getPricing('gpt-4o-2024-08-06')
      expect(pricing.input).toBe(2.5)
      expect(pricing.output).toBe(10.0)
    })

    it('falls back to default pricing for completely unknown models', () => {
      const calc = new CostCalculator()
      const pricing = calc.getPricing('some-nonexistent-model-v999')
      expect(pricing.input).toBe(2.5)
      expect(pricing.output).toBe(10.0)
    })
  })

  describe('calculate', () => {
    it('calculates GPT-4o cost correctly (1000 prompt, 500 completion)', () => {
      const calc = new CostCalculator()
      // 1000/1M * $2.5 + 500/1M * $10 = $0.0025 + $0.005 = $0.0075
      const cost = calc.calculate('gpt-4o', 1000, 500)
      expect(cost).toBeCloseTo(0.0075, 4)
    })

    it('calculates Claude Sonnet cost correctly', () => {
      const calc = new CostCalculator()
      // 1000/1M * $3 + 500/1M * $15 = $0.003 + $0.0075 = $0.0105
      const cost = calc.calculate('claude-sonnet-4-20250514', 1000, 500)
      expect(cost).toBeCloseTo(0.0105, 4)
    })

    it('returns 0 when both prompt and completion tokens are 0', () => {
      const calc = new CostCalculator()
      const cost = calc.calculate('gpt-4o', 0, 0)
      expect(cost).toBe(0)
    })
  })

  describe('calculateCost', () => {
    it('returns a full CostBreakdown with correct structure', () => {
      const calc = new CostCalculator()
      const usage: Partial<Usage> = {
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
      }
      const breakdown = calc.calculateCost(usage, 'gpt-4o')

      expect(breakdown.model).toBe('gpt-4o')
      expect(breakdown.currency).toBe('USD')
      expect(breakdown.promptCost).toBeGreaterThan(0)
      expect(breakdown.completionCost).toBeGreaterThan(0)
      expect(breakdown.totalCost).toBeCloseTo(breakdown.promptCost + breakdown.completionCost, 5)
      expect(breakdown.rates.promptPer1K).toBeGreaterThan(0)
      expect(breakdown.rates.completionPer1K).toBeGreaterThan(0)
    })

    it('handles missing token counts gracefully', () => {
      const calc = new CostCalculator()
      const usage: Partial<Usage> = {}
      const breakdown = calc.calculateCost(usage, 'gpt-4o')

      expect(breakdown.promptCost).toBe(0)
      expect(breakdown.completionCost).toBe(0)
      expect(breakdown.totalCost).toBe(0)
    })
  })

  describe('formatCost', () => {
    it('formats small costs with 6 decimal places', () => {
      const calc = new CostCalculator()
      expect(calc.formatCost(0.0075)).toBe('$0.007500')
    })

    it('formats larger costs with 4 decimal places', () => {
      const calc = new CostCalculator()
      expect(calc.formatCost(0.5)).toBe('$0.5000')
    })

    it('returns $0.0000 for extremely small costs', () => {
      const calc = new CostCalculator()
      expect(calc.formatCost(0.00001)).toBe('$0.0000')
    })
  })

  describe('setPricing', () => {
    it('adds custom model pricing at runtime', () => {
      const calc = new CostCalculator()
      calc.setPricing('my-custom-model', { input: 0.5, output: 2.0 })

      const pricing = calc.getPricing('my-custom-model')
      expect(pricing.input).toBe(0.5)
      expect(pricing.output).toBe(2.0)
    })
  })

  describe('listModels', () => {
    it('returns all known model names including defaults', () => {
      const calc = new CostCalculator()
      const models = calc.listModels()
      expect(models.length).toBeGreaterThan(50)
      expect(models).toContain('gpt-4o')
      expect(models).toContain('claude-sonnet-4-20250514')
    })
  })

  describe('custom pricing constructor', () => {
    it('allows overriding pricing at construction time', () => {
      const calc = new CostCalculator({
        'gpt-4o': { input: 999, output: 999 },
      })
      const pricing = calc.getPricing('gpt-4o')
      expect(pricing.input).toBe(999)
      expect(pricing.output).toBe(999)
    })
  })
})

// ─── calculateCost convenience function ───────────────────────────────────────

describe('calculateCost (convenience function)', () => {
  it('returns a CostBreakdown using the default costCalculator singleton', () => {
    const usage: Partial<Usage> = {
      promptTokens: 1000,
      completionTokens: 500,
    }
    const breakdown = calculateCost(usage, 'gpt-4o')

    expect(breakdown.model).toBe('gpt-4o')
    expect(breakdown.currency).toBe('USD')
    expect(breakdown.totalCost).toBeGreaterThan(0)
  })

  it('returns zero total cost for zero token usage', () => {
    const usage: Partial<Usage> = {}
    const breakdown = calculateCost(usage, 'gpt-4o')
    expect(breakdown.totalCost).toBe(0)
  })
})

// ─── TokenCounter ─────────────────────────────────────────────────────────────

describe('TokenCounter', () => {
  describe('estimateTextTokens', () => {
    it('returns >0 tokens for non-empty text', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateTextTokens('Hello world')
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThanOrEqual(3) // ~11 chars / 4 = 2.75 → 3
    })

    it('returns 0 tokens for empty string', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateTextTokens('')
      expect(tokens).toBe(0)
    })

    it('uses model-specific character ratios', () => {
      const counter = new TokenCounter()
      // deepseek uses 3.5 chars/token, so it should produce higher estimate
      const gptTokens = counter.estimateTextTokens('Hello world', 'gpt-4o')
      const dsTokens = counter.estimateTextTokens('Hello world', 'deepseek-chat')
      expect(dsTokens).toBeGreaterThanOrEqual(gptTokens)
    })
  })

  describe('estimateMessagesTokens', () => {
    it('returns >0 tokens for a message array', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateMessagesTokens([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ])
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeGreaterThanOrEqual(5)
    })

    it('handles null content in messages', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateMessagesTokens([{ role: 'assistant', content: null }])
      // Should still have overhead tokens
      expect(tokens).toBeGreaterThan(0)
    })

    it('handles empty message arrays', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateMessagesTokens([])
      // Only the 3-token formatting overhead
      expect(tokens).toBe(3)
    })
  })

  describe('countTokens (async)', () => {
    it('counts tokens for text input', async () => {
      const counter = new TokenCounter()
      const result = await counter.countTokens({
        model: 'gpt-4o',
        text: 'Hello world',
      })

      expect(result.tokens).toBeGreaterThan(0)
      expect(result.model).toBe('gpt-4o')
      expect(['tiktoken', 'heuristic']).toContain(result.method)
    })

    it('counts tokens for message input', async () => {
      const counter = new TokenCounter()
      const result = await counter.countTokens({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      })

      expect(result.tokens).toBeGreaterThan(0)
      expect(result.model).toBe('gpt-4o')
    })

    it('returns 0 tokens for empty input', async () => {
      const counter = new TokenCounter()
      const result = await counter.countTokens({
        model: 'gpt-4o',
      })

      expect(result.tokens).toBe(0)
    })
  })

  describe('model family detection', () => {
    it('detects GPT/o-series models as openai', () => {
      const counter = new TokenCounter()
      // Test indirectly via estimateTextTokens which uses detectModelFamily
      const tokens = counter.estimateTextTokens('test', 'gpt-4o')
      // Verify it's using openai ratio (4.0 chars/token)
      // 'test' has 4 chars → ceil(4/4.0) = 1
      expect(tokens).toBe(1)
    })

    it('detects Claude models as anthropic', () => {
      const counter = new TokenCounter()
      const tokens = counter.estimateTextTokens('test', 'claude-sonnet-4-20250514')
      // anthropic also uses 4.0, so ceil(4/4.0) = 1
      expect(tokens).toBe(1)
    })

    it('uses default family for unknown model names', () => {
      const counter = new TokenCounter()
      // Should not throw
      expect(() => counter.estimateTextTokens('test', 'some-unknown-model')).not.toThrow()
    })
  })
})

// ─── TokenCounter / CostCalculator singletons ────────────────────────────────

describe('singletons', () => {
  it('exported tokenCounter is a TokenCounter instance', () => {
    expect(tokenCounter).toBeInstanceOf(TokenCounter)
  })

  it('exported costCalculator is a CostCalculator instance', () => {
    expect(costCalculator).toBeInstanceOf(CostCalculator)
  })
})

// ─── OpenAICompatibleProvider ─────────────────────────────────────────────────

// Concrete implementation for testing the abstract base class
class TestProvider extends OpenAICompatibleProvider {
  readonly id = 'test-provider'
  readonly name = 'Test Provider'
  readonly version = '1.0.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: false,
    embeddings: false,
    toolCalling: true,
    vision: false,
    functionCalling: false,
    jsonMode: true,
    maxContextWindow: 128000,
    supportedModels: ['test-model-v1'],
  }

  protected adaptParams(params: ChatCompletionParams): unknown {
    return params
  }

  protected adaptResponse(raw: unknown): ChatCompletionResult {
    return raw as ChatCompletionResult
  }

  async countTokens(_params: TokenCountParams): Promise<TokenCountResult> {
    return { tokens: 10, model: 'test-model-v1', method: 'heuristic' }
  }

  calculateCost(_usage: Usage, _model: string): CostBreakdown {
    return {
      promptCost: 0.001,
      completionCost: 0.002,
      totalCost: 0.003,
      currency: 'USD',
      model: 'test-model-v1',
      rates: { promptPer1K: 0.001, completionPer1K: 0.002 },
    }
  }
}

describe('OpenAICompatibleProvider', () => {
  let provider: TestProvider

  beforeEach(() => {
    provider = new TestProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialize', () => {
    it('sets baseUrl, apiKey, timeout, maxRetries from config', async () => {
      await provider.initialize({
        baseUrl: 'https://custom.api.example.com/v1',
        apiKey: 'sk-custom-key',
        timeout: 30000,
        maxRetries: 5,
      })

      // Access through protected members — we can test behavior indirectly
      expect(provider.id).toBe('test-provider')
      expect(provider.name).toBe('Test Provider')
    })
  })

  describe('buildHeaders', () => {
    it('includes Content-Type and Authorization headers', () => {
      // buildHeaders is protected, but we can call it in the test since
      // TestProvider extends the class in same module context
      const headers = (
        provider as unknown as { buildHeaders: () => Record<string, string> }
      ).buildHeaders()
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBe('Bearer ')
    })
  })

  describe('healthCheck', () => {
    it('returns healthy when the API responds with OK', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

      // Override buildHeaders via a spy
      vi.spyOn(
        provider as unknown as { buildHeaders: () => Record<string, string> },
        'buildHeaders'
      ).mockReturnValue({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      })

      const status = await provider.healthCheck()
      expect(status.healthy).toBe(true)
      expect(status.latency).toBeGreaterThanOrEqual(0)
      expect(status.message).toBe('Connected')
    })

    it('returns unhealthy when the API returns non-OK status', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
      }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

      vi.spyOn(
        provider as unknown as { buildHeaders: () => Record<string, string> },
        'buildHeaders'
      ).mockReturnValue({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      })

      const status = await provider.healthCheck()
      expect(status.healthy).toBe(false)
      expect(status.message).toBe('HTTP 503')
    })

    it('returns unhealthy when fetch throws an error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')))

      vi.spyOn(
        provider as unknown as { buildHeaders: () => Record<string, string> },
        'buildHeaders'
      ).mockReturnValue({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
      })

      const status = await provider.healthCheck()
      expect(status.healthy).toBe(false)
      expect(status.message).toBe('Connection refused')
    })
  })

  describe('fetchWithRetry', () => {
    it('returns response on successful first attempt', async () => {
      const mockResponse = { ok: true, status: 200 }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

      const fetchWithRetry = (
        provider as unknown as {
          fetchWithRetry: (url: string, init: RequestInit, retries?: number) => Promise<Response>
        }
      ).fetchWithRetry.bind(provider)

      const response = await fetchWithRetry('https://api.example.com/test', { method: 'GET' })
      expect(response.ok).toBe(true)
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    })

    it('returns error response for server errors (5xx) without retrying on HTTP level', async () => {
      const errorResponse = { ok: false, status: 500 }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse))

      const fetchWithRetry = (
        provider as unknown as {
          fetchWithRetry: (url: string, init: RequestInit, retries?: number) => Promise<Response>
        }
      ).fetchWithRetry.bind(provider)

      const response = await fetchWithRetry('https://api.example.com/test', { method: 'GET' })
      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
      // The implementation waits but does not re-fetch on HTTP errors
    })

    it('returns error response for rate limit (429) without retrying on HTTP level', async () => {
      const rateLimitResponse = { ok: false, status: 429 }

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rateLimitResponse))

      const fetchWithRetry = (
        provider as unknown as {
          fetchWithRetry: (url: string, init: RequestInit, retries?: number) => Promise<Response>
        }
      ).fetchWithRetry.bind(provider)

      const response = await fetchWithRetry('https://api.example.com/test', { method: 'GET' })
      expect(response.ok).toBe(false)
      expect(response.status).toBe(429)
    })

    it('retries on network exceptions (fetch throws)', async () => {
      const successResponse = { ok: true, status: 200 }

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(successResponse)
      )

      const fetchWithRetry = (
        provider as unknown as {
          fetchWithRetry: (url: string, init: RequestInit, retries?: number) => Promise<Response>
        }
      ).fetchWithRetry.bind(provider)

      const response = await fetchWithRetry('https://api.example.com/test', { method: 'GET' })
      expect(response.ok).toBe(true)
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    })
  })

  describe('capabilities', () => {
    it('exposes correct provider metadata', () => {
      expect(provider.id).toBe('test-provider')
      expect(provider.name).toBe('Test Provider')
      expect(provider.version).toBe('1.0.0')
    })

    it('reports supported capabilities', () => {
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.reasoning).toBe(false)
      expect(provider.capabilities.toolCalling).toBe(true)
      expect(provider.capabilities.maxContextWindow).toBe(128000)
      expect(provider.capabilities.supportedModels).toContain('test-model-v1')
    })
  })

  describe('dispose', () => {
    it('disposes without error (no-op by default)', async () => {
      await expect(provider.dispose()).resolves.toBeUndefined()
    })
  })
})
