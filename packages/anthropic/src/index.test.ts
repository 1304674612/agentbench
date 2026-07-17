import { describe, it, expect } from 'vitest'
import { AgentBenchAnthropic } from './index'

describe('AgentBenchAnthropic', () => {
  describe('constructor', () => {
    it('creates a client with an API key', () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      expect(client).toBeInstanceOf(AgentBenchAnthropic)
    })

    it('accepts base URL override', () => {
      const client = new AgentBenchAnthropic({
        apiKey: 'sk-ant-test',
        baseURL: 'https://custom.anthropic.com',
      })
    })

    it('accepts Anthropic API version', () => {
      const client = new AgentBenchAnthropic({
        apiKey: 'sk-ant-test',
        anthropicVersion: '2023-06-01',
      })
    })

    it('accepts tracing control and timeout', () => {
      const client = new AgentBenchAnthropic({
        apiKey: 'sk-ant-test',
        tracing: false,
        timeout: 60000,
        maxRetries: 3,
      })
    })
  })

  describe('capabilities', () => {
    it('declares correct Claude capabilities', () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      expect(client.capabilities.streaming).toBe(true)
      expect(client.capabilities.toolCalling).toBe(true)
      expect(client.capabilities.vision).toBe(true)
      expect(client.capabilities.reasoning).toBe(true)
      expect(client.capabilities.maxContextWindow).toBe(200000)
    })
  })

  describe('countTokens', () => {
    it('returns token count for a message', async () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      const result = await client.countTokens({
        model: 'claude-sonnet-4-20250514',
        messages: 'Hello, Claude!',
      })
      expect(result.totalTokens).toBeGreaterThan(0)
    })

    it('returns token count for message array', async () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      const result = await client.countTokens({
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: 'What is 2+2?' },
        ],
      })
      expect(result.totalTokens).toBeGreaterThan(0)
    })
  })

  describe('calculateCost', () => {
    it('returns cost breakdown for Claude Sonnet', () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      const cost = client.calculateCost(
        { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 },
        'claude-sonnet-4-20250514'
      )
      expect(cost.totalCost).toBeGreaterThan(0)
      expect(cost.currency).toBe('usd')
    })
  })

  describe('healthCheck', () => {
    it('returns health status format', async () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      const status = await client.healthCheck()
      expect(status).toHaveProperty('healthy')
      expect(status).toHaveProperty('latency')
      expect(typeof status.message).toBe('string')
    })
  })

  describe('dispose', () => {
    it('completes without error', async () => {
      const client = new AgentBenchAnthropic({ apiKey: 'sk-ant-test' })
      await client.dispose()
    })
  })
})
