# @agentbench/langgraph

AgentBench adapter for [LangGraph](https://langchain-ai.github.io/langgraph/) — trace and evaluate LangGraph agents with zero configuration.

## Features

- **Duck-typed integration** — works with any compiled LangGraph graph without importing `@langchain/langgraph` as a hard dependency
- **Automatic tracing** — every LLM call and tool invocation is captured as `TraceStep` objects compatible with `@agentbench/core`
- **Streaming support** — `adapter.stream()` yields text chunks and tool calls as they happen
- **Timeout & step limits** — built-in safeguards against runaway agents
- **Multi-format support** — handles LangChain message objects, `[role, content]` tuples, and plain strings

## Installation

```bash
pnpm add @agentbench/langgraph @agentbench/core
```

You also need a LangGraph-compatible graph. Install LangGraph separately:

```bash
pnpm add @langchain/langgraph @langchain/core
```

## Quick Start

```typescript
import { createLangGraphAdapter } from '@agentbench/langgraph'
import { Runner } from '@agentbench/core'

// Your compiled LangGraph graph (from @langchain/langgraph)
import { graph } from './my-graph'

// 1. Create the adapter
const adapter = createLangGraphAdapter({
  name: 'customer-support-agent',
  graph,
  maxSteps: 25,
  timeout: 30000,
})

// 2. Run with AgentBench Runner
const runner = new Runner({
  agent: {
    provider: 'langgraph',
    model: 'customer-support-agent',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are a helpful customer support agent.',
  },
})

const result = await runner.run({
  messages: [{ role: 'user', content: 'I need help with my order #12345' }],
})

console.log('Output:', result.output)
console.log('Trace steps:', result.trace?.steps)
console.log('Cost:', result.cost)
```

## Standalone Usage

You can also use the adapter directly without the Runner:

```typescript
import { createLangGraphAdapter } from '@agentbench/langgraph'

const adapter = createLangGraphAdapter({ name: 'my-agent', graph })

const result = await adapter.run({
  messages: [{ role: 'user', content: 'What is 2 + 2?' }],
})

console.log(result.output)
// => "2 + 2 equals 4"

console.log(result.metrics)
// => { totalTokens: 0, totalCost: 0, totalLatency: 1234, stepCount: 3, llmCallCount: 2, toolCallCount: 1 }

// Inspect trace steps for debugging
for (const step of result.traceSteps) {
  console.log(`[${step.type}] ${step.llmModel ?? step.toolName ?? ''}`)
}
```

## Streaming

```typescript
const adapter = createLangGraphAdapter({ name: 'streaming-agent', graph })

for await (const event of adapter.stream({
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  switch (event.type) {
    case 'text':
      process.stdout.write(event.content ?? '')
      break
    case 'tool_call':
      console.log('\n[Tool]', event.toolCall?.name, event.toolCall?.arguments)
      break
    case 'error':
      console.error('\n[Error]', event.content)
      break
    case 'done':
      console.log('\n--- Done ---')
      break
  }
}
```

## Integrating with Running a Custom Graph

Any object with an `.invoke()` method works:

```typescript
import { createLangGraphAdapter } from '@agentbench/langgraph'

// Minimal graph-like object
const myGraph = {
  async invoke(state: Record<string, unknown>) {
    const userMessage = (state.messages as Array<[string, string]>)
      .filter(([role]) => role === 'user')
      .map(([, content]) => content)
      .join('\n')

    return {
      messages: [
        ...(state.messages as unknown[]),
        ['ai', `You said: ${userMessage}. Here is my response.`],
      ],
    }
  },
}

const adapter = createLangGraphAdapter({ name: 'echo-bot', graph: myGraph })
const result = await adapter.run({
  messages: [{ role: 'user', content: 'Hello world!' }],
})

console.log(result.output)
// => "You said: Hello world!. Here is my response."
```

## API Reference

### `createLangGraphAdapter(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | _required_ | Human-readable name for the agent |
| `graph` | `unknown` | _required_ | LangGraph compiled graph (duck-typed) |
| `apiKey` | `string` | — | Optional API key |
| `maxSteps` | `number` | `50` | Maximum recursion steps |
| `timeout` | `number` | `120000` | Timeout in milliseconds |

### `LangGraphAdapter.run(input)`

Returns `Promise<LangGraphRunOutput>`:

| Field | Type | Description |
|-------|------|-------------|
| `output` | `string` | Final text output |
| `toolCalls` | `ToolCallRecord[]` | All tool calls observed |
| `traceSteps` | `TraceStep[]` | Fine-grained trace steps |
| `metrics` | `object` | Aggregate metrics (tokens, cost, latency) |

### `LangGraphAdapter.stream(input)`

Yields events of type `{ type: 'text' \| 'tool_call' \| 'error' \| 'done', content?, toolCall? }`.

## License

Apache-2.0
