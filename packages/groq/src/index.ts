/**
 * @agentbench/groq
 *
 * Groq provider — extends OpenAICompatibleProvider.
 * Ultra-fast inference via Groq's LPU-powered API.
 *
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 *
 * @packageDocumentation
 */

import { OpenAICompatibleProvider } from '@agentbench/provider-utils'
import type { ProviderCapabilities, ProviderConfig } from '@agentbench/provider-utils'

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.3-70b-specdec',
  'llama-3.1-8b-instant',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'deepseek-r1-distill-llama-70b',
  'deepseek-r1-distill-qwen-32b',
]

export class GroqProvider extends OpenAICompatibleProvider {
  readonly id = 'groq'
  readonly name = 'Groq'
  readonly version = '0.3.0'
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: false,
    embeddings: false,
    toolCalling: true,
    vision: true,
    functionCalling: true,
    jsonMode: true,
    maxContextWindow: 131072,
    supportedModels: GROQ_MODELS,
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.baseUrl = config.baseUrl ?? 'https://api.groq.com/openai/v1'
    this.apiKey = config.apiKey ?? ''
    this.timeout = config.timeout ?? 30000 // Groq is fast — shorter timeout
    this.maxRetries = config.maxRetries ?? 2
  }
}

export async function createGroqProvider(config: ProviderConfig = {}): Promise<GroqProvider> {
  const provider = new GroqProvider()
  await provider.initialize(config)
  return provider
}
