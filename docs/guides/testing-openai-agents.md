---
title: "Testing OpenAI Agents"
description: "Complete guide to testing AI agents built with OpenAI models using AgentBench — from basic setup to streaming, tool calls, structured outputs, reasoning models, cost tracking, and troubleshooting."
targetAudience: "Developers testing agents that use OpenAI's GPT and o-series models"
readingTime: "10 min"
prerequisites:
  - "AgentBench installed (pnpm add @agentbench/core @agentbench/openai)"
  - "An OpenAI API key"
  - "Basic familiarity with the OpenAI Chat Completions API"
---

## Overview

OpenAI is the most widely used LLM provider for building AI agents. AgentBench's `@agentbench/openai` package wraps the official OpenAI SDK and intercepts every API call transparently — capturing traces, counting tokens, and calculating costs automatically. No code changes to your agent are required.

This guide covers everything from initial setup to advanced patterns for streaming, tool calling, structured outputs, reasoning models (o1, o3), and production troubleshooting.

---

## 1. Installation and Configuration

### Install the Package

```bash
pnpm add @agentbench/core @agentbench/openai
```

### Basic Configuration

```typescript
import { AgentBenchOpenAI } from '@agentbench/openai'

const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  tracing: true,          // Auto-capture traces
  timeout: 60000,         // 60-second timeout (default)
  maxRetries: 2,          // Retry on 429/5xx errors
})
```

The client implements the `AgentBenchProvider` interface from `@agentbench/provider-utils`, so it works directly with the `Runner` engine:

```typescript
import { Runner } from '@agentbench/core'

const runner = new Runner({
  name: 'GPT-4o Baseline',
  projectId: 'proj-xxx',
  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are a helpful customer service agent.',
  },
  client,
})
```

### Using agentbench.config.ts

For project-wide configuration, use `agentbench.config.ts`:

```typescript
import { defineConfig } from '@agentbench/config'

export default defineConfig({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      defaultModel: 'gpt-4o',
      timeout: 60000,
    },
  },
})
```

---

## 2. Setting Up API Keys

AgentBench reads the OpenAI API key from multiple sources, in priority order:

| Priority | Source | Example |
|----------|--------|---------|
| 1 | Constructor config | `new AgentBenchOpenAI({ apiKey: 'sk-...' })` |
| 2 | `agentbench.config.ts` | `providers.openai.apiKey` |
| 3 | Environment variable | `OPENAI_API_KEY=sk-...` |
| 4 | `.env.agentbench` file | `OPENAI_API_KEY=sk-...` |

### Best Practices

```bash
# Create a .env.agentbench file (auto-detected by AgentBench)
echo "OPENAI_API_KEY=sk-your-key-here" > .env.agentbench

# Optionally set the organization ID
echo "OPENAI_ORG_ID=org-xxx" >> .env.agentbench
```

```
// ❌ Don't hardcode keys in source code
const apiKey = 'sk-1234...'  // Security risk; will be committed to git

// ✅ Use environment variables or config
const apiKey = process.env.OPENAI_API_KEY!
```

### Using Multiple Projects

If you use different keys for different projects, configure per-project:

```typescript
const prodClient = new AgentBenchOpenAI({
  apiKey: process.env.PROD_OPENAI_API_KEY!,
})
const stagingClient = new AgentBenchOpenAI({
  apiKey: process.env.STAGING_OPENAI_API_KEY!,
  baseURL: 'https://staging-proxy.example.com/v1',
})
```

---

## 3. Automatic Tracing

The `@agentbench/openai` wrapper intercepts every `chat.completions.create()` call transparently. You do not need to modify your agent's code.

### What Gets Captured

Each LLM call produces a `TraceStep` containing:

| Field | Description |
|-------|-------------|
| `llmRequest.messages` | Full message array (system, user, assistant, tool) |
| `llmRequest.model` | Model used (e.g., `gpt-4o`) |
| `llmRequest.tools` | Tool definitions sent to the model |
| `llmResponse.content` | Full response text |
| `llmResponse.toolCalls` | Tool calls the model requested |
| `llmResponse.usage` | Token counts (prompt, completion, total) |
| `cost` | Cost in USD |
| `duration` | Round-trip time in milliseconds |

