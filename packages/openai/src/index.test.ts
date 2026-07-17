import { describe, it, expect } from 'vitest'
import { AgentBenchOpenAI } from './index'

describe('AgentBenchOpenAI', () => {
  describe('constructor', () => {
    it('creates a client with an API key', () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      expect(client).toBeInstanceOf(AgentBenchOpenAI)
    })

    it('accepts base URL override', () => {
      const client = new AgentBenchOpenAI({
        apiKey: 'sk-test',
        baseURL: 'https://custom.openai.com/v1',
      })
      // Should not throw
    })

    it('accepts tracing and timeout options', () => {
      const client = new AgentBenchOpenAI({
        apiKey: 'sk-test',
        tracing: false,
        timeout: 30000,
        maxRetries: 2,
      })
      // Should not throw
    })

    it('works without tracing enabled', () => {
      const client = new AgentBenchOpenAI({
        apiKey: 'sk-test',
        tracing: false,
      })
    })
  })

  describe('capabilities', () => {
    it('declares correct capabilities', () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      expect(client.capabilities.streaming).toBe(true)
      expect(client.capabilities.toolCalling).toBe(true)
      expect(client.capabilities.vision).toBe(true)
      expect(client.capabilities.reasoning).toBe(true)
      expect(client.capabilities.embeddings).toBe(true)
      expect(client.capabilities.jsonMode).toBe(true)
      expect(client.capabilities.maxContextWindow).toBe(200000)
    })
  })

  describe('healthCheck', () => {
    it('returns healthy status format', async () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      const status = await client.healthCheck()
      expect(status).toHaveProperty('healthy')
      expect(status).toHaveProperty('latency')
      expect(status).toHaveProperty('message')
    })
  })

  describe('countTokens', () => {
    it('returns token count for a message', async () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      const result = await client.countTokens({
        model: 'gpt-4o',
        messages: 'Hello, world!',
      })
      expect(result.totalTokens).toBeGreaterThan(0)
    })

    it('returns token count for message array', async () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      const result = await client.countTokens({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello!' },
        ],
      })
      expect(result.totalTokens).toBeGreaterThan(0)
    })
  })

  describe('calculateCost', () => {
    it('returns cost breakdown for GPT-4o', () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      const cost = client.calculateCost(
        { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
        'gpt-4o'
      )
      expect(cost.totalCost).toBeGreaterThan(0)
      expect(cost.currency).toBe('usd')
    })
  })

  describe('dispose', () => {
    it('completes without error', async () => {
      const client = new AgentBenchOpenAI({ apiKey: 'sk-test' })
      await client.dispose()
    })
  })
})
