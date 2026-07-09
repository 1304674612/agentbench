# 常见问题（FAQ）

## 基础

### Q: AgentBench 是什么？
A: AgentBench 是一个 AI Agent 的回归测试框架。它让你像测试软件一样测试 Agent——回放、评估、对比、断言、检测回归。类比 Playwright + Jest + LangSmith 的组合。

### Q: AgentBench 和 LangSmith / Braintrust 有什么区别？
A: LangSmith 和 Braintrust 侧重于 LLM 调用的监控和调试。AgentBench 侧重于**测试和回归**——它提供快照、回放、A/B 实验、覆盖率分析、断言 DSL 等测试框架特有的能力。

### Q: 支持哪些 LLM 提供商？
A: 通过 SDK 原生支持 OpenAI 和 Anthropic。MCP 协议支持任意 MCP 兼容的工具服务器。通用适配器可对接任意 Agent。

---

## 安装与部署

### Q: 一定要用 Docker 吗？
A: Docker 用于运行 PostgreSQL 和 Redis。如果你已有这两个服务，可以直接配置 `.env` 中的连接字符串，无需 Docker。

### Q: 能用 SQLite 代替 PostgreSQL 吗？
A: 目前不支持。v0.1.0 仅支持 PostgreSQL。SQLite 适配器在路线图中。

### Q: 如何部署到生产环境？
A: 参考 [部署指南](DEPLOYMENT.md)。推荐 Docker Compose 一键部署，或部署到 Vercel + 外部 PostgreSQL。

### Q: API 有认证吗？
A: v0.1.0 Alpha 版本中 API 认证是可选的（支持 `ab-` 前缀的 API Key）。v1.0 将完整集成 NextAuth.js。

---

## 使用

### Q: 如何创建一个测试？
A: 完整流程：
1. 创建 Project → 2. 创建 Test Suite → 3. 创建 Test Case（含断言和评估器）→ 4. 创建 Run → 5. 评估 Run
参考 [快速入门](GETTING_STARTED.md)。

### Q: 断言 DSL 怎么用？
A: 链式 API，读起来像英文：
```typescript
expect(run)
  .tool("search").toBeCalled()
  .output().toContain("退款")
  .tokens().toBeLessThan(4096)
  .run()
```
详见 [API 参考](API_REFERENCE.md)。

### Q: LLM Judge 是什么？
A: LLM Judge 使用一个 LLM（如 GPT-4o）来评判另一个 Agent 的输出质量。支持 8 个维度：正确性、忠实度、安全性、相关性、完整性、推理质量、简洁性、工具使用。

### Q: LLM Judge 的费用怎么算？
A: 每次 Judge 调用都会消耗 Token。建议使用便宜的模型（如 `gpt-4o-mini`）作为 Judge，并在配置中设置最大 Token 限制。

### Q: 如何对比两个 Prompt 哪个更好？
A: 使用 Experiment（A/B 实验）功能。创建两个 Variant，各运行 N 次，AgentBench 会自动计算 t-test、p-value 和效应量，给出统计结论。

### Q: 如何检测 Agent 是否退化？
A: 创建基线快照 → 修改 Prompt/模型 → 回放 → AgentBench 自动对比 Metrics 和 Scores，标记回归。

### Q: 支持的断言类型有哪些？
A: 14 种规则评估器 + 8 种 LLM Judge 维度。包括：`contains`、`exact_match`、`regex_match`、`json_schema`、`tool_called`、`tool_not_called`、`tool_called_with`、`tool_called_times`、`latency_lt`、`tokens_lt`、`tokens_gt`、`cost_lt`、`cost_gt`、`status_code`。

---

## 故障排查

### Q: 启动报错 "Foreign key constraint violated"
A: 这是数据库初始化问题。确保你运行了 `pnpm db:push`（不是 `db:migrate`），这将自动创建所有表。

### Q: 创建 Project 返回 500
A: 检查 PostgreSQL 是否在运行：`docker compose ps`。确保 DATABASE_URL 环境变量正确。

### Q: pnpm dev 启动失败
A: 最常见的原因是 CLI 包的 tsup 找不到配置文件。已修复为 `tsc --watch`。如果仍有问题，可以单独启动 web：
```bash
cd apps/web && npx next dev --port 3000
```

### Q: TypeScript 类型错误
A: 当前版本 0 TypeScript 错误（strict mode）。如果你看到类型错误，确保运行了 `pnpm db:generate` 生成 Prisma Client。

---

→ [返回文档中心](INDEX.md)