### Accessing the Trace

```typescript
const runner = new Runner({ /* ... */ })

const result = await runner.execute({
  messages: [{ role: 'user', content: 'How do I request a refund?' }],
})

// Full execution trace
console.log(result.trace.steps.length)       // Number of LLM/tool calls
console.log(result.trace.steps[0].llmRequest?.messages)
console.log(result.trace.steps[0].llmResponse?.content)
console.log(result.trace.steps[0].cost)      // Cost of this step in USD
```

### Disabling Tracing

```typescript
const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  tracing: false,  // No trace capture; still works for assertions
})
```

---

## 4. Testing Streaming Responses

OpenAI models can stream responses token-by-token via SSE (Server-Sent Events). AgentBench captures streamed responses and reconstructs them into a complete trace.

### Basic Streaming Test

```typescript
import { test, expect } from '@agentbench/core'

test('streaming response completes without error', async () => {
  const client = new AgentBenchOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const stream = client.createStreamingChatCompletion({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Count from 1 to 5, one per line.' }],
  })

  let fullContent = ''
  let chunkCount = 0

  for await (const chunk of stream) {
    chunkCount++
    fullContent += chunk.choices[0]?.delta?.content ?? ''
  }

  // Assertions on the streamed response
  expect(chunkCount).toBeGreaterThan(0)
  expect(fullContent).toContain('1')
  expect(fullContent).toContain('5')
})
```

### Streaming with Trace Capture

```typescript
test('streaming produces valid trace', async () => {
  const runner = new Runner({
    name: 'Streaming Test',
    agent: { provider: 'openai', model: 'gpt-4o', temperature: 0 },
    client,
  })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'Say hello in 3 languages.' }],
    stream: true,
  })

  // The trace contains reconstructed full content, not raw chunks
  const step = result.trace.steps[0]
  expect(step.llmResponse?.content).toContain('Hello')
  expect(step.llmResponse?.usage.totalTokens).toBeGreaterThan(0)
})
```

### Common Streaming Pitfall

Streaming responses do not include `usage` information until the final chunk. AgentBench waits for the stream to complete before recording the trace step, so `usage` and `cost` are always available in the trace.

---

## 5. Testing Tool Calls (Function Calling)

AgentBench provides dedicated assertions for testing whether your agent calls the right tools with the right arguments.

### Defining Tools

```typescript
const tools: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the company knowledge base for relevant articles.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          category: { type: 'string', enum: ['billing', 'shipping', 'returns'] },
        },
        required: ['query'],
      },
    },
  },
]
```

### Testing Tool Calls with Assertions

```typescript
test('agent should search before answering refund questions', async () => {
  const runner = new Runner({
    name: 'Tool Call Test',
    agent: {
      provider: 'openai',
      model: 'gpt-4o',
      systemPrompt: 'You are a customer support agent. Always search the knowledge base before answering.',
      tools,
    },
    client,
  })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'What is the refund policy for electronics?' }],
  })

  // Assert the right tool was called
  expect(result).tool('search_knowledge_base').toBeCalled()

  // Assert the tool was called with specific arguments
  expect(result).tool('search_knowledge_base').toBeCalledWith({
    query: expect.stringContaining('refund'),
  })

  // Assert tool was called an exact number of times
  expect(result).tool('search_knowledge_base').toBeCalledTimes(1)

  // Assert a tool was NOT called
  expect(result).tool('create_order').not.toBeCalled()
})
```

### Testing Parallel Tool Calls

```typescript
test('agent makes parallel tool calls when appropriate', async () => {
  const result = await runner.execute({
    messages: [{ role: 'user', content: 'Compare the refund policies for electronics and clothing.' }],
    tools,
  })

  // Tool was called at least twice (one per category)
  expect(result).tool('search_knowledge_base').toBeCalledTimes(expect.number.gte(2))
})
```

