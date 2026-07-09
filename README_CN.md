<div align="center">

# AgentBench

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)
[![Tests](https://img.shields.io/badge/Tests-51%2F51-emerald?style=flat-square)](.)
[![TS Errors](https://img.shields.io/badge/TS_Errors-0-emerald?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**AI Agent 回归测试框架**

*回放 · 评估 · 对比 · 断言 · 回归检测 — 全流程自动化*

[English](README.md) | 中文 | [📖 文档中心](docs/INDEX.md) | [更新日志](CHANGELOG.md) | [Release](https://github.com/1304674612/agentbench/releases)

</div>

---

## ⚠️ 重要提示

- **🧪 Alpha 状态**: v0.1.0 处于活跃开发阶段，API 在 v1.0 之前可能会有变动
- **🔑 API 费用**: 运行评估和 LLM Judge 会消耗 API Token，请注意控制成本
- **📊 早期反馈**: 欢迎提交 Issue、PR 和讨论，Alpha 阶段的反馈直接影响路线图

---

## 概述

AgentBench 将软件测试的严谨性——**回放、评估、对比、断言、回归检测**——带到了 AI Agent 的世界。你可以把它理解为 **Playwright + Jest + LangSmith**，专为 AI Agent 开发者打造。

### 为什么要用 AgentBench？

AI Agent 的行为**不可预测**。一个 Prompt 的修改、一次模型升级、一个工具的替换，都可能悄无声息地破坏你的 Agent 的表现。大多数团队靠人工点击来验证——这在规模化场景下完全不可行。

AgentBench 让 Agent 验证变得**可重复、可自动化、可融入 CI**。

| 没有 AgentBench | 使用 AgentBench |
|---|---|
| "我觉得这个 prompt 好一点了" | *准确率从 7.2 提升到 9.1（+26%）* |
| 每次变更手动测试 | `agentbench test` 在 CI 中运行 |
| 不知道 GPT-5 会不会出问题 | 跨模型回放自动捕获退化 |
| "Agent 为什么这么做？" | 完整执行 Trace，每一步都可追溯 |

---

## 快速开始

### 环境要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker**（用于 PostgreSQL + Redis）

### 1. 克隆并安装

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
```

### 2. 启动基础设施

```bash
docker compose up -d
```

### 3. 初始化数据库

```bash
cp .env.example .env
pnpm db:generate
pnpm db:push
```

### 4. 启动开发环境

```bash
pnpm dev
```

| 服务 | 地址 |
|------|------|
| 🖥️ 控制台 | http://localhost:3000/dashboard |
| 📄 首页 | http://localhost:3000 |
| 🔌 API | http://localhost:3000/api/v1 |

---

## 核心功能

- **🔄 Agent Runner** — 执行 Agent 并捕获完整的、分步的执行 Trace
- **⏱️ Execution Tracer** — 透明拦截 OpenAI / Anthropic / MCP 调用，捕获耗时和 Token 数据
- **📊 Evaluation Engine** — 14 种规则评估器 + LLM-as-Judge（8 个质量维度）
- **✅ Assertion DSL** — 链式断言 API：`expect(run).tool("search").toBeCalled().tokens().toBeLessThan(4096).run()`
- **♻️ Replay Engine** — 确定性回放 + 跨模型回放，模型升级时自动检测退化
- **📸 Snapshots** — 保存完整 Agent 状态（Prompt、Model、Tools、Memory）
- **⚖️ Diff Engine** — 并排对比 Output、Token、Cost、Latency、执行路径
- **🧬 A/B Experiments** — 用统计方法（t-test、bootstrap）对比 Prompt / Model / Workflow
- **🛡️ Coverage Analysis** — 测量 Prompt 变量、Workflow 路径、Tool 调用、边缘场景覆盖率
- **📄 Report Generation** — 导出 JSON、Markdown、HTML、JUnit XML
- **💻 CLI** — 8 个命令行工具，彩色输出，结构化的 JSON 格式
- **🖥️ Dashboard** — 暗色优先的 Web 控制台，实时数据展示

---

## 断言语 DSL

用写测试的方式写 Agent 验证——链式 API，读起来像英文：

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                     // Agent 成功完成
  .tool("search_docs").toBeCalled()             // 调用了正确的工具
  .tool("search_docs").toBeCalledWith({         // 传入了正确的参数
    query: "退款政策"
  })
  .tool("hallucinate").not.toBeCalled()         // 没有调用禁用的工具
  .output().toContain("30 天")                   // 输出包含正确信息
  .output().toMatchRegex(/退款.*政策/i)          // 正则验证
  .tokens().toBeLessThan(4096)                  // Token 用量在预算内
  .latency().toBeLessThan(5000)                 // 延迟小于 5 秒
  .score("correctness").toBeGreaterThan(7)       // 准确度达标
  .score("safety").toBeGreaterThan(8)            // 安全性达标
  .run()

if (!result.allPassed) {
  console.error(`${result.failed} 个断言失败!`)
  process.exit(1)
}
```

### 可用匹配器

| 类别 | 匹配器 |
|----------|----------|
| **Tool** | `toBeCalled()`, `toBeCalledWith()`, `toBeCalledTimes()`, `not.toBeCalled()` |
| **Tokens** | `toBeLessThan()`, `toBeGreaterThan()`, `toBeBetween()` |
| **Latency** | `toBeLessThan()`, `toBeGreaterThan()`, `firstToken().toBeLessThan()` |
| **Output** | `toContain()`, `not.toContain()`, `toEqual()`, `toMatchRegex()`, `toMatchSchema()` |
| **Score** | `toBeGreaterThan()`, `toBeLessThan()`, `toBeBetween()` |
| **Status** | `toBeCompleted()`, `toBe("passed")` |
| **Compound** | `all()`, `any()` |

---

## CLI 使用

```bash
# 初始化项目
agentbench init

# 运行 Agent 并捕获 Trace
agentbench run \
  --project <project-id> \
  --name "GPT-4o 基线" \
  --provider openai \
  --model gpt-4o

# 用规则评估 Run
agentbench evaluate <run-id> \
  --tool "search" \
  --contains "答案" \
  --latency-lt 5000 \
  --tokens-lt 4096 \
  --verbose

# 运行测试套件
agentbench test \
  --project <project-id> \
  --suite <suite-id> \
  --grep "客服" \
  --format json

# 对比两个 Run
agentbench compare <run-a> <run-b> --format table

# 用不同模型回放
agentbench replay <run-id> --model claude-sonnet-5

# 生成报告
agentbench report <run-id> --format markdown

# 快照管理
agentbench snapshot create --project <id> --run <id> --name "v1.0 基线"
agentbench snapshot list --project <id>
agentbench snapshot restore <snapshot-id>
```

---

## 评估系统

### 规则评估器（14 种）

`exact_match` · `contains` · `regex_match` · `json_schema` · `tool_called` · `tool_not_called` · `tool_called_with` · `tool_called_times` · `status_code` · `latency_lt` · `tokens_lt` · `tokens_gt` · `cost_lt` · `cost_gt`

### LLM-as-Judge（8 个维度）

| 维度 | 衡量内容 |
|-----------|-----------------|
| `correctness` (准确性) | 与参考答案的事实一致性 |
| `faithfulness` (忠实度) | 基于输入源，不幻觉 |
| `safety` (安全性) | 有害内容、免责声明、PII |
| `relevance` (相关性) | 是否切题，回答实际问题 |
| `completeness` (完整性) | 覆盖所有方面，无遗漏 |
| `reasoning` (推理质量) | 逻辑流畅，结论有效 |
| `conciseness` (简洁性) | 无冗余、无重复 |
| `tool_usage` (工具使用) | 正确的工具、高效的调用 |

### 混合评判

组合规则和 LLM 评判，支持三种策略：`rule_first` · `llm_first` · `parallel`。
多评判者投票：`majority` / `unanimous` / `weighted`。

---

## 技术架构

```
agentbench/
├── apps/
│   ├── web/                 # Next.js 15 Dashboard (App Router)
│   └── cli/                 # CLI 工具 (commander.js)
├── packages/
│   ├── core/                # @agentbench/core — 核心引擎
│   │   ├── runner/          # Agent Runner
│   │   ├── tracer/          # Execution Tracer
│   │   ├── evaluator/       # 规则 + LLM + 混合 Judge
│   │   ├── assertion/       # 链式断言 DSL
│   │   ├── snapshot/        # 快照管理器
│   │   ├── replay/          # 回放引擎
│   │   ├── diff/            # 对比引擎
│   │   ├── experiment/      # A/B 实验
│   │   ├── coverage/        # 覆盖率分析
│   │   ├── reporter/        # 报告生成
│   │   ├── storage/         # 存储抽象层
│   │   ├── types/           # TypeScript 类型定义
│   │   └── utils/           # Token + Cost 工具
│   ├── openai/              # @agentbench/openai
│   ├── anthropic/           # @agentbench/anthropic
│   ├── mcp/                 # @agentbench/mcp
│   ├── adapter/             # @agentbench/adapter
│   └── typescript-config/   # 共享 TS 配置
├── docs/                    # 文档
├── docker-compose.yml
└── turbo.json
```

---

## 技术栈

| 层 | 技术 |
|-------|-----------|
| **前端** | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Radix UI · Framer Motion · Recharts |
| **后端** | Next.js API Routes · Prisma · PostgreSQL 16 · Redis 7 |
| **CLI** | Commander.js · Chalk · Ora |
| **语言** | TypeScript 5.7+ (strict) |
| **Monorepo** | pnpm workspaces · Turborepo |
| **质量** | Vitest · Biome · Husky |
| **部署** | Docker Compose · GitHub Actions |

---

## API 端点（18 个）

```
Projects     GET/POST    /api/v1/projects
Suites       GET/POST    /api/v1/suites
             GET/PATCH/DELETE /api/v1/suites/:id
Cases        GET/POST    /api/v1/suites/:id/cases
             GET/PATCH/DELETE /api/v1/cases/:id
             GET/POST/DELETE  /api/v1/cases/:id/assertions
             GET/POST/DELETE  /api/v1/cases/:id/evaluators
Runs         GET/POST    /api/v1/runs
             GET/PATCH/DELETE /api/v1/runs/:id
             POST        /api/v1/runs/:id/evaluate
             POST        /api/v1/runs/:id/replay
Compare      POST        /api/v1/compare
Snapshots    GET/POST    /api/v1/projects/:id/snapshots
             GET/POST/DELETE  /api/v1/snapshots/:id
Experiments  GET/POST    /api/v1/projects/:id/experiments
             GET/POST/DELETE  /api/v1/experiments/:id
Coverage     GET         /api/v1/projects/:id/coverage
Datasets     GET/POST    /api/v1/projects/:id/datasets
Reports      GET         /api/v1/reports?runId=&format=
Webhooks     POST        /api/v1/webhooks
```

---

## 部署

### Docker Compose（推荐）

```bash
docker compose up -d
```

### Vercel

1. Fork 仓库
2. 导入 Vercel
3. 设置环境变量（`DATABASE_URL`、`REDIS_URL`、`NEXTAUTH_SECRET`）
4. 部署

详见 [部署指南](docs/DEPLOYMENT.md)

---

## 开发进度

| 里程碑 | 内容 | 状态 |
|-----------|------|:--:|
| M0 | Foundation — Monorepo、DB、脚手架 | ✅ |
| M1 | Core Engine — Runner、Tracer、Storage | ✅ |
| M2 | Evaluation & Assertion — 14 规则 + 8 LLM Judge + DSL | ✅ |
| M3 | Regression & Replay — Snapshot、Replay、Diff | ✅ |
| M4 | Experiments & Coverage — T-test、Bootstrap、4D 覆盖率 | ✅ |
| M5 | SDK Ecosystem — OpenAI、Anthropic、MCP、Adapter | ✅ |
| M6 | Platform — Reports、Datasets、CI/CD、Webhooks | ✅ |
| M7 | Polish — Dashboard、首页、加载状态、部署文档 | ✅ |
| v1.0 | Auth、单元测试、生产加固 | 🔜 |

---

## 项目统计

| 指标 | 数值 |
|--------|-------|
| TypeScript 文件 | 100+ |
| 代码行数 | 16,000+ |
| 包数量 | 8 |
| API 端点 | 18 |
| CLI 命令 | 8 |
| 单元测试 | 51/51 (100%) |
| TS 错误 | 0 (strict mode) |

---

## 贡献

欢迎贡献！查看 [任务列表](docs/TASKS.md) 找到可以做的事情。

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
pnpm dev              # 开始开发
pnpm typecheck        # 验证变更
pnpm test             # 运行测试（在 packages/core 目录下）
```

---

## License

[Apache 2.0](LICENSE) © AgentBench

---

<div align="center">
  <sub>为 AI Agent 社区用心构建 ❤️ 如果 AgentBench 帮你避免了一次上线事故，点个 ⭐ 吧</sub>
</div>
