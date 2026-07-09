# CLI 命令参考

AgentBench CLI 提供 8 个命令，覆盖 Agent 测试全流程。

## 安装

```bash
pnpm install
pnpm --filter agentbench exec agentbench --help
```

或全局安装后直接使用 `agentbench` 命令。

## 全局选项

| 选项 | 说明 |
|------|------|
| `-V, --version` | 显示版本号 |
| `-h, --help` | 显示帮助信息 |

环境变量：
- `AGENTBENCH_API_URL` — API 地址（默认 `http://localhost:3000/api/v1`）

---

## `agentbench init`

初始化项目，生成 `agentbench.config.ts` 配置文件。

```bash
agentbench init
agentbench init --force   # 覆盖已有配置
```

生成的配置文件：
```typescript
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  name: 'my-agent-project',
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  },
  tests: {
    timeout: 30000,
    maxSteps: 10,
    retries: 1,
  },
})
```

---

## `agentbench run`

创建并执行一个 Agent Run。

```bash
agentbench run \
  --project <project-id> \
  --name "GPT-4o Baseline" \
  --provider openai \
  --model gpt-4o \
  --temperature 0.7 \
  --max-tokens 4096 \
  --verbose
```

| 选项 | 必填 | 说明 |
|------|:--:|------|
| `-p, --project <id>` | ✅ | 项目 ID |
| `-n, --name <name>` | ✅ | Run 名称 |
| `-m, --model <model>` | | 模型名称（默认 `gpt-4o`） |
| `--provider <p>` | | LLM 提供商（默认 `openai`） |
| `--temperature <t>` | | 温度参数（默认 `0.7`） |
| `--max-tokens <n>` | | 最大 Token（默认 `4096`） |
| `-v, --verbose` | | 详细输出 |

---

## `agentbench test`

运行测试套件。

```bash
agentbench test \
  --project <project-id> \
  --suite <suite-id> \
  --grep "customer-support" \
  --verbose \
  --format table
```

| 选项 | 必填 | 说明 |
|------|:--:|------|
| `-p, --project <id>` | ✅ | 项目 ID |
| `-s, --suite <id>` | | 按套件过滤 |
| `-g, --grep <pattern>` | | 按名称正则过滤 |
| `--verbose` | | 显示每个用例的详细结果 |
| `--format <fmt>` | | 输出格式：`table`、`json`、`junit` |

输出示例：
```
⚡ Running tests...
  Suites: 3
  Test cases: 12

  ✓ greeting: 5/5 passed (2340ms)
  ✓ refund_check: 4/4 passed (1890ms)
  ✗ escalation: 2/3 failed (3200ms)

────────────────────────────────────────────
Summary:
  ✓ 10 passed
  ✗ 1 failed
  ⚠ 0 errors
```

---

## `agentbench evaluate`

用规则评估一个 Run。

```bash
agentbench evaluate <run-id> \
  --contains "退款" \
  --tool "search_docs" \
  --tool-not "hallucinate" \
  --latency-lt 5000 \
  --tokens-lt 4096 \
  --cost-lt 0.01 \
  --expected "用户可以在30天内退款" \
  --verbose
```

| 选项 | 说明 |
|------|------|
| `--contains <text>` | 输出包含指定文本 |
| `--tool <name>` | 指定工具被调用过 |
| `--tool-not <name>` | 指定工具未被调用 |
| `--latency-lt <ms>` | 延迟低于阈值 |
| `--tokens-lt <n>` | Token 用量低于阈值 |
| `--cost-lt <dollars>` | 费用低于阈值 |
| `--expected <text>` | 期望输出（精确匹配） |
| `--json-schema <path>` | JSON Schema 文件路径 |
| `-v, --verbose` | 显示每条规则的详细结果 |

---

## `agentbench replay`

回放一个 Run。

```bash
agentbench replay <run-id> \
  --model claude-sonnet-5 \
  --provider anthropic \
  --mode cross_model

agentbench replay <run-id> \
  --mode batch \
  --batch-count 10 \
  --seed 42
```

| 选项 | 说明 |
|------|------|
| `-m, --model <model>` | 回放时使用的模型 |
| `--provider <p>` | 回放时使用的提供商 |
| `--temperature <t>` | 覆盖温度参数 |
| `--mode <mode>` | 回放模式：`deterministic`、`cross_model`、`batch` |
| `--batch-count <n>` | 批量回放次数（默认 5） |
| `--seed <n>` | 确定性回放的种子 |
| `--no-parallel` | 禁用并行（批量模式） |

---

## `agentbench compare`

对比两个 Run。

```bash
agentbench compare <run-a-id> <run-b-id>
agentbench compare <run-a-id> <run-b-id> --format json
```

| 选项 | 说明 |
|------|------|
| `--format <fmt>` | 输出格式：`table`、`json` |

输出：
```
Comparison:
  Status:    passed vs passed
  Duration:  2340ms vs 1890ms
  Tokens:    2847 vs 2103
  Cost:      $0.0089 vs $0.0065
  Steps:     3 vs 2
```

---

## `agentbench snapshot`

快照管理。

```bash
# 创建快照
agentbench snapshot create \
  --project <project-id> \
  --run <run-id> \
  --name "v1.0 基线"

# 列出快照
agentbench snapshot list --project <project-id>

# 恢复快照
agentbench snapshot restore <snapshot-id>
agentbench snapshot restore <snapshot-id> --model gpt-5
```

---

## `agentbench report`

生成报告。

```bash
agentbench report <run-id>
agentbench report <run-id> --format json
agentbench report --format markdown   # 批量报告
```

| 选项 | 说明 |
|------|------|
| `--format <fmt>` | 报告格式：`json`、`markdown` |

---

→ [返回文档中心](INDEX.md)
