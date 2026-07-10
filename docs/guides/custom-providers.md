---
title: "Building Custom Providers"
description: "Complete tutorial for building third-party LLM providers for AgentBench — extending OpenAICompatibleProvider, building from scratch, the provider lifecycle, registration, auto-discovery, testing, and publishing to npm."
targetAudience: "Developers building custom LLM provider integrations for AgentBench"
readingTime: "15 min"
prerequisites:
  - "Familiarity with TypeScript and async/await"
  - "Understanding of LLM API formats (Chat Completions)"
  - "AgentBench provider-utils package (pnpm add @agentbench/provider-utils)"
---

## Overview

AgentBench's provider system enables uniform testing across any LLM provider. All 12 built-in providers (OpenAI, Anthropic, Gemini, DeepSeek, Azure OpenAI, OpenRouter, Groq, Ollama, etc.) implement the same `AgentBenchProvider` interface. You can add support for any LLM API by implementing this interface.

This guide covers two approaches:
1. **Extend `OpenAICompatibleProvider`** — for any API that speaks the OpenAI Chat Completions format (90% of providers)
2. **Build from scratch** — for APIs that use a completely different format (like Anthropic)

We also walk through a complete example: building an "AcmeAI" provider step by step.

---

## 1. The `AgentBenchProvider` Interface

The core interface is defined in `@agentbench/provider-utils`. Every provider must implement all methods:

```typescript
interface AgentBenchProvider {
  // Identity
  readonly id: string                    // Unique identifier: 'openai', 'anthropic', etc.
  readonly name: string                  // Human-readable: 'OpenAI', 'Anthropic'
  readonly version: string               // Semantic version: '0.3.0'
  readonly capabilities: ProviderCapabilities // What this provider supports

  // Core methods
  createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>
  createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined>

  // Token and cost
  countTokens(params: TokenCountParams): Promise<TokenCountResult>
  calculateCost(usage: Usage, model: string): CostBreakdown

  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>
  healthCheck(): Promise<HealthStatus>
  dispose(): Promise<void>
}
```

### Provider Capabilities

```typescript
interface ProviderCapabilities {
  streaming: boolean        // Supports SSE streaming
  reasoning: boolean        // Has reasoning/thinking models
  embeddings: boolean       // Supports embeddings API
  toolCalling: boolean      // Supports tool/function calling
  vision: boolean           // Supports image inputs
  functionCalling: boolean  // Legacy OpenAI function calling
  jsonMode: boolean         // Supports structured JSON output
  maxContextWindow: number  // Maximum context window in tokens
  supportedModels: string[] // List of supported model IDs
}
```

---

## 2. Approach 1: Extending `OpenAICompatibleProvider`

Most LLM APIs (Groq, DeepSeek, OpenRouter, Azure OpenAI, Ollama, vLLM, LM Studio, Fireworks, Together AI, Perplexity, Mistral, Cohere) implement the OpenAI Chat Completions format at `POST /v1/chat/completions`.

The `OpenAICompatibleProvider` base class handles all HTTP plumbing — you only need to implement 3 methods:

### Method 1: `adaptParams`

Translate AgentBench's unified `ChatCompletionParams` into the provider-specific request body:

```typescript
protected abstract adaptParams(params: ChatCompletionParams): unknown
```

### Method 2: `adaptResponse`

Translate the provider's API response into AgentBench's unified `ChatCompletionResult`:

```typescript
protected abstract adaptResponse(raw: unknown): ChatCompletionResult
```

### Method 3: `countTokens` and `calculateCost`

Token counting and cost calculation for your provider's models:

```typescript
abstract countTokens(params: TokenCountParams): Promise<TokenCountResult>
abstract calculateCost(usage: Usage, model: string): CostBreakdown
```

### Complete Example: Groq Provider

Let's walk through the actual Groq provider built into AgentBench. Groq is fully OpenAI-compatible with no parameter translation needed, but has unique pricing and a different base URL:

