# LangChain / CrewAI 集成指南

> 现有 LangChain/CrewAI Agent 无需重构即可接入 AgentBench——用 `@agentbench/adapter` 包装现有代码，只需 3-5 行改动，即可获得回归测试能力。

---

## 核心思路

你的 LangChain Chain 或 CrewAI Crew 已经能跑了。AgentBench 不要求改动你的 Agent 逻辑。只需要用一个适配器把 Agent 的执行包裹起来，让 AgentBench 能在统一的接口下调用它、收集 Trace、施加断言。

```
你的 Agent 代码  +  @agentbench/adapter  →  AgentBench Runner → 断言 DSL → CI
```

---

## 安装

```bash
pnpm add -D agentbench @agentbench/adapter @agentbench/langgraph
```

---

## LangChain 示例

假设你有一个已经工作的 LangChain Agent:

```typescript
// src/agent.ts —— 这是你现有的代码，一行不改
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { searchTool, calculatorTool } from './tools'

const llm = new ChatOpenAI({ model: 'gpt-4o-mini' })
const prompt = ChatPromptTemplate.fromMessages([/* ... */])

export const agent = createToolCallingAgent({ llm, tools: [searchTool, calculatorTool], prompt })
export const executor = new AgentExecutor({ agent, tools: [searchTool, calculatorTool] })
```

只需添加一个测试文件 `tests/langchain-agent.test.ts`:

```typescript
import { test, expect } from 'agentbench'
import { createAdapter } from '@agentbench/adapter'
import { executor } from '../src/agent'

const adapted = createAdapter({
  name: 'langchain-assistant',
  provider: 'openai',
  run: async (input) => {
    const result = await executor.invoke({ input: input.messages[0]?.content })
    return {
      output: result.output,
      toolCalls: (result.intermediateSteps ?? []).map((s: any) => ({
        name: s.action?.tool ?? 'unknown',
        arguments: s.action?.toolInput ?? {},
        result: s.observation,
      })),
    }
  },
})

test('搜索并回答', async () => {
  const result = await adapted.run({
    messages: [{ role: 'user', content: '今天北京的天气如何？' }],
    systemPrompt: '你是一个有帮助的助手。',
  })

  await expect(result)
    .output().toContain('天气')
    .tool('search').toBeCalled()
    .tokens().toBeLessThan(2000)
    .run()
})

test('回归检测（Snapshot）', async () => {
  const result = await adapted.run({
    messages: [{ role: 'user', content: '帮我算一下 15 * 37' }],
    systemPrompt: '你是一个有帮助的助手。',
  })

  await expect(result).toMatchSnapshot()
})
```

你的 Agent 源码一行都没改。适配器只是在外部包裹了一层。

---

## CrewAI 示例

CrewAI 是 Python 原生框架。AgentBench 通过 HTTP 桥接方式支持，无需改动 Crew 本身的 Python 代码。

### 第一步：暴露一个轻量 HTTP 端点

```python
# bridge.py —— 在现有 CrewAI 项目根目录添加
from flask import Flask, request, jsonify
from my_crew import SupportCrew  # 你现有的 Crew

app = Flask(__name__)
crew = SupportCrew()

@app.post("/run")
def run():
    body = request.get_json()
    result = crew.kickoff(inputs={"query": body["messages"][0]["content"]})
    return jsonify({"output": result.raw, "toolCalls": []})

app.run(port=8000)
```

### 第二步：用 `createAdapter` 包装

```typescript
// tests/crewai-agent.test.ts
import { test, expect } from 'agentbench'
import { createAdapter } from '@agentbench/adapter'

const adapted = createAdapter({
  name: 'crewai-support',
  provider: 'custom',
  run: async (input) => {
    const res = await fetch('http://localhost:8000/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return res.json()
  },
})

test('退款处理流程', async () => {
  const result = await adapted.run({
    messages: [{ role: 'user', content: '我的订单已超过30天，还能退款吗？' }],
    systemPrompt: '你是客服 Crew 的协调者。',
  })

  await expect(result)
    .output().toContain('退款')
    .output().not.toContain('幻觉')
    .latency().toBeLessThan(15000)
    .run()
})
```

### 如果团队愿意在 Python 侧多写一点

使用 `@agentbench` Python SDK 可直接在 Python 中完成测试，无需 HTTP 桥接:

```python
# tests/test_support_crew.py
from agentbench import test, expect
from my_crew import SupportCrew

crew = SupportCrew()

@test
def test_refund_policy():
    result = crew.kickoff(inputs={"query": "如何退款？"})
    returned = expect(result.raw)

    returned.output.to_contain("30天")
    returned.output.not_to_contain("幻觉")
    returned.run()

    assert returned.all_passed
```

```bash
pip install agentbench crewai
python -m agentbench test
```

---

## LangGraph Agent

如果你的 Agent 基于 LangGraph（编译后的 StateGraph），可以直接用专用的 LangGraph 适配器:

```typescript
import { createLangGraphAdapter } from '@agentbench/adapter'
import { expect, test } from 'agentbench'
import { graph } from '../src/graph'

const adapted = createLangGraphAdapter({
  name: 'my-graph-agent',
  graph,
})

test('工作流完整走通', async () => {
  const result = await adapted.run({
    messages: [{ role: 'user', content: '帮我预订明天下午的会议室' }],
    systemPrompt: '你是办公室管理助手。',
  })

  await expect(result)
    .tool('check_availability').toBeCalled()
    .tool('book_room').toBeCalled()
    .run()
})
```

---

## 代码改动量对比

| 方案 | 源码改动 | 新增文件 | 适合场景 |
|------|:---:|:---:|------|
| `createAdapter` + HTTP | 0 行（Python 侧加 bridge 脚本） | 1 个测试文件 | CrewAI 等 Python 框架 |
| `createAdapter` 直接调用 | 0 行 | 1 个测试文件 | LangChain Chain / Agent |
| `createLangGraphAdapter` | 0 行 | 1 个测试文件 | LangGraph StateGraph |
| `@agentbench` Python SDK | 0 行 | 1 个测试文件 | 愿意使用 Python SDK 的团队 |

---

## 下一步

- [SDK 使用指南](../SDK_GUIDE.md) — `@agentbench/adapter` 完整 API
- [LangGraph Agent 示例](../examples/index.md#langgraph-agent) — 完整的参考实现
- [CrewAI Agent 示例](../examples/index.md#crewai-agent) — 多 Agent 协作测试