---

## 6. Testing Structured Outputs (JSON Mode)

OpenAI's JSON mode forces the model to output valid JSON, which is critical for agents that need to produce structured data.

### JSON Object Mode

```typescript
test('agent produces valid JSON when json_mode is enabled', async () => {
  const result = await runner.execute({
    messages: [
      {
        role: 'user',
        content: 'Extract the order details: "Order #12345 - 2x Widget ($10 each) - Status: Shipped"',
      },
    ],
    responseFormat: { type: 'json_object' },
  })

  // Parse the output as JSON
  const parsed = JSON.parse(result.output)

  expect(parsed).toHaveProperty('orderNumber')
  expect(parsed).toHaveProperty('items')
  expect(parsed).toHaveProperty('status')
})

test('agent respects json_schema response format (gpt-4o+)', async () => {
  const schema = {
    type: 'object',
    properties: {
      sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      summary: { type: 'string' },
    },
    required: ['sentiment', 'confidence', 'summary'],
    additionalProperties: false,
  }

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'The product arrived broken and customer service was unhelpful.' }],
    responseFormat: { type: 'json_schema', json_schema: schema },
  })

  const parsed = JSON.parse(result.output)
  expect(parsed.sentiment).toBe('negative')
  expect(parsed.confidence).toBeGreaterThan(0.7)
})
```

### JSON Mode Assertions

```typescript
test('structured output matches expected schema', async () => {
  const result = await runner.execute({ /* ... */ })

  // Built-in JSON schema assertion
  expect(result).output().toMatchJsonSchema({
    type: 'object',
    properties: {
      category: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    required: ['category', 'priority'],
  })
})
```

---

## 7. Testing Reasoning Models (o1, o3)

OpenAI's o-series models (o1, o1-pro, o3, o3-mini, o4-mini) have important differences from GPT models that affect testing.

### Key Differences

| Feature | GPT Models | o-series Models |
|---------|-----------|-----------------|
| `temperature` | Supported | **Not supported** — hardcoded to 1 |
| `system` role | Supported | Use `developer` role instead |
| `stream` | Supported | Supported (no token usage in stream) |
| Tool calling | Supported | Supported |
| `max_tokens` | Controls output length | `max_completion_tokens` instead |
| Reasoning tokens | N/A | Tracked as `reasoning_tokens` in usage |

### Configuring o-series Models

```typescript
const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// AgentBench automatically detects o-series models and adjusts parameters
const runner = new Runner({
  name: 'o3 Reasoning Test',
  agent: {
    provider: 'openai',
    model: 'o3-mini',
    // Note: temperature and systemPrompt are adapted automatically
    // - temperature is stripped (o-series hardcodes it to 1)
    // - system prompt is mapped to the 'developer' role
    systemPrompt: 'You are a math tutor. Solve problems step by step.',
    maxTokens: 4096,  // This will be sent as max_completion_tokens
  },
  client,
})
```

When AgentBench detects an o-series model (via `_isReasoningModel()`), it automatically:
1. Strips `temperature` from the request
2. Maps `system` role messages to `developer` role
3. Sends `max_tokens` as `max_completion_tokens`

### Testing Reasoning Quality

```typescript
test('o3-mini provides step-by-step reasoning', async () => {
  const runner = new Runner({
    name: 'o3-mini Reasoning',
    agent: {
      provider: 'openai',
      model: 'o3-mini',
      systemPrompt: 'You are a math tutor. Always show your work step by step.',
    },
    client,
  })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'A rectangle has a perimeter of 30 cm and an area of 50 cm^2. What are its dimensions?' }],
  })

  // Evaluate reasoning quality with LLM Judge
  const scores = await runner.evaluate(result.runId, {
    judge: { provider: 'openai', model: 'gpt-4o-mini', dimensions: ['reasoning', 'correctness'] },
  })

  expect(scores.find(s => s.dimension === 'reasoning')!.score).toBeGreaterThanOrEqual(7)
  expect(scores.find(s => s.dimension === 'correctness')!.score).toBeGreaterThanOrEqual(8)
})
```