```typescript
import { OpenAICompatibleProvider } from '@agentbench/provider-utils'
import type {
  ProviderCapabilities,
  ChatCompletionParams,
  ChatCompletionResult,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
} from '@agentbench/provider-utils'

const GROQ_MODELS = [
  'llama-3.1-8b-instant', 'llama-3.1-70b-versatile',
  'llama-3.2-1b-preview', 'llama-3.2-3b-preview',
  'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview',
  'mixtral-8x7b-32768', 'gemma2-9b-it',
  'llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b',
  'qwen-2.5-32b',
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
    maxContextWindow: 128000,
    supportedModels: GROQ_MODELS,
  }

  // Groq uses a different base URL
  protected baseUrl = 'https://api.groq.com/openai/v1'

  // No translation needed — Groq is fully OpenAI-compatible
  protected adaptParams(params: ChatCompletionParams): unknown {
    return params
  }

  // No translation needed — Groq responses match OpenAI format
  protected adaptResponse(raw: unknown): ChatCompletionResult {
    return raw as ChatCompletionResult
  }

  // Token counting with heuristic fallback
  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    const text = params.text ?? params.messages?.map(m => m.content).join(' ') ?? ''
    // Simple heuristic: ~4 chars per token for Llama models
    return {
      tokens: Math.ceil(text.length / 4),
      model: params.model,
      method: 'heuristic',
    }
  }

  // Groq-specific pricing
  calculateCost(usage: Usage, model: string): CostBreakdown {
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'llama-3.1-8b-instant':       { prompt: 0.05, completion: 0.08 },
      'llama-3.1-70b-versatile':    { prompt: 0.59, completion: 0.79 },
      'llama-3.2-1b-preview':       { prompt: 0.04, completion: 0.04 },
      'llama-3.2-3b-preview':       { prompt: 0.06, completion: 0.06 },
      'llama-3.2-11b-vision-preview':{ prompt: 0.09, completion: 0.09 },
      'mixtral-8x7b-32768':         { prompt: 0.24, completion: 0.24 },
      'deepseek-r1-distill-llama-70b': { prompt: 0.69, completion: 0.80 },
    }

    const rates = pricing[model] ?? { prompt: 0.05, completion: 0.08 }
    const promptCost = (usage.promptTokens / 1_000_000) * rates.prompt
    const completionCost = (usage.completionTokens / 1_000_000) * rates.completion

    return {
      promptCost,
      completionCost,
      totalCost: promptCost + completionCost,
      currency: 'USD',
      model,
      rates: {
        promptPer1K: rates.prompt / 1_000,
        completionPer1K: rates.completion / 1_000,
      },
    }
  }
}
```

The entire provider is under 100 lines of TypeScript. Most of it is the pricing table and model list.

---

## 3. Approach 2: Building From Scratch

