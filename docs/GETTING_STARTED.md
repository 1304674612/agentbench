# 快速入门指南

本指南将带你从零开始，在 5 分钟内安装并运行 AgentBench。

## 1. 理解核心概念

在开始之前，了解几个关键概念：

| 概念 | 说明 |
|------|------|
| **Project** | 项目，对应你要测试的一个 Agent |
| **Test Suite** | 测试套件，一组相关的测试用例 |
| **Test Case** | 测试用例，定义了一个 Agent 的配置、输入、断言和评估器 |
| **Run** | 一次执行，Agent 按 Test Case 的配置运行一次 |
| **Trace** | 执行 Trace，记录了 Run 的每一步（LLM 调用、工具调用、响应） |
| **Assertion** | 断言，对 Run 结果的条件判断（如 `tool_called`、`tokens_lt`） |
| **Evaluator** | 评估器，对 Run 结果打分（规则评估器 或 LLM Judge） |
| **Snapshot** | 快照，保存 Agent 状态的完整副本，用于回放 |
| **Experiment** | A/B 实验，对比两个 Variant（不同 Prompt/Model）的表现 |

## 2. 环境要求

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `npm install -g pnpm`
- **Docker** — 用于 PostgreSQL + Redis

## 3. 安装

```bash
# 克隆仓库
git clone git@github.com:1304674612/agentbench.git
cd agentbench

# 安装依赖
pnpm install
```

## 4. 启动基础设施

```bash
# 启动 PostgreSQL + Redis
docker compose up -d
```

验证服务状态：
```bash
docker compose ps
# NAME                  STATUS
# agentbench-postgres   Up (healthy)
# agentbench-redis      Up (healthy)
```

## 5. 初始化数据库

```bash
# 复制环境配置
cp .env.example .env

# 生成 Prisma Client 并推送 Schema 到数据库
pnpm db:generate
pnpm db:push
```

## 6. 启动开发环境

```bash
pnpm dev
```

现在你可以访问：
- 🏠 **首页**: http://localhost:3000
- 📊 **控制台**: http://localhost:3000/dashboard
- 🔌 **API**: http://localhost:3000/api/v1/projects

## 7. 创建第一个 Project

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"我的第一个 Agent","slug":"my-first-agent"}'
```

记录返回的 `id`（后续步骤需要）。

## 8. 创建测试套件和用例

```bash
# 创建 Test Suite
curl -X POST http://localhost:3000/api/v1/suites \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","name":"客服测试套件"}'

# 创建 Test Case（含断言和评估器）
curl -X POST "http://localhost:3000/api/v1/suites/<suite-id>/cases" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"退款查询测试",
    "agentConfig":{
      "provider":"openai","model":"gpt-4o",
      "systemPrompt":"你是一个客服 Agent，帮助用户解决退款问题。",
      "temperature":0.7,"maxTokens":4096
    },
    "input":{"messages":[{"role":"user","content":"如何退款？"}]},
    "tags":["退款","客服"],
    "assertions":[
      {"type":"tool_called","params":{"tool":"search_docs"}},
      {"type":"contains","params":{"substring":"30天"}},
      {"type":"tokens_lt","params":{"threshold":4096}}
    ],
    "evaluators":[
      {"type":"RULE_BASED","config":{}},
      {"type":"LLM_JUDGE","config":{"provider":"openai","model":"gpt-4o","dimensions":["correctness","completeness"]}}
    ]
  }'
```

## 9. 运行测试

### 通过 API

```bash
# 创建 Run
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","testCaseId":"<case-id>","name":"GPT-4o 基线","config":{}}'

# 评估 Run
curl -X POST "http://localhost:3000/api/v1/runs/<run-id>/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "rules":[
      {"type":"contains","params":{"substring":"退款"}},
      {"type":"tokens_lt","params":{"threshold":4096}}
    ],
    "force":true
  }'

# 查看结果
curl "http://localhost:3000/api/v1/runs/<run-id>" | python3 -m json.tool
```

### 通过 CLI

```bash
agentbench run --project <project-id> --name "GPT-4o 基线"
agentbench evaluate <run-id> --contains "退款" --tokens-lt 4096
agentbench test --project <project-id> --verbose
```

## 10. 下一步

- 📖 阅读 [架构设计](ARCHITECTURE.md) 了解系统全貌
- 🔌 查阅 [API 参考](API_REFERENCE.md) 了解所有端点
- 💻 查阅 [CLI 参考](CLI_REFERENCE.md) 了解命令详解
- 📦 阅读 [SDK 指南](SDK_GUIDE.md) 用代码写测试
- ❓ 查看 [FAQ](FAQ.md) 解决常见问题

---

→ [返回文档中心](INDEX.md)
