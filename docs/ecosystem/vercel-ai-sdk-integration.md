# Vercel AI SDK 集成指南

> 为 Vercel AI SDK 项目添加 AgentBench 测试，零侵入、可回放、可在 CI 中自动执行。

---

## 为什么需要 AgentBench？

Vercel AI SDK 让构建 AI 应用变得简单，但缺乏回归测试能力。你的 `generateText` 或 `useChat` 流程在改了一行 Prompt 之后，是否悄悄引入了幻觉？AgentBench 填补了这个空白 -- 用断言 DSL 覆盖 Agent 的输出质量、工具调用、延迟和 Token 用量。

---

## 安装

```bash
pnpm add -D agentbench @agentbench/core
pnpm add @ai-sdk/openai   # 你已使用的 AI SDK 提供商
```

---

## 最小示例（12 行）

假设你有一个 `src/agent.ts`:

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function refundAgent(question: string) {
  return await generateText({
    model: openai('gpt-4o-mini'),
    system: '你是一个客服，回答退款相关问题。',
    prompt: question,
  })
}
```

对应的 AgentBench 测试 `tests/refund-agent.test.ts`:

```typescript
import { test, expect } from 'agentbench'
import { refundAgent } from '../src/agent'

test('退款政策回复正确', async () => {
  const { text, usage } = await refundAgent('如何申请退款？')

  await expect({ output: text, metrics: { totalTokens: usage.totalTokens } })
    .output().toContain('退款')
    .output().not.toContain('幻觉')
    .tokens().toBeLessThan(500)
    .run()
})
```

运行:

```bash
agentbench test
```

---

## 包装 useChat / generateText

### 方案一：包装 `generateText`（后端 / 服务端渲染）

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { wrapGenerateText } from '@agentbench/core/ai-sdk'

const tracedGenerate = wrapGenerateText(generateText, { trace: true })

// 之后所有调用都会自动记录 Trace，可直接传入断言 DSL
const result = await tracedGenerate({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: '你好' }],
})

// 直接用 snapshot 做回归检测
import { expect } from 'agentbench'
await expect(result.agentBenchOutput).toMatchSnapshot()
```

### 方案二：包装 `streamText`（流式输出）

```typescript
import { streamText } from 'ai'
import { wrapStreamText } from '@agentbench/core/ai-sdk'

const tracedStream = wrapStreamText(streamText)

const stream = await tracedStream({
  model: openai('gpt-4o'),
  prompt: '讲一个笑话',
})

// 消费流，同时收集完整输出和指标
let fullText = ''
for await (const chunk of stream.textStream) {
  fullText += chunk
}

// 对流式结果做断言
await expect({ output: fullText, metrics: stream.agentBenchMetrics })
  .output().toContain('笑')
  .latency().toBeLessThan(8000)
  .run()
```

### 方案三：包装 `useChat`（React Hook，适用于前端）

AgentBench 支持在 Node.js 测试环境中注入 `useChat` 的响应模拟:

```typescript
import { createChatMock } from '@agentbench/core/ai-sdk'
import { expect } from 'agentbench'

// 创建模拟的聊天上下文，替换真实 API 调用
const chat = createChatMock({
  model: 'openai/gpt-4o-mini',
  messages: [{ role: 'user', content: '退款需要几天？' }],
})

const { messages, toolInvocations } = await chat.run()

await expect({
  output: messages[messages.length - 1].content,
  toolCalls: toolInvocations ?? [],
})
  .output().toContain('天')
  .tool('check_refund_status').toBeCalled()
  .run()
```

---

## GitHub Actions 工作流（可直接复制）

```yaml
name: AgentBench — Vercel AI SDK

on:
  pull_request:
    paths:
      - 'src/**'
      - 'prompts/**'
      - 'agentbench.config.*'
      - 'tests/**'
  push:
    branches: [main]

jobs:
  agent-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm agentbench test --ci --json --junit

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentbench-report
          path: report/
```

---

## 关键技巧

| 场景 | 做法 |
|------|------|
| **Prompt 重构** | 改 Prompt 前先 `agentbench test --replay` 建立基线快照 |
| **模型切换** | 用 `agentbench replay --model <新模型> --mode cross_model` 对比新旧模型 |
| **成本控制** | 在 config 中设 `assertions.maxTokens` 和 `assertions.maxLatency`，CI 自动拦截超标 |
| **非确定性处理** | 对 LLM 输出用 `score('correctness').toBeGreaterThan(7)` 替代精确字符串匹配 |

---

## 下一步

- [SDK 使用指南](../SDK_GUIDE.md) — 深入了解 `@agentbench/openai`、`@agentbench/anthropic` 等 SDK 包装器
- [快速开始](../GETTING_STARTED.md) — 5 分钟搭建第一个测试
- [CLI 命令参考](../CLI_REFERENCE.md) — 所有 CLI 命令和参数
