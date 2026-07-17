import { describe, it, expect } from 'vitest'
import { GeminiProvider, createGeminiProvider } from './index'

describe('GeminiProvider', () => {
  describe('constructor and identity', () => {
    it('has correct id, name, and version', () => {
      const provider = new GeminiProvider()
      expect(provider.id).toBe('gemini')
      expect(provider.name).toBe('Google Gemini')
      expect(provider.version).toBe('0.5.0')
    })

    it('declares correct capabilities', () => {
      const provider = new GeminiProvider()
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.toolCalling).toBe(true)
      expect(provider.capabilities.functionCalling).toBe(true)
      expect(provider.capabilities.vision).toBe(true)
      expect(provider.capabilities.maxContextWindow).toBe(2000000)
    })

    it('lists supported models', () => {
      const provider = new GeminiProvider()
      expect(provider.capabilities.supportedModels.length).toBeGreaterThan(0)
      expect(provider.capabilities.supportedModels).toContain('gemini-2.5-flash')
    })
  })

  describe('initialize', () => {
    it('sets API key and defaults', async () => {
      const provider = new GeminiProvider()
      await provider.initialize({ apiKey: 'test-key' })
      // Should not throw
    })

    it('accepts custom base URL', async () => {
      const provider = new GeminiProvider()
      await provider.initialize({
        apiKey: 'test-key',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      })
    })

    it('accepts Gemini-specific options', async () => {
      const provider = new GeminiProvider()
      await provider.initialize({
        apiKey: 'test-key',
        timeout: 30000,
        maxRetries: 2,
      })
    })
  })

  describe('adaptResponse', () => {
    it('handles a standard Gemini response', () => {
      const provider = new GeminiProvider()
      const raw = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello from Gemini!' }],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.choices).toHaveLength(1)
      expect(result.choices[0].message.content).toBe('Hello from Gemini!')
      expect(result.choices[0].finishReason).toBe('stop')
      expect(result.usage.promptTokens).toBe(10)
      expect(result.usage.completionTokens).toBe(5)
      expect(result.usage.totalTokens).toBe(15)
      expect(result.provider).toBe('gemini')
    })

    it('handles tool calls in response', () => {
      const provider = new GeminiProvider()
      const raw = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'get_weather',
                    args: { city: 'Tokyo' },
                  },
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 20,
          candidatesTokenCount: 10,
          totalTokenCount: 30,
        },
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.choices[0].message.content).toBeNull()
      expect((result.choices[0].message as any).tool_calls).toBeDefined()
    })

    it('handles missing usage data gracefully', () => {
      const provider = new GeminiProvider()
      const raw = {
        candidates: [
          {
            content: { parts: [{ text: 'OK' }], role: 'model' },
            finishReason: 'STOP',
          },
        ],
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.usage.totalTokens).toBe(0)
    })
  })

  describe('healthCheck', () => {
    it('reports unhealthy without valid API key', async () => {
      const provider = new GeminiProvider()
      await provider.initialize({ apiKey: '' })
      const status = await provider.healthCheck()
      expect(status.healthy).toBe(false)
    })
  })

  describe('createGeminiProvider factory', () => {
    it('returns an initialized provider', async () => {
      const provider = await createGeminiProvider({ apiKey: 'test-key' })
      expect(provider).toBeInstanceOf(GeminiProvider)
      expect(provider.id).toBe('gemini')
    })
  })
})
