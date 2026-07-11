# Claude Code 自定义 Agent 测试指南

> 用 AgentBench 为 Claude Code 自定义 Agent 建立回归测试体系——将对话历史导出为测试 fixture，回放验证，在修改 CLAUDE.md 后自动捕获回归。

---

## 为什么 Claude Code 自定义 Agent 需要测试

Claude Code 的自定义 Agent 通过 CLAUDE.md 中的指令、工具定义和项目约定来控制行为。每次编辑 CLAUDE.md ——哪怕只改了一个词——都可能改变 Agent 在特定场景下的决策路径、工具选择或回答风格。AgentBench 让你将这些行为固化为可重复执行的测试。

---

## 核心工作流

```
对话记录  →  导出 fixture  →  编写断言  →  CI 自动验证
```

### 步骤 1：导出对话历史为测试 Fixture

在 Claude Code 中完成一轮满意的交互后，用以下命令导出对话:

```bash
agentbench fixture export \
  --source claude-code \
  --session-id <session-id> \
  --output tests/fixtures/customer-support.json
```

导出的 fixture 文件包含完整的消息序列、工具调用链和最终输出:

```json
{
  "id": "fixture_customer_support_001",
  "source": "claude-code",
  "messages": [
    { "role": "user", "content": "用户要求退款，已超过 30 天" },
    { "role": "assistant", "content": "我需要查看退款政策...", "tool_calls": [
      { "name": "search_knowledge_base", "arguments": { "query": "退款政策 30天" } }
    ]},
    { "role": "tool", "content": "{\"policy\": \"30天内无条件退款，超过30天需人工审核\"}" },
    { "role": "assistant", "content": "根据政策，超过30天的退款需要转接人工..." }
  ],
  "metadata": {
    "model": "claude-sonnet-4-5",
    "timestamp": "2026-07-11T10:30:00Z",
    "tools_used": ["search_knowledge_base"],
    "total_tokens": 1847
  }
}
```

### 步骤 2：编写断言测试

```typescript
import { test, expect, loadFixture } from 'agentbench'
import { runClaudeCodeWithFixture } from '@agentbench/claude-code'

test('超过 30 天退款应转接人工', async () => {
  // 加载之前导出的 fixture，在当前 CLAUDE.md 下重放
  const result = await runClaudeCodeWithFixture({
    fixture: loadFixture('tests/fixtures/customer-support.json'),
    projectDir: '.',
    timeout: 30000,
  })

  await expect(result)
    .output().toContain('转接人工')
    .output().not.toContain('幻觉')
    .tool('search_knowledge_base').toBeCalled()
    .tool('approve_refund').not.toBeCalled()
    .tokens().toBeLessThan(3000)
    .run()
})
```

### 步骤 3：用 Snapshot 锁定完整行为

```typescript
test('退款处理流程一致性', async () => {
  const result = await runClaudeCodeWithFixture({
    fixture: loadFixture('tests/fixtures/customer-support.json'),
    projectDir: '.',
  })

  // Snapshot 会对比输出、工具调用顺序和工具参数
  await expect(result).toMatchSnapshot()
})
```

首次运行会自动生成 snapshot。之后的每次运行，任何偏差都会导致测试失败。

---

## 修改 CLAUDE.md 后的回归检测工作流

```bash
# 1. 编辑 CLAUDE.md
vim CLAUDE.md

# 2. 回放所有 fixture，零 LLM 费用
agentbench test --replay

# 3. 如果测试失败，查看差异
agentbench diff --baseline main --current HEAD

# 4. 如果是预期内的变化，更新 snapshot
agentbench test --replay --update-snapshots

# 5. 如果是非预期的行为退化，回退修改并修复
git checkout CLAUDE.md
```

---

## CI 集成（GitHub Actions）

```yaml
name: Claude Code Agent Tests

on:
  pull_request:
    paths:
      - 'CLAUDE.md'
      - '.claude/**'
      - 'tools/**'
      - 'agentbench.config.*'
      - 'tests/fixtures/**'

jobs:
  claude-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx agentbench test --replay
      - run: npx agentbench test --replay --update-snapshots
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

---

## 批量导出已有会话

如果你已经积累了大量 Claude Code 会话，可以批量导出为 fixture:

```bash
# 导出最近 20 个 Claude Code 会话
agentbench fixture export \
  --source claude-code \
  --recent 20 \
  --output tests/fixtures/

# 按关键词过滤会话
agentbench fixture export \
  --source claude-code \
  --grep "退款|refund" \
  --output tests/fixtures/refund/
```

---

## 关键原则

| 原则 | 说明 |
|------|------|
| **Fixture 是金丝雀** | 每次满意的交互都应该导出 fixture。这些 fixture 就是你的行为契约 |
| **Replay 优先** | 日常开发用 `--replay` 模式，零费用、秒级反馈 |
| **Snapshot 锁定行为** | 不要手动写大量断言。让 snapshot 捕获完整行为，你只需审查 diff |
| **CI 自动拦截** | CLAUDE.md 的任何改动都应该触发 fixture 回放 |

---

## 下一步

- [Snapshots 工作原理](../core-concepts/snapshots.md) — 深入理解快照机制
- [CI/CD 集成](../guides/ci-cd-integration.md) — 更多 CI 平台集成方案
- [CLI 命令参考](../CLI_REFERENCE.md) — `fixture`、`diff`、`replay` 命令详解
