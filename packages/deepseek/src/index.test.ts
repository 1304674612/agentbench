import { describe, it, expect } from 'vitest'
import { DeepSeekProvider, createDeepSeekProvider } from './index'

describe('DeepSeekProvider', () => {
  describe('constructor and identity', () => {
    it('has correct id, name, and version', () => {
      const provider = new DeepSeekProvider()
      expect(provider.id).toBe('deepseek')
      expect(provider.name).toBe('DeepSeek')
      expect(provider.version).toBe('0.5.0')
    })

    it('declares correct capabilities', () => {
      const provider = new DeepSeekProvider()
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.reasoning).toBe(true)
      expect(provider.capabilities.toolCalling).toBe(true)
      expect(provider.capabilities.vision).toBe(false)
      expect(provider.capabilities.embeddings).toBe(false)
      expect(provider.capabilities.maxContextWindow).toBe(65536)
    })

    it('lists supported models', () => {
      const provider = new DeepSeekProvider()
      expect(provider.capabilities.supportedModels).toContain('deepseek-chat')
      expect(provider.capabilities.supportedModels).toContain('deepseek-reasoner')
    })
  })

  describe('initialize', () => {
    it('sets defaults when no config is provided', async () => {
      const provider = new DeepSeekProvider()
      await provider.initialize({})
      // The base URL is set internally — verifying it doesn't throw
      expect(provider.capabilities.streaming).toBe(true)
    })

    it('uses custom base URL when provided', async () => {
      const provider = new DeepSeekProvider()
      await provider.initialize({ baseUrl: 'https://custom.deepseek.com/v1', apiKey: 'sk-test' })
      // Method should not throw
    })

    it('accepts timeout and maxRetries in config', async () => {
      const provider = new DeepSeekProvider()
      await provider.initialize({ apiKey: 'sk-test', timeout: 30000, maxRetries: 3 })
      // Method should not throw
    })
  })

  describe('adaptResponse', () => {
    it('handles a standard DeepSeek response', () => {
      const provider = new DeepSeekProvider()
      const raw = {
        id: 'chatcmpl-123',
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        created: 1700000000,
      }

      // Access the protected method for testing
      const result = (provider as any).adaptResponse(raw)
      expect(result.id).toBe('chatcmpl-123')
      expect(result.model).toBe('deepseek-chat')
      expect(result.choices).toHaveLength(1)
      expect(result.choices[0].message.content).toBe('Hello!')
      expect(result.choices[0].finishReason).toBe('stop')
      expect(result.usage.promptTokens).toBe(10)
      expect(result.usage.completionTokens).toBe(5)
      expect(result.usage.totalTokens).toBe(15)
      expect(result.provider).toBe('deepseek')
    })

    it('handles reasoning_content in response', () => {
      const provider = new DeepSeekProvider()
      const raw = {
        id: 'reasoner-456',
        model: 'deepseek-reasoner',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'The answer is 42.',
              reasoning_content: 'Let me think step by step...',
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 50, total_tokens: 70 },
        created: 1700000100,
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.choices[0].message.content).toBe('The answer is 42.')
      // reasoning_content should be preserved
      expect((result.choices[0].message as any).reasoning_content).toBe(
        'Let me think step by step...'
      )
    })

    it('handles missing usage data gracefully', () => {
      const provider = new DeepSeekProvider()
      const raw = {
        choices: [{ message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.usage.promptTokens).toBe(0)
      expect(result.usage.completionTokens).toBe(0)
      expect(result.usage.totalTokens).toBe(0)
      expect(result.id).toMatch(/^deepseek-\d+$/)
    })

    it('handles tool_calls in response', () => {
      const provider = new DeepSeekProvider()
      const raw = {
        id: 'tool-789',
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'get_weather', arguments: '{"city":"Beijing"}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 30, completion_tokens: 25, total_tokens: 55 },
        created: 1700000200,
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.choices[0].message.content).toBeNull()
      expect((result.choices[0].message as any).tool_calls).toBeDefined()
      expect((result.choices[0].message as any).tool_calls).toHaveLength(1)
      expect(result.choices[0].finishReason).toBe('tool_calls')
    })
  })

  describe('healthCheck', () => {
    it('reports unhealthy when no API key is set', async () => {
      const provider = new DeepSeekProvider()
      await provider.initialize({ apiKey: '' })
      const status = await provider.healthCheck()
      expect(status.healthy).toBe(false)
      expect(status.latency).toBeGreaterThanOrEqual(0)
      expect(typeof status.message).toBe('string')
    })
  })

  describe('createDeepSeekProvider factory', () => {
    it('returns an initialized provider', async () => {
      const provider = await createDeepSeekProvider({ apiKey: 'sk-test' })
      expect(provider).toBeInstanceOf(DeepSeekProvider)
      expect(provider.id).toBe('deepseek')
    })
  })
})
