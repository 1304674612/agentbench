# SDK 使用指南

AgentBench 提供 4 个 SDK 包，覆盖主流 LLM 提供商。

## 安装

```bash
pnpm add @agentbench/core

# 按需安装 SDK
pnpm add @agentbench/openai
pnpm add @agentbench/anthropic
pnpm add @agentbench/mcp
pnpm add @agentbench/adapter
```

---

## @agentbench/openai

OpenAI SDK 包装器，自动截获 API 调用并生成 Trace。

```typescript
import { AgentBenchOpenAI, createOpenAIClient, runWithOpenAI } from '@agentbench/openai'

// 方式 1：直接使用包装器
const client = new AgentBenchOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  tracing: true,
})

const result = await client.createChatCompletion({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个客服' },
    { role: 'user', content: '如何退款？' },
  ],
  temperature: 0.7,
  max_tokens: 4096,
})

console.log(result.content)           // Agent 的回复
console.log(result.usage.total_tokens) // Token 用量
console.log(result.cost)               // 费用（USD）
console.log(result.trace)              // TraceStep
```

### 流式输出

```typescript
const stream = client.createStreamingChatCompletion({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '讲个故事' }],
})

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

### 与 Runner 集成

```typescript
const client = createOpenAIClient({ apiKey: '...' })

const { output, trace, cost } = await runWithOpenAI({
  client,
  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: '你是一个客服 Agent',
  },
  messages: [{ role: 'user', content: '如何退款？' }],
  tools: [{
    type: 'function',
    function: {
      name: 'search_docs',
      description: '搜索文档',
      parameters: { query: { type: 'string' } },
    },
  }],
  maxSteps: 10,
})
```

---

## @agentbench/anthropic

Anthropic Claude SDK 包装器。

```typescript
import { AgentBenchAnthropic, createAnthropicClient } from '@agentbench/anthropic'

const client = new AgentBenchAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const result = await client.createMessage({
  model: 'claude-sonnet-4-20250514',
  system: '你是一个客服 Agent，帮助用户解决退款问题。',
  messages: [{ role: 'user', content: '如何退款？' }],
  max_tokens: 4096,
  temperature: 0.7,
  tools: [{
    name: 'search_docs',
    description: '搜索文档',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
    },
  }],
})

console.log(result.content)   // Claude 的回复
console.log(result.cost)      // 费用
```

### 流式输出

```typescript
const stream = client.createStreamingMessage({
  model: 'claude-sonnet-4-20250514',
  messages: [{ role: 'user', content: '讲个故事' }],
  max_tokens: 2048,
})

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

---

## @agentbench/mcp

MCP（Model Context Protocol）客户端包装器。

```typescript
import { AgentBenchMCP, createMCPClient } from '@agentbench/mcp'

const client = new AgentBenchMCP({
  serverUrl: 'http://localhost:8080/mcp',
  authToken: 'your-token',
})

// 连接并初始化
const { tools } = await client.connect()
console.log('可用工具:', tools.map(t => t.name))

// 调用工具
const result = await client.callTool({
  name: 'search_docs',
  arguments: { query: '退款政策' },
})
console.log(result.result)

// 读取资源
const resource = await client.readResource('docs://refund-policy')
console.log(resource.contents)

// 断开连接
client.disconnect()
```

---

## @agentbench/adapter

通用适配器，用于包装自定义 Agent 或其他框架。

```typescript
import { createAdapter, GenericAgentAdapter } from '@agentbench/adapter'

const adapter = createAdapter({
  name: 'my-custom-agent',
  provider: 'custom',
  run: async (input) => {
    // 你的自定义 Agent 逻辑
    const response = await myAgent.run(input.messages)

    return {
      output: response.text,
      toolCalls: response.toolCalls.map(tc => ({
        name: tc.name,
        arguments: tc.args,
        result: tc.result,
      })),
    }
  },
  hooks: {
    onStart: (config) => console.log('Agent started:', config.model),
    onStep: (step) => console.log('Step:', step.type),
    onEnd: (result) => console.log('Done:', result.status),
    onError: (err) => console.error('Error:', err),
  },
  tools: [
    { type: 'function', function: { name: 'search', description: 'Search', parameters: {} } },
  ],
})

// 使用适配器运行
const output = await adapter.run({
  messages: [{ role: 'user', content: 'Hello' }],
  systemPrompt: 'You are helpful.',
})

// 转换为 Runner 可用的 AgentConfig
const config = adapter.toAgentConfig()
```

### 框架适配器（Placeholder）

LangGraph、CrewAI、LlamaIndex 的适配器接口已预留，等待对应 SDK 生态成熟后实现。

```typescript
import { createLangGraphAdapter, createCrewAIAdapter, createLlamaIndexAdapter } from '@agentbench/adapter'

// LangGraph（需要 @langchain/langgraph 依赖）
// const adapter = createLangGraphAdapter({ name: 'my-graph', graph: compiledGraph })

// CrewAI（需要 crewai Python SDK）
// const adapter = createCrewAIAdapter({ name: 'my-crew', crew: crewConfig })

// LlamaIndex（需要 llama-index Python SDK）
// const adapter = createLlamaIndexAdapter({ name: 'my-agent', agent: llamaAgent })
```

### 适配器注册表

```typescript
import { registerAdapter, getAdapter, listAdapters } from '@agentbench/adapter'

registerAdapter(adapter)

const found = getAdapter('my-custom-agent')
console.log(listAdapters())
```

---

## 使用断言 DSL

所有 SDK 的输出都可以直接传入断言 DSL：

```typescript
import { expect, buildContextFromRun } from '@agentbench/core'

// 从 SDK 输出手动构建上下文
const context = {
  output: result.content,
  toolCalls: result.tool_calls?.map(tc => ({
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  })) ?? [],
  metrics: {
    totalTokens: result.usage.total_tokens,
    totalCost: result.cost,
    totalLatency: result.duration,
    stepCount: 1,
    llmCallCount: 1,
    toolCallCount: result.tool_calls?.length ?? 0,
  },
  scores: [],
  status: 'passed',
}

const assertionResult = expect(context)
  .tool('search_docs').toBeCalled()
  .tokens().toBeLessThan(4096)
  .output().toContain('退款')
  .run()

console.log(assertionResult.allPassed) // true/false
```

---

→ [返回文档中心](INDEX.md)
