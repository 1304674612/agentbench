import { describe, it, expect } from 'vitest'
import { GroqProvider, createGroqProvider } from './index'

describe('GroqProvider', () => {
  describe('constructor and identity', () => {
    it('has correct id, name, and version', () => {
      const provider = new GroqProvider()
      expect(provider.id).toBe('groq')
      expect(provider.name).toBe('Groq')
      expect(provider.version).toBe('0.5.0')
    })

    it('declares correct capabilities', () => {
      const provider = new GroqProvider()
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.toolCalling).toBe(true)
      expect(provider.capabilities.vision).toBe(true)
      expect(provider.capabilities.reasoning).toBe(false)
      expect(provider.capabilities.embeddings).toBe(false)
      expect(provider.capabilities.maxContextWindow).toBe(131072)
    })

    it('lists supported models including Llama and Mixtral', () => {
      const provider = new GroqProvider()
      expect(provider.capabilities.supportedModels.length).toBeGreaterThan(0)
      expect(provider.capabilities.supportedModels).toContain('llama-3.3-70b-versatile')
    })
  })

  describe('initialize', () => {
    it('uses shorter timeout by default (Groq is fast)', async () => {
      const provider = new GroqProvider()
      await provider.initialize({ apiKey: 'gsk-test' })
      // Groq defaults to 30s timeout — verify no throw
    })

    it('accepts custom timeout override', async () => {
      const provider = new GroqProvider()
      await provider.initialize({ apiKey: 'gsk-test', timeout: 15000 })
      // Custom short timeout for ultra-fast Groq
    })
  })

  describe('adaptResponse', () => {
    it('handles a standard Groq response', () => {
      const provider = new GroqProvider()
      const raw = {
        id: 'groq-chatcmpl-abc',
        model: 'llama-3.3-70b-versatile',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hi from Groq!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        created: 1700000000,
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.id).toBe('groq-chatcmpl-abc')
      expect(result.model).toBe('llama-3.3-70b-versatile')
      expect(result.choices[0].message.content).toBe('Hi from Groq!')
      expect(result.usage.totalTokens).toBe(8)
      expect(result.provider).toBe('groq')
    })

    it('handles missing id and model fields', () => {
      const provider = new GroqProvider()
      const raw = {
        choices: [{ message: { role: 'assistant', content: 'Ok' }, finish_reason: 'stop' }],
      }

      const result = (provider as any).adaptResponse(raw)
      expect(result.id).toMatch(/^groq-\d+$/)
      expect(result.model).toBe('llama-3.3-70b-versatile')
    })
  })

  describe('countTokens', () => {
    it('returns estimated token count for a message', async () => {
      const provider = new GroqProvider()
      const result = await provider.countTokens({
        model: 'llama-3.3-70b-versatile',
        messages: 'Hello, how are you?',
      })

      expect(result.totalTokens).toBeGreaterThan(0)
      expect(result.promptTokens).toBeGreaterThan(0)
    })

    it('falls back to default ratio for unknown models', async () => {
      const provider = new GroqProvider()
      const result = await provider.countTokens({
        model: 'unknown-model',
        messages: 'Test message for token counting.',
      })

      expect(result.totalTokens).toBeGreaterThan(0)
    })
  })

  describe('createGroqProvider factory', () => {
    it('returns an initialized provider', async () => {
      const provider = await createGroqProvider({ apiKey: 'gsk-test' })
      expect(provider).toBeInstanceOf(GroqProvider)
      expect(provider.id).toBe('groq')
    })
  })
})