### Reasoning Model Cost Awareness

o-series models are more expensive than GPT models. Use assertions to enforce cost budgets:

```typescript
test('o3 reasoning test stays within budget', async () => {
  const result = await runner.execute({
    messages: [{ role: 'user', content: 'Explain quantum computing in 3 sentences.' }],
  })

  // Enforce a cost ceiling
  expect(result).cost().toBeLessThan(0.02)  // $0.02 max

  // Track reasoning tokens separately
  const reasoningTokens = result.metrics.completionTokens  // Includes reasoning tokens
  console.log('Reasoning + output tokens:', reasoningTokens)
})
```

---

## 8. Cost Estimation and Token Tracking

### Token Counting

AgentBench uses `tiktoken` for accurate token counting with OpenAI models:

```typescript
import { tokenCounter } from '@agentbench/core'

// Count tokens in a message array
const count = await tokenCounter.count({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are helpful.' },
    { role: 'user', content: 'How do refunds work?' },
  ],
})
console.log(count.tokens)    // e.g., 28
console.log(count.method)    // 'tiktoken'
```

### Cost Calculation

```typescript
import { costCalculator } from '@agentbench/core'

const cost = costCalculator.calculate({
  model: 'gpt-4o',
  usage: {
    promptTokens: 150,
    completionTokens: 80,
    totalTokens: 230,
  },
})
console.log(cost.totalCost)  // USD value based on current pricing
console.log(cost.rates)      // { promptPer1K: 0.0025, completionPer1K: 0.01 }
```

### Cost Assertions

```typescript
test('simple queries stay within cost budget', async () => {
  const runner = new Runner({ /* ... */ })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'What is 2+2?' }],
  })

  // Assert cost stays under budget
  expect(result).cost().toBeLessThan(0.01)

  // Assert token usage
  expect(result).tokens().toBeLessThan(100)
  expect(result.metrics.promptTokens).toBeLessThan(50)
  expect(result.metrics.completionTokens).toBeLessThan(50)
})
```

### Tracking Cost Over a Test Suite

```typescript
suite('Customer Support Scenarios', () => {
  let totalCost = 0

  test.afterEach(({ result }) => {
    totalCost += result.metrics.totalCost
  })

  test.afterAll(() => {
    console.log(`Total suite cost: $${totalCost.toFixed(4)}`)
    expect(totalCost).toBeLessThan(1.00)  // Entire suite under $1
  })

  test('refund inquiry', async () => { /* ... */ })
  test('shipping status', async () => { /* ... */ })
  test('account cancellation', async () => { /* ... */ })
})
```

### Current Model Pricing (as of July 2026)

| Model | Prompt (per 1K tokens) | Completion (per 1K tokens) |
|-------|----------------------|---------------------------|
| gpt-4o | $0.0025 | $0.0100 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4.1 | $0.0020 | $0.0080 |
| gpt-4.1-mini | $0.00040 | $0.0016 |
| gpt-4.1-nano | $0.00010 | $0.0004 |
| o1 | $0.0150 | $0.0600 |
| o3-mini | $0.0011 | $0.0044 |
| o4-mini | $0.0011 | $0.0044 |

---

## 9. OpenAI-Specific Assertion Patterns

### Latency Assertions

```typescript
test('agent responds within acceptable time', async () => {
  const result = await runner.execute({
    messages: [{ role: 'user', content: 'What is the capital of France?' }],
  })

  expect(result).latency().toBeLessThan(5000)      // Under 5 seconds
  expect(result.metrics.firstTokenLatency).toBeLessThan(1000)  // First token under 1s
})
```

### Token Efficiency Assertions