When your provider's API is fundamentally different from OpenAI's format (like Anthropic's Messages API), implement the `AgentBenchProvider` interface directly.

### When to Build From Scratch

- The API has a different endpoint structure (not `POST /v1/chat/completions`)
- The request format differs significantly (Anthropic: system as top-level parameter, different tool schema)
- The response format differs significantly (Anthropic: content blocks vs. choices)
- Streaming uses a different protocol (Anthropic: SSE with content_block events)

### Complete Walkthrough: Building an "AcmeAI" Provider

Let's build a complete provider for a fictional "AcmeAI" API.

#### Step 1: Define the Provider

```typescript
// packages/provider-acmeai/src/index.ts
import type {
  AgentBenchProvider,
  ProviderCapabilities,
  ProviderConfig,
  ChatCompletionParams,
  ChatCompletionResult,
  StreamChunk,
  TokenCountParams,
  TokenCountResult,
  Usage,
  CostBreakdown,
  HealthStatus,
} from '@agentbench/provider-utils'

const ACMEAI_MODELS = [
  'acme-alpha', 'acme-beta', 'acme-turbo', 'acme-reasoning',
]

const ACMEAI_PRICING: Record<string, { prompt: number; completion: number }> = {
  'acme-alpha':     { prompt: 0.005, completion: 0.015 },
  'acme-beta':      { prompt: 0.003, completion: 0.010 },
  'acme-turbo':     { prompt: 0.001, completion: 0.005 },
  'acme-reasoning': { prompt: 0.010, completion: 0.040 },
}

export class AcmeAIProvider implements AgentBenchProvider {
  readonly id = 'acmeai'
  readonly name = 'AcmeAI'
  readonly version = '0.1.0'

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    reasoning: true,
    embeddings: false,
    toolCalling: true,
    vision: false,
    functionCalling: false,
    jsonMode: true,
    maxContextWindow: 128000,
    supportedModels: ACMEAI_MODELS,
  }

  private apiKey = ''
  private baseUrl = 'https://api.acmeai.com/v2'
  private timeout = 60000
  private maxRetries = 2
}
```

#### Step 2: Implement Lifecycle Methods

```typescript
  async initialize(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new Error('AcmeAI provider requires an API key. Set ACMEAI_API_KEY.')
    }
    this.apiKey = config.apiKey
    if (config.baseUrl) this.baseUrl = config.baseUrl
    if (config.timeout) this.timeout = config.timeout
    if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await this.fetchWithRetry(`${this.baseUrl}/health`)
      return {
        healthy: res.ok,
        latency: Date.now() - start,
        message: res.ok ? 'Connected' : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        healthy: false,
        latency: Date.now() - start,
        message: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  async dispose(): Promise<void> {
    // Clean up any connections, abort controllers, etc.
  }
```

#### Step 3: Implement Chat Completion (Non-Streaming)

```typescript
  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    // Translate unified params to AcmeAI format
    const acmeRequest = {
      model_id: params.model,
      conversation: params.messages.map(m => ({
        speaker: this.mapRole(m.role),
        text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      parameters: {
        temperature: params.temperature ?? 0.7,
        max_output_tokens: params.maxTokens ?? 4096,
        enable_tools: params.tools ? true : false,
        tool_definitions: params.tools?.map(t => ({
          tool_name: t.function.name,
          tool_description: t.function.description,
          tool_schema: t.function.parameters,
        })),
        response_mode: params.responseFormat?.type === 'json_object' ? 'json' : 'text',
      },
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(acmeRequest),
        signal: AbortSignal.timeout(this.timeout),
      }
    )

    if (!response.ok) {
      throw new Error(`AcmeAI error (${response.status}): ${await response.text()}`)
    }

    const raw = await response.json()

    // Translate AcmeAI response to unified format
    return {
      id: raw.response_id,
      model: params.model,
      created: Date.now(),
      provider: this.id,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: raw.output_text,
          tool_calls: raw.tool_invocations?.map((ti: any) => ({
            id: ti.call_id,
            type: 'function' as const,
            function: {
              name: ti.tool_name,
              arguments: JSON.stringify(ti.arguments),
            },
          })),
        },
        finishReason: raw.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      }],
      usage: {
        promptTokens: raw.usage.input_tokens,
        completionTokens: raw.usage.output_tokens,
        totalTokens: raw.usage.total_tokens,
      },
    }
  }
```

#### Step 4: Implement Streaming

```typescript
  async *createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk, void, undefined> {
    const acmeRequest = {
      model_id: params.model,
      stream: true,
      conversation: params.messages.map(m => ({
        speaker: this.mapRole(m.role),
        text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      parameters: {
        temperature: params.temperature ?? 0.7,
        max_output_tokens: params.maxTokens ?? 4096,
      },
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(acmeRequest),
        signal: AbortSignal.timeout(this.timeout),
      }
    )

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') return

          try {
            const json = JSON.parse(data)
            // Translate AcmeAI stream event to unified StreamChunk
            yield {
              id: json.event_id,
              model: params.model,
              created: Date.now(),
              provider: this.id,
              choices: [{
                index: 0,
                delta: {
                  content: json.text_delta ?? '',
                },
                finishReason: json.is_final ? 'stop' : null,
              }],
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
```

#### Step 5: Implement Token Counting and Cost Calculation

```typescript
  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    // Option 1: Use provider's token counting endpoint if available
    try {
      const text = params.text ?? params.messages?.map(m => m.content).join(' ') ?? ''
      const res = await this.fetchWithRetry(
        `${this.baseUrl}/count-tokens`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
          body: JSON.stringify({ text, model: params.model }),
          signal: AbortSignal.timeout(5000),
        }
      )
      if (res.ok) {
        const data = await res.json()
        return { tokens: data.count, model: params.model, method: 'api' }
      }
    } catch {
      // Fall through to heuristic
    }

    // Option 2: Heuristic fallback (4 chars per token)
    const text = params.text ?? params.messages?.map(m => m.content).join(' ') ?? ''
    return {
      tokens: Math.ceil(text.length / 4),
      model: params.model,
      method: 'heuristic',
    }
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    const rates = ACMEAI_PRICING[model] ?? { prompt: 0.005, completion: 0.015 }
    const promptCost = (usage.promptTokens / 1_000) * rates.prompt
    const completionCost = (usage.completionTokens / 1_000) * rates.completion

    return {
      promptCost,
      completionCost,
      totalCost: promptCost + completionCost,
      currency: 'USD',
      model,
      rates: {
        promptPer1K: rates.prompt,
        completionPer1K: rates.completion,
      },
    }
  }
```

#### Step 6: Helper Methods

```typescript
  private mapRole(role: string): string {
    const roleMap: Record<string, string> = {
      system: 'system',
      user: 'user',
      assistant: 'assistant',
      tool: 'tool_output',
    }
    return roleMap[role] ?? 'user'
  }

  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, init)
        if (response.status < 500 && response.status !== 429) return response
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
        }
      } catch (err) {
        if (attempt >= this.maxRetries) throw err
        await new Promise(r => setTimeout(r, 1000 * 2 ** attempt))
      }
    }
    throw new Error('Max retries exceeded')
  }
}
```

---

## 4. The Provider Lifecycle

AgentBench calls provider methods in a specific order:

```
initialize(config)
    │
    ▼
healthCheck()  ← Optional manual check
    │
    ▼
createChatCompletion(params)  ← Called once per LLM call
createStreamingChatCompletion(params)
    │
    ▼
countTokens(params)  ← For cost estimation
calculateCost(usage, model)  ← For cost tracking
    │
    ▼
dispose()  ← Called on shutdown
```

### What Goes Where

| Phase | Method | Purpose | Example |
|-------|--------|---------|---------|
| Setup | `initialize` | Validate API key, warm up connections | `if (!config.apiKey) throw` |
| Verify | `healthCheck` | Test connectivity before running tests | `GET /models` |
| Execute | `createChatCompletion` | Run non-streaming completions | Main workhorse |
| Execute | `createStreamingChatCompletion` | Run streaming completions | For `stream: true` |
| Measure | `countTokens` | Pre-flight token counting | Before API call |
| Measure | `calculateCost` | Post-hoc cost calculation | After API call |
| Teardown | `dispose` | Clean up resources | Close connections |

---

## 5. Registering Providers

### Option 1: In agentbench.config.ts

```typescript
import { defineConfig } from '@agentbench/config'
import { AcmeAIProvider } from '@agentbench/provider-acmeai'

export default defineConfig({
  providers: {
    acmeai: {
      instance: new AcmeAIProvider(),
      apiKey: process.env.ACMEAI_API_KEY!,
      defaultModel: 'acme-turbo',
    },
  },
})
```

### Option 2: As an npm Package

Name your package `@agentbench/provider-acmeai`. AgentBench auto-discovers packages matching the `@agentbench/provider-*` pattern:

```bash
pnpm add @agentbench/provider-acmeai
```

Usage in tests:

```typescript
import { Runner } from '@agentbench/core'

const runner = new Runner({
  agent: {
    provider: 'acmeai',   // Matches the provider's `id` field
    model: 'acme-turbo',
    systemPrompt: 'You are helpful.',
  },
})
```

### Auto-Discovery

AgentBench scans `node_modules` for packages matching `@agentbench/provider-*` at startup. Each provider package must:

1. Have a `package.json` with `"name": "@agentbench/provider-xxx"`
2. Export a class implementing `AgentBenchProvider` as the main export
3. Have the `id` field match the package suffix (e.g., `@agentbench/provider-acmeai` has `id: 'acmeai'`)

---

## 6. Testing Your Custom Provider

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { AcmeAIProvider } from '@agentbench/provider-acmeai'

describe('AcmeAIProvider', () => {
  let provider: AcmeAIProvider

  beforeEach(() => {
    provider = new AcmeAIProvider()
  })

  it('has correct identity', () => {
    expect(provider.id).toBe('acmeai')
    expect(provider.name).toBe('AcmeAI')
    expect(provider.capabilities.streaming).toBe(true)
    expect(provider.capabilities.toolCalling).toBe(true)
  })

  it('fails to initialize without API key', async () => {
    await expect(provider.initialize({})).rejects.toThrow('API key')
  })

  it('initializes with API key', async () => {
    await expect(provider.initialize({ apiKey: 'test-key' })).resolves.not.toThrow()
  })

  it('calculates cost correctly', () => {
    const cost = provider.calculateCost(
      { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
      'acme-turbo'
    )
    expect(cost.promptCost).toBeCloseTo(0.001)
    expect(cost.completionCost).toBeCloseTo(0.0025)
    expect(cost.totalCost).toBeCloseTo(0.0035)
  })

  it('healthCheck works', async () => {
    const health = await provider.healthCheck()
    expect(health).toHaveProperty('healthy')
    expect(health).toHaveProperty('latency')
  })
})
```

### Integration Test

```typescript
import { Runner } from '@agentbench/core'

test('AcmeAI provider works end-to-end', async () => {
  const provider = new AcmeAIProvider()
  await provider.initialize({ apiKey: process.env.ACMEAI_API_KEY! })

  const runner = new Runner({
    name: 'AcmeAI Integration',
    agent: {
      provider: 'acmeai',
      model: 'acme-turbo',
      systemPrompt: 'You are helpful.',
      temperature: 0,
    },
    client: provider,
  })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'What is 2+2?' }],
  })

  expect(result.status).toBe('passed')
  expect(result.output).toContain('4')
  expect(result.trace.steps.length).toBeGreaterThan(0)
  expect(result.metrics.totalCost).toBeGreaterThan(0)

  await provider.dispose()
})
```

---

## 7. Publishing to npm

### Package Structure

```
packages/provider-acmeai/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts            # Main export
│   ├── acmeai-provider.ts  # Provider implementation
│   └── index.test.ts       # Tests
└── README.md
```

### package.json

```json
{
  "name": "@agentbench/provider-acmeai",
  "version": "0.1.0",
  "description": "AcmeAI provider for AgentBench",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "test": "vitest"
  },
  "keywords": ["agentbench", "agentbench-provider", "acmeai"],
  "peerDependencies": {
    "@agentbench/provider-utils": ">=0.3.0"
  },
  "devDependencies": {
    "@agentbench/provider-utils": "workspace:*",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

### Publishing

```bash
cd packages/provider-acmeai
pnpm build
pnpm test
npm publish --access public
```

---

## 8. Provider Validation Checklist

Before publishing, verify your provider meets these criteria:

- [ ] Implements all `AgentBenchProvider` interface methods
- [ ] `id` is unique (does not conflict with built-in providers)
- [ ] `capabilities` accurately reflects the API's features
- [ ] `initialize()` validates required config (throws descriptive errors)
- [ ] `healthCheck()` returns meaningful latency and message
- [ ] `createChatCompletion()` correctly translates between unified and provider formats
- [ ] `createStreamingChatCompletion()` yields all chunks correctly
- [ ] `countTokens()` provides a reasonable estimate (even if heuristic)
- [ ] `calculateCost()` returns accurate costs for all supported models
- [ ] `dispose()` cleans up any resources
- [ ] Error responses are converted to descriptive Error objects
- [ ] Retry logic handles 429 and 5xx errors
- [ ] Works with AgentBench's `Runner` engine
- [ ] Works with AgentBench's assertion DSL
- [ ] Packages named `@agentbench/provider-*` for auto-discovery
- [ ] README documents configuration and supported models

---

## Common Pitfalls

### Not normalizing model IDs

Different providers use different model ID formats (e.g., `gpt-4o` vs `openai/gpt-4o` on OpenRouter). Always pass through the exact model ID needed by the provider API. If your provider strips prefixes (like OpenRouter does with `openai/`), make sure to handle that in `adaptParams`.

### Forgetting to translate error responses

Provider error responses vary wildly in format. Always extract the most useful error message from the response body and include the HTTP status code:

```typescript
let detail = ''
try {
  const body = await response.json()
  detail = body.error?.message ?? body.message ?? JSON.stringify(body)
} catch {
  detail = await response.text()
}
throw new Error(`${this.name} API error (${response.status}): ${detail}`)
```

### Not handling streaming edge cases

Streaming at scale is hard. Common issues to handle:
- Chunks that arrive out of order
- Empty chunks
- Chunks with no `choices` array
- Stream interruptions
- The `[DONE]` sentinel not arriving

AgentBench's `streaming.ts` in provider-utils provides helpers for OpenAI and Anthropic streaming formats.

### Inaccurate cost calculation

LLM pricing changes frequently. Keep your pricing table up to date. Consider adding a `lastUpdated` field to your cost breakdown:

```typescript
return {
  // ... cost fields
  rates: {
    promptPer1K: 0.005,
    completionPer1K: 0.015,
    lastUpdated: '2026-07-01',
  },
}
```

### Not testing with the Runner

Your provider may work in isolation but fail when used through the `Runner` engine. Always run an integration test:

```typescript
const runner = new Runner({
  agent: { provider: 'acmeai', model: 'acme-turbo', /* ... */ },
  client: new AcmeAIProvider(),
})
const result = await runner.execute({ /* ... */ })
```

---

## Next Steps

- [Building Custom Judges](./custom-judges.md) — Create custom LLM-based evaluators
- [Testing OpenAI Agents](./testing-openai-agents.md) — See how the built-in OpenAI provider works
- [Testing Anthropic Claude Agents](./testing-anthropic-agents.md) — See a full from-scratch provider
- [CI/CD Integration](./ci-cd-integration.md) — Test your custom provider in CI

---

> [Back to Documentation Center](../INDEX.md)