```typescript
test('agent does not exceed token budget', async () => {
  const result = await runner.execute({
    messages: [{ role: 'user', content: 'Summarize this article in one paragraph.' }],
    maxTokens: 200,
  })

  expect(result).tokens().toBeLessThan(250)  // Headroom for prompt tokens
  expect(result.metrics.completionTokens).toBeLessThanOrEqual(200)
})
```

### Output Quality

```typescript
test('agent output is clear and actionable', async () => {
  const result = await runner.execute({
    messages: [{ role: 'user', content: 'I need to return a defective product.' }],
  })

  // Contains actionable information
  expect(result).output().toContain('return')
  expect(result).output().toContain('steps')
  expect(result).output().toMatch(/within \d+ days/)

  // Does not contain hallucination markers
  expect(result).output().not.toMatch(/As an AI|I cannot actually|I don't have access/)
})
```

---

## 10. Troubleshooting Rate Limits and API Errors

### Rate Limiting (HTTP 429)

**Symptom:** `AgentBenchOpenAI` throws with status 429.

**Causes:**
- Free tier rate limits (3 RPM for some models)
- Burst traffic exceeding your tier's limit
- Shared API key across multiple test runs

**Solutions:**

```typescript
// 1. Increase retries (AgentBench retries with exponential backoff by default)
const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 5,  // Retry up to 5 times on 429 errors
})

// 2. Set concurrency limits
const runner = new Runner({
  agent: { /* ... */ },
  client,
  options: {
    concurrency: 2,  // Only 2 parallel LLM calls
  },
})

// 3. Add delay between tests
import { sleep } from '@agentbench/core/utils'

for (const item of dataset.items) {
  const result = await runner.execute({ messages: item.input.messages })
  await sleep(2000)  // 2-second gap between requests
}
```

### API Key Errors (HTTP 401)

```typescript
// Test that your key is valid before running tests
const client = new AgentBenchOpenAI({ apiKey: '...' })
const health = await client.healthCheck()

if (!health.healthy) {
  console.error('OpenAI API key invalid or expired:', health.message)
  process.exit(1)
}
```

### Timeout Errors

```typescript
const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 120000,  // 2 minutes for complex agent tasks
})
```

### Model Not Found (HTTP 404)

Make sure the model ID is correct. Use `healthCheck()` to verify model availability:

```typescript
const health = await client.healthCheck()
console.log('Available models:', health.message)
```

### Insufficient Quota (HTTP 429 with quota message)

Check your usage dashboard at https://platform.openai.com/usage and ensure you have credits.

---

## Common Pitfalls

### Forgetting to set `tracing: true`

Without tracing, assertion methods that inspect the trace (e.g., `tool().toBeCalled()`) will not have data. Set `tracing: true` in the client config.

### Using `temperature` with o-series models

AgentBench automatically strips `temperature` for o-series models. If you see a warning in the logs about `temperature` being removed, this is expected behavior. o-series models hardcode temperature to 1.

### Not handling streaming usage

Streaming responses do not include token usage until the final chunk. AgentBench handles this for you, but if you implement custom streaming logic, be aware that you must consume the entire stream to get usage statistics.

### Confusing `max_tokens` and `max_completion_tokens`

For GPT models, use `maxTokens`. For o-series models, AgentBench automatically maps `maxTokens` to `max_completion_tokens` in the API request, so you can use `maxTokens` uniformly in your config.

### Running too many tests in parallel

Each test run makes real API calls. If you run 50 tests with `concurrency: 10`, you may hit rate limits. Start with `concurrency: 2` and increase gradually. Or use replay mode for deterministic testing without live API calls:

```bash
agentbench test --replay  # Uses snapshots, zero API cost
```

---

## Next Steps

- [Testing Anthropic Claude Agents](./testing-anthropic-agents.md) — If you also use Claude
- [CI/CD Integration](./ci-cd-integration.md) — Run OpenAI tests in your CI pipeline
- [Building Custom Judges](./custom-judges.md) — Create LLM-based evaluators for your specific use case
- [Dataset Management Guide](./dataset-management.md) — Test against structured datasets

---

> [Back to Documentation Center](../INDEX.md)
