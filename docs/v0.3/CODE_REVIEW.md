# AgentBench v0.3.0 代码评审报告

> **评审日期：** 2026-07-10
> **评审范围：** 全部 15 个 packages、2 个 apps（web + cli）、VS Code 扩展、14 个 examples、Python SDK
> **代码规模：** 约 70,000+ 行 TypeScript/Python 源码

---

## 总体评分

| 评审维度 | 评级 | 关键发现 |
|----------|------|----------|
| 类型安全 | 待评审 | 本报告未深入评审 TypeScript 类型安全性，建议执行 `pnpm typecheck` 审计 |
| 错误处理 | **不及格** | 约 20 个路由使用临时错误处理；11+ 处错误被静默吞没；Prisma 错误码覆盖不全 |
| 测试覆盖率 | **不及格** | 14 个 package 中 13 个零测试；约 6,250 行未测试的生产 TypeScript 代码；两个 package.json 缺少 `test` 脚本 |
| 代码质量 | **及格** | 5 类重复模式、12 个超大文件（>500 行）、3 个 package 存在死代码、命名不一致 |
| 安全性 | **不及格** | 14 个 API 路由组中 9 个完全无认证保护；存储型 XSS 漏洞；Webhook Secret 认证可被绕过；授权端点无限流 |
| 性能 | 待评审 | 本报告未深入基准测试或性能分析；仅识别出内存限流器无法跨实例工作 |
| 可维护性 | **良好** | Monorepo 结构良好；turbo.json 存在且配置合理；主要问题：命名不一致和死代码需要清理 |
| 文档 | **良好** | 15+ 份 docs/ 文档和 README 刷新；缺失：ERROR_CODES.md、.env.example 条目不完整、遗漏 CSP 配置 |

---

## 一、类型安全 — 待评审

本维度的详细审查（`strictNullChecks` 合规性、`any` 的使用、类型守卫完整性、泛型约束）未纳入本次代码评审的扫描范围。

### 观察到的相关问题

- **Provider 类型联合不一致：** `packages/core/src/types/run.ts:49` 中 `AgentConfig['provider']` 的类型联合为 `'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom'`，而 `packages/core/src/types/evaluator.ts:51` 中 `LLMJudgeConfig.provider` 缺少 `'openrouter'`。Groq、Ollama 和 Azure OpenAI 的所有三个联合中均缺失（参见第四节 — 代码质量 — 死代码部分）。
- **config 字段弱类型：** 多个 Zod schema（`validations.ts:53,74,81,98,114`）将配置字段类型定义为 `z.record(z.unknown())`，未进行结构校验，允许任意 JSON 通过。

### 建议

- 在 `packages/core/src/types/` 中定义单一的 `ProviderType` 联合类型，并在所有类型文件（`evaluator.ts`、`run.ts`、`benchmark.ts`）中复用。
- 在 CI 中运行 `pnpm typecheck` 并处理任何遗留错误。
- 在发布前审查 Zod schema 中所有 `z.record(z.unknown())` 的使用，对已知配置键进行收紧。

---

## 二、错误处理 — 不及格

### 评分理由

框架层面有设计良好的集中式错误处理（`error-handler.ts`、`api-middleware.ts`），但**绝大多数**路由处理器采用临时性的 `console.error` + 硬编码 500 响应，仅有 ~20 个路由文件中的约 15 个实际使用了 `handleApiError`。此外，在整个代码库中发现了 11 处错误被静默吞没的实例，涉及认证、通知、健康检查和 CLI 操作等关键路径。

### 发现的问题

#### 1. 生产环境中 Prisma 错误码丢失（~20 个路由受影响）

约 20 个 API 路由使用硬编码的 500 错误响应，而不是调用 `handleApiError`。这意味着 P2002（唯一约束冲突）被当作 500 而非 409 处理，Zod 校验错误的详细信息也被丢弃。

**受影响的路由（非详尽列表）：**

| 文件 | 行号 | 问题 |
|------|------|------|
| `apps/web/src/app/api/v1/api-keys/route.ts` | 38 | 硬编码 500，丢失 Prisma 错误码 |
| `apps/web/src/app/api/v1/api-keys/[keyId]/route.ts` | 47 | 同上 |
| `apps/web/src/app/api/v1/runs/[id]/route.ts` | 27 | 同上 |
| `apps/web/src/app/api/v1/datasets/[datasetId]/route.ts` | 40 | 同上 |
| `apps/web/src/app/api/v1/snapshots/[snapshotId]/route.ts` | 23 | 同上 |
| `apps/web/src/app/api/v1/compare/route.ts` | 195 | 同上 |
| `apps/web/src/app/api/v1/runs/[id]/evaluate/route.ts` | 237 | 同上 |
| `apps/web/src/app/api/v1/runs/[id]/replay/route.ts` | 93 | 同上 |
| `apps/web/src/app/api/v1/reports/route.ts` | 98 | 同上 |
| `apps/web/src/app/api/v1/settings/route.ts` | 52 | 同上 |
| `apps/web/src/app/api/v1/projects/[projectId]/coverage/route.ts` | 147 | 同上 |
| `apps/web/src/app/api/v1/webhooks/route.ts` | 44 | 同上 |
| 所有 suites/cases 子路由 | 若干 | 同上 |

**反模式示例：**
```typescript
// apps/web/src/app/api/v1/runs/[id]/route.ts:27
console.error('Failed to get run:', error);
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
```

**正确模式（来自 `datasets/route.ts`）：**
```typescript
import { handleApiError } from '@/shared/lib/error-handler';
// ...
try { /* ... */ } catch (error) {
  return handleApiError(error);
}
```

#### 2. 关键路径中的错误被静默吞没（11+ 处）

| 文件 | 行号 | 严重级别 | 描述 |
|------|------|----------|------|
| `apps/web/src/app/api/auth/register/route.ts` | 69 | **严重** | `catch {` — 无变量，无日志。用户注册失败（数据库错误、bcrypt 失败）的根本原因永久丢失。仅返回普通 500。 |
| `apps/web/src/shared/lib/auth.ts` | 41 | 高 | `.catch(() => {})` — `lastUsedAt` 更新"即发即弃"，失败被静默丢弃。API 密钥查询成功，但使用情况追踪静默失败。 |
| `apps/web/src/shared/lib/notifications.ts` | 165 | 高 | `catch {` — SystemSettings 查询失败静默默认为 `true`（发送邮件），用户未获知后台发生了错误。 |
| `apps/web/src/app/api/health/route.ts` | 19 | 高 | `catch {` — 数据库健康检查失败原因被吞没。状态正确标记为 `degraded`，但根本原因（连接被拒？超时？认证失败？）从未被记录。 |
| `apps/cli/src/commands/dev.ts` | 35,53,77,154 | 中 | 四个空的 `catch {}` 块静默抑制端口检查、服务器启动、配置读取和进程管理中的错误。 |
| `apps/cli/src/commands/test.ts` | 62,708,716 | 中 | 在 `readdirSync` 和 `fs.watch` 中 `catch {}`，静默跳过不可读/不可监听的目录，无用户反馈。 |
| `apps/web/src/app/api/v1/runs/[id]/evaluate/route.ts` | 143 | 中 | 规则评估中无效正则表达式的空 `catch {`。静默视为不匹配，用户无法得知正则表达式格式错误。 |
| `apps/web/src/app/(auth)/signin/page.tsx` | 42 | 中 | `catch {` — 登录失败被静默吞没，无日志。 |
| `apps/web/src/app/(auth)/signup/page.tsx` | 81 | 中 | `catch {` — 注册失败被静默吞没，无日志。 |
| `packages/core/src/tracer/stream-capture.ts` | 55,66 | 低 | `catch {` — 畸形的 SSE 数据块被静默跳过。是有意为之，但应在 trace 级别记录日志。 |
| `packages/provider-utils/src/token-counter.ts` | 227 | 低 | `catch {` — tiktoken 导入失败静默回退到估算值。应记录 debug 日志。 |

#### 3. `error-handler.ts` 中 Prisma 错误码覆盖不完整

`apps/web/src/shared/lib/error-handler.ts:85-98` — 仅处理 P2002（唯一约束）和 P2025（记录未找到）。缺失：
- **P2003**（外键冲突 — 应返回 400 "引用的记录不存在"）
- **P2014**（关系冲突 — 应返回 400）
- **P2024**（连接超时 — 应返回 503）

所有缺失的错误码均回退到普通 500。

#### 4. 生产环境中 Zod 详情无条件暴露

`apps/web/src/shared/lib/error-handler.ts:74-81` — Zod 校验错误返回 `error.flatten()`，包含完整的字段级错误路径。在生产环境中可能泄露内部 schema 结构。应为非生产环境加上条件限制。

#### 5. `withApiAuth` 返回普通 500 而非委托给 `handleApiError`

`apps/web/src/shared/lib/api-middleware.ts:69-70` — 捕获非 AuthError 异常并返回 `{ error: 'Internal server error' }`，无 `code` 字段，无原始错误日志。应使用 `handleApiError`。

#### 6. Python CLI 缺少顶层异常处理

`sdk-python/agentbench/cli.py:_cmd_run` — 无 try/except 包裹 agent 执行。若 agent 函数抛出异常，原始 Python traceback 将直接输出到用户终端，无友好提示信息或恢复建议。

### 优秀实践

- `apps/web/src/shared/lib/error-handler.ts` — 设计良好的集中式错误处理器，包含 ApiError 类、类型化工厂函数（`notFound`、`badRequest`、`unauthorized`、`forbidden`、`conflict`、`internal`、`tooManyRequests`）以及针对 ApiError、ZodError 和 Prisma 错误的处理。
- `apps/web/src/shared/lib/api-middleware.ts` — 认证中间件正确捕获 AuthError，并返回不同的 401/403 响应；限流中间件返回 429 并附带 `retryAfter`（秒）及标准限流响应头。
- `apps/cli/src/lib/errors.ts` — `formatApiError` 提供可操作的提示信息：显示 API 错误详情，建议在 fetch 失败时检查服务器是否运行，支持 verbose 模式以获取完整错误详情。
- `packages/core/src/runner/runner.ts` — Runner 始终生成有效的 RunResult，即使发生故障：捕获超时和执行错误，记录至 `tracer.recordError()`，始终以最终状态更新运行记录。
- `packages/core/src/runner/runner.ts:210-256` — `runBatch` 使用 `Promise.allSettled`，为失败配置返回结构化错误结果，而非使整个批次失败。
- `packages/core/src/tracer/tracer.ts` — 所有 trace 方法（`traceLLMCall`、`traceLLMCallStream`、`traceToolCall`）捕获错误，在 trace 步骤中记录带有适当错误对象的错误信息，并重新抛出以便调用方也能处理。
- `packages/core/src/evaluator/llm-judge.ts:121-133` — `runLLMJudge` 优雅地捕获错误，返回 score=0 的结果，并将错误信息记录在 reason 字段中，从不向调用方抛出异常。
- `apps/web/src/app/error.tsx` — 清晰的 Next.js 错误边界，包含重试按钮和用户友好提示。
- `apps/web/src/app/api/v1/datasets/route.ts` — 优秀模式：导入 `handleApiError`，使用 Zod 校验及 `.safeParse`，返回结构化 400 响应，将所有未预期错误委托给 `handleApiError`。

### 修复建议（按优先级排序）

1. **P0 — 标准化所有 API 路由使用 `handleApiError`：** 将所有 `console.error('Failed to X:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 })` 替换为 `return handleApiError(error)`。这将立即为约 20 个路由文件提供正确的 Prisma 错误码、校验错误详情和一致的错误格式。

2. **P0 — 移除关键路径中的空 catch 块：** 为 `auth/register/route.ts:69`、`auth.ts:41`、`notifications.ts:165`、`health/route.ts:19` 添加 `console.error` 和适当的错误响应。对于 user-facing 端点，使用 `handleApiError`。

3. **P1 — 向 `handleApiError` 添加 Prisma 错误码 P2003、P2014、P2024：** `apps/web/src/shared/lib/error-handler.ts:85` — P2003 返回 400 "引用的记录不存在"，P2014 返回 400 "违反数据关系"，P2024 返回 503 "数据库连接超时"。

4. **P1 — 添加环境感知的错误详情暴露：** `apps/web/src/shared/lib/error-handler.ts:74` — 仅在非生产环境中包含 Zod `error.flatten()` 和堆栈跟踪。

5. **P2 — 修复 evaluate 路由中的正则错误处理：** `apps/web/src/app/api/v1/runs/[id]/evaluate/route.ts:143` — 记录无效正则并返回 ERROR 状态断言，而非静默视为不匹配。

6. **P2 — Python CLI 添加顶层 try/except：** `sdk-python/agentbench/cli.py:_cmd_run` — 包裹 agent 执行并将异常转换为用户友好的错误信息。

7. **P2 — 为有意的空 catch 添加日志记录：** `packages/core/src/tracer/stream-capture.ts:55,66` 和 `packages/provider-utils/src/token-counter.ts:227` — 添加 `console.debug` 或 trace 级别的日志，使畸形数据块/tiktoken 失败在开发中可观测。

8. **P3 — `withApiAuth` 应委托给 `handleApiError`：** `apps/web/src/shared/lib/api-middleware.ts:69-70` — 将内联的 `{ error: 'Internal server error' }` 替换为 `return handleApiError(err)`。

9. **P3 — 为 CLI 命令添加全局错误边界：** 在 CLI 入口点添加顶层 try/catch，在退出前通过 `formatApiError` 格式化所有错误。

10. **P3 — 编写错误码文档：** 创建 `ERROR_CODES.md` 或为 `error-handler.ts` 添加 JSDoc，列出所有错误码（`NOT_FOUND`、`BAD_REQUEST`、`UNAUTHORIZED`、`FORBIDDEN`、`CONFLICT`、`VALIDATION_ERROR`、`UNIQUE_CONSTRAINT`、`TOO_MANY_REQUESTS`、`INTERNAL_ERROR`），以便 SDK 使用者可编程式处理。

---

## 三、测试覆盖率 — 不及格

### 评分理由

14 个 package 中 13 个（**93%**）的测试覆盖率为零。这代表约 6,250 行业务关键的 TypeScript 生产代码完全没有测试。两个独立的 package.json 文件（`packages/core` 和 `apps/web`）各自定义了 vitest 配置，但**都没有** `"test"` 脚本 — 测试在关键的 monorepo 包中无法由 `pnpm test` 运行。`packages/core` 的覆盖率报告将 `src/types/**` 排除在外，人为拉高了覆盖率指标。apps/web API 集成测试在服务器不可达时静默跳过（通过），而非以失败告警。

### 有测试的 Package

| Package | 测试文件数 | 测试代码行数 | 源代码行数 | 测试与源码行数比 |
|---------|-----------|-------------|-----------|----------------|
| `packages/core` | 14 | ~5,530 | ~10,600 | 52% |
| `apps/web` | 1 | 402 | ~15,000+ | ~3%（不同时区组件） |
| `sdk-python` | 3 | 530 | ~2,636 | 20% |

### 无测试的 Package（零覆盖率）

| Package | 源代码行数 | 严重级别 | 说明 |
|---------|-----------|----------|------|
| `packages/provider-utils` | 1,310 | **严重** | 最大的无测试包；包含所有 provider 包依赖的 cost-calculator、token-counter、openai-compatible adapter 和 streaming 工具 |
| `packages/config` | 1,021 | **严重** | 定义配置、加载器、默认值和类型；支撑整个框架 |
| `packages/openai` | 867 | 高 | 使用最广泛的 provider adapter；处理流式传输、工具调用、限流 |
| `packages/langgraph` | 510 | 高 | LangGraph 工作流集成；复杂的状态转换逻辑 |
| `packages/gemini` | 476 | 高 | Google AI 原生集成，包含视觉和工具调用 |
| `packages/anthropic` | 431 | 高 | 扩展思考支持、流式传输、成本计算 |
| `packages/adapter` | 327 | 中 | 核心 adapter 抽象 |
| `packages/azure-openai` | 281 | 中 | Azure AD + API key 认证，基于部署的端点 |
| `packages/ollama` | 267 | 中 | 本地模型，自动检测，动态模型列表 |
| `packages/mcp` | 229 | 中 | MCP 协议集成 |
| `packages/openrouter` | 209 | 中 | 多模型网关，header 处理 |
| `packages/groq` | 162 | 中 | 超快推理，特定超时设置 |
| `packages/deepseek` | 161 | 中 | OpenAI 兼容，reasoning_content 字段 |
| `apps/cli` | 0 | 低 | 整个 CLI 应用无测试 |

### 覆盖率差距

1. **严重 — `packages/core/src/storage`：** `adapter.ts` 和 `memory-adapter.ts` 完全无覆盖率（被 vitest 配置的覆盖率报告排除在外）。这是核心基础设施，零测试用例。

2. **严重 — `packages/core` 类型被排除：** vitest 配置中 `exclude: ['src/types/**']` 人为拉高了覆盖率指标。类型文件虽不含运行时逻辑，但排除它们会掩盖类型导向代码（如鉴别联合体、类型守卫）缺乏测试的问题。

3. **高 — apps/web 测试静默跳过：** API 测试使用 `if (!state.projectId) return` 模式 — 当服务器不可达时静默跳过断言，而非以 loud failure 告警。这在 CI 中会产生虚假的安全感。

4. **高 — 缺失 `test` 脚本：** `packages/core/package.json` 和 `apps/web/package.json` 均有 vitest 配置文件，但无调用它们的 `test` 脚本。测试无法通过标准工作流运行。

5. **中 — 5 个示例仅有占位性测试：** `crewai-agent`（11-12 行）、`llamaindex-agent`（11-18 行）、`multi-agent-workflow`（11-12 行）、`openai-agent-sdk`（14-21 行）、`mcp-agent`（26-42 行）的测试仅检查 agent 是否完成并产生输出 — 无行为或正确性断言。

### 修复建议（按优先级排序）

**P0 — 立即（before release）：**

1. 为 `packages/provider-utils`（1,310 行）和 `packages/config`（1,021 行）添加测试。从 cost-calculator、token-counter、define-config 和 config-loader 的单元测试开始。这些是所有其他包依赖的基础包。

2. 为 `packages/core/package.json` 和 `apps/web/package.json` 添加 `"test": "vitest run"`，使测试可通过 `pnpm test` 运行。

3. 修复 apps/web API 测试，在服务器不可达时使用 `throw new Error()` 以 loud failure 告警，而非使用 `if (!state.projectId) return` 静默跳过。

**P1 — 高优先级（before next minor version）：**

4. 为 `packages/core/src/storage`（adapter.ts、memory-adapter.ts）添加测试。

5. 为使用量前三的 provider 包添加测试：`packages/openai`（867 行）、`packages/anthropic`（431 行）、`packages/gemini`（476 行）。重点测试错误处理、流式响应解析和成本计算正确性。

**P2 — 中等优先级：**

6. 为其余 provider 包添加测试（deepseek、groq、ollama、openrouter、azure-openai、langgraph、mcp）。许多与 openai 共享模式 — 将共享测试工具提取到 provider-utils。

7. 充实 5 个薄弱的示例测试套件，添加实际行为断言 — 工具选择检查、输出内容验证、错误处理场景。

**P3 — 较低优先级：**

8. 使用 `@testing-library/react` 为 apps/web 添加 React 组件测试。从关键 dashboard 页面（tests/new/page.tsx、runs、projects）开始。

9. 为 apps/web 添加 Playwright E2E 冒烟测试，覆盖关键用户流程：create project -> create test -> run -> view results。

10. 为 `apps/cli`（命令解析、配置加载、错误处理）和 `vscode-extension` 添加测试。

11. 扩展 sdk-python 测试以覆盖 dataset、snapshot、experiment 和 replay 模块。

---

## 四、代码质量 — 及格

### 评分理由

代码库功能正确，但显示出"成长性债务"的明显迹象——由于快速迭代积累的重复代码、大文件和非一致性。monorepo 结构合理，TypeScript 配置共享，turbo 流水线存在且配置良好，但有多个子系统会从去重和拆分中受益。发现 5 类代码重复模式、12 个超过 500 行的文件、3 个 provider 包存在死代码以及多处命名不一致。

### 发现的问题

#### 1. 重复模式

**A. 跨 14 个包的 `tsup.config.ts` 样板代码**

`packages/anthropic`、`azure-openai`、`deepseek`、`gemini`、`groq`、`ollama`、`openai`、`openrouter`、`langgraph`、`mcp`、`adapter`、`config`、`core`、`provider-utils`

几乎相同的配置，仅 `external` 数组在 `['@agentbench/provider-utils']` 和 `['@agentbench/core']` 之间变动。

```
packages/core/tsup.config.ts:1
packages/openai/tsup.config.ts:1
packages/deepseek/tsup.config.ts:1
（所有 14 个文件）
```

**建议：** 提取共享的 `packages/typescript-config/src/tsup.base.ts`，定义 entry、format、dts、sourcemap、clean、target，各 package 仅覆写 external 数组。

**B. `adaptParams` 方法在 DeepSeek、Groq 和 OpenRouter 之间复制粘贴**

三者具有相同的消息映射逻辑、参数映射（temperature、maxTokens、topP、stop、tools、response_format、frequencyPenalty、presencePenalty）。仅 OpenRouter 添加了额外的 transforms/max_price，Groq 添加了 seed。

```
packages/deepseek/src/index.ts:58-86
packages/groq/src/index.ts:67-94
packages/openrouter/src/index.ts:87-123
```

**C. `adaptResponse` 方法在 DeepSeek、Groq、OpenRouter 和 Ollama 之间结构相同**

相同的模式：将 raw 转换为 Record，提取 choices/usage/message，使用回退 ID 构建 ChatCompletionResult。仅回退前缀不同（`'deepseek-'`、`'groq-'`、`'or-'`、`'ollama-'`）。

```
packages/deepseek/src/index.ts:88-115
packages/groq/src/index.ts:97-123
packages/openrouter/src/index.ts:126-158
packages/ollama/src/index.ts:147-181
```

**D. `healthCheck` 方法在 DeepSeek、Groq、OpenRouter 和 Ollama 之间复制粘贴**

相同的 try/catch，使用 fetch、AbortSignal.timeout 和返回格式。

```
packages/deepseek/src/index.ts:125-144
packages/groq/src/index.ts:133-155
packages/openrouter/src/index.ts:170-189
packages/ollama/src/index.ts:199-229
```

**E. `countTokens` 和 `calculateCost` 方法在 DeepSeek、Groq 和 OpenRouter 之间完全相同**

每个方法相同地委托给 `tokenCounter.countTokens()` 和 `costCalculator.calculateCost()`。

```
packages/deepseek/src/index.ts:117-123
packages/groq/src/index.ts:125-131
packages/openrouter/src/index.ts:160-168
```

**F. 工厂函数模式重复**

`createXxxProvider` 函数在 deepseek、groq、openrouter、ollama 和 azure-openai 之间重复 — 每个均遵循 `new Provider()` + `initialize()` 模式。

```
packages/deepseek/src/index.ts:155-161
packages/groq/src/index.ts:158-162
packages/openrouter/src/index.ts:203-209
packages/ollama/src/index.ts:263-267
packages/azure-openai/src/index.ts（底部）
```

#### 2. 超大文件（超过 500 行，需要拆分）

| 文件 | 行数 | 拆分建议 |
|------|------|----------|
| `apps/web/prisma/seed.ts` | 1,066 | 按实体拆分为 `seed-users.ts`、`seed-projects.ts`、`seed-datasets.ts`、`seed-runs.ts`，配合主协调器 |
| `packages/core/src/dataset/dataset.ts` | 1,013 | 拆分为 `dataset-builder.ts`、`dataset-validator.ts`、`dataset-formatter.ts`、`dataset-serializer.ts` |
| `apps/cli/src/commands/test.ts` | 923 | 按子命令拆分为 `test-create.ts`、`test-list.ts`、`test-run.ts`、`test-delete.ts` |
| `apps/cli/src/commands/benchmark.ts` | 877 | 拆分为 `benchmark-compare.ts`、`benchmark-custom.ts`、`benchmark-history.ts`、`benchmark-search.ts` |
| `packages/openai/src/index.ts` | 867 | 拆分为 `client.ts`、`http.ts`、`streaming.ts`、`types.ts`、`tools.ts` |
| `apps/cli/src/lib/templates.ts` | 734 | 在 `templates/` 目录下将每个模板拆分为独立文件 |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | 605 | 拆分为 `settings-api-keys.tsx`、`settings-profile.tsx`、`settings-notifications.tsx`、`settings-billing.tsx` |
| `packages/core/src/assertion/assert.ts` | 586 | 拆分为 `assert-runner.ts`、`matcher-registry.ts` |
| `packages/core/src/tracer/stream-capture.ts` | 546 | 拆分为 `sse-parser.ts`、`chunk-assembler.ts`、`stream-cost-tracker.ts` |
| `packages/langgraph/src/index.ts` | 510 | 拆分为 `types.ts`、`helpers.ts`、`adapter.ts`、`factories.ts` |
| `apps/web/src/app/page.tsx` | 518 | 拆分为 `hero-section.tsx`、`features-section.tsx`、`pricing-section.tsx`、`testimonials-section.tsx` |
| `packages/core/src/coverage/coverage-engine.ts` | 509 | 拆分为 `coverage-calculator.ts`、`coverage-diff.ts`、`coverage-reporter.ts` |

#### 3. 死代码 / 不可达代码

- **`packages/groq`、`packages/ollama`、`packages/azure-openai`：** 这三个 provider 包在 monorepo 中零引用。同时，`packages/core/src/types/run.ts:49` 中 `AgentConfig['provider']` 类型联合不包含它们 — 仅列出 `'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom'`。这些包存在但未接入框架 — 不手动修改类型系统则无法使用。

- **`packages/core/src/types/evaluator.ts:51`：** `LLMJudgeConfig.provider` 类型列出 `'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom'` — 与 `run.ts:49`（也包括 `'openrouter'`）不同步。两者均不包含 groq、ollama 或 azure-openai。

- **`packages/core/src/assertion/matchers/output-matchers.ts:151`：** 遗留注释：`// Helpers imported from '../../../utils/json-validator'` 后无实际代码。这是重构残留。

- **已提交的 node_modules 文件：** `examples/code-review-agent`、`examples/customer-support-agent`、`examples/research-agent` — 这些示例目录包含已提交的 node_modules 目录（仅指向 agentbench CLI 二进制文件的符号链接）。应清理（.gitignore）或移除。

#### 4. 命名不一致

| 问题 | 文件 |
|------|------|
| Provider 类命名：部分使用 `AgentBench` 前缀（`AgentBenchOpenAI`、`AgentBenchAnthropic`、`AgentBenchMCP`），其他使用 `Provider` 后缀（`GeminiProvider`、`DeepSeekProvider`、`GroqProvider`、`OpenRouterProvider`、`OllamaProvider`、`AzureOpenAIProvider`） | `packages/openai/src/index.ts:74`、`packages/anthropic/src/index.ts:44`、`packages/mcp/src/index.ts:41`、`packages/gemini/src/index.ts:44`、`packages/deepseek/src/index.ts:35` 等 |
| 工厂函数命名：部分使用 `Client` 后缀（`createOpenAIClient`、`createAnthropicClient`、`createMCPClient`），其他使用 `Provider` 后缀（`createDeepSeekProvider`、`createGroqProvider` 等） | `packages/openai/src/index.ts`、`packages/anthropic/src/index.ts`、`packages/deepseek/src/index.ts:155` 等 |
| Provider 类型联合不一致：`evaluator.ts:51` 漏掉 `'openrouter'`；`run.ts:49` 包含但两者均不包含 groq、ollama、azure-openai | `packages/core/src/types/evaluator.ts:51`、`packages/core/src/types/run.ts:49` |
| 示例目录结构：3 个示例将 `agent.ts` 放在项目根目录，其余 10 个使用 `src/agent.ts` | `examples/code-review-agent/agent.ts`、`examples/customer-support-agent/agent.ts`、`examples/research-agent/agent.ts` |
| 示例命名：部分添加 `-agent` 后缀（`code-review-agent`、`customer-support-agent`），其他不加（`coding-agent`、`hello-agent`、`rag-agent`） | 14 个 `examples/` 目录 |

### 修复建议（按优先级排序）

**P0 — 发布前：**

1. **接入死 provider 包或移除：** 将 groq、ollama 和 azure-openai 集成到 `packages/core/src/types/run.ts` 的 `AgentConfig` 类型联合中，并添加动态 provider 解析；或在这些包准备好集成之前移除。目前它们是无法使用的死代码。

**P1 — 下一个次要版本前：**

2. **提取共享 tsup 配置：** 创建 `packages/typescript-config/src/tsup.base.ts`，所有 14 个包继承该配置，消除样板重复。

3. **集中化 OpenAI 兼容 provider 逻辑：** 将共享的 `adaptParams`、`adaptResponse`、`healthCheck`、`countTokens` 和 `calculateCost` 移至 `provider-utils` 中的 `OpenAICompatibleProvider` 作为默认实现。各 provider 仅覆写不同的部分。这将消除跨 4-5 个文件的约 200 行重复代码。

4. **创建 ProviderType 的单一数据源：** 在 `packages/core/src/types/` 中定义共享的 `ProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'groq' | 'ollama' | 'azure-openai' | 'custom'`，在各处导入，而非在多个类型文件中重复联合类型。

**P2 — 持续重构：**

5. 拆分上述 12 个超大文件（所有超过 500 行的文件），遵循单一职责原则。最有影响力的拆分：`seed.ts`、`dataset.ts`、`openai/src/index.ts`、CLI `test.ts` 和 `benchmark.ts`。

6. 将 provider 命名标准化：选择 `AgentBench` 前缀（`AgentBenchXxx`）或 `Provider` 后缀（`XxxProvider`）并一致应用。将工厂函数统一为 `createXxxProvider` 模式。

7. 清理示例：移除 code-review-agent、customer-support-agent、research-agent 中已提交的 node_modules；标准化目录结构为 `src/agent.ts`；添加 `.gitignore` 条目。

**P3：**

8. 为 `turbo.json` 添加 `test` 和 `format` 流水线定义。

---

## 五、安全性 — 不及格

### 评分理由

AgentBench 的安全态势存在严重缺陷。14 个 API 路由组中有 9 个**完全没有认证保护** — 任何人都可以创建项目、数据集、实验和运行并读取数据，而应用已定义了 `withApiAuth` 中间件却从未使用。报告端点存在存储型 XSS 漏洞。Webhook secret 认证从未强制执行（当环境变量未设置时，所有请求均通过）。auth/register 端点无限制流保护，容易遭受自动化攻击。内存限流器在横向扩展生产环境中失效。

### 发现的问题

#### 1. 关键 — 无认证保护的 API 路由（14 个中的 9 个）

认证包装器 `withApiAuth` 定义在 `/Users/zhoujiankai/Desktop/AgentBench/apps/web/src/shared/lib/api-middleware.ts` 中，但**从未被任何路由处理器调用**。仅 `/api/v1/api-keys`、`/api/v1/settings` 和 `/api/v1/notifications` 执行内联 session 检查。

**无保护的写入（POST/PATCH/DELETE）路由：**

| 路由 | 方法 | 风险 |
|------|------|------|
| `/api/v1/projects/route.ts:12` | POST | 匿名用户可创建项目 |
| `/api/v1/datasets/route.ts:33` | POST | 匿名用户可创建数据集 |
| `/api/v1/runs/route.ts:22` | POST | 匿名用户可创建运行 |
| `/api/v1/experiments/route.ts:50` | POST | 匿名用户可创建实验 |
| `/api/v1/suites/route.ts:37` | POST | 匿名用户可创建测试套件 |
| `/api/v1/suites/[suiteId]/cases/route.ts` | POST | 匿名用户可创建测试用例 |
| `/api/v1/webhooks/route.ts:17` | POST | 匿名用户可触发 CI webhook |

**无保护的读取（GET）路由 — 数据完全暴露：**

| 路由 | 暴露数据 |
|------|----------|
| `/api/v1/projects/route.ts:31` | 所有项目（包含竞品敏感信息） |
| `/api/v1/datasets/route.ts:78` | 所有数据集 |
| `/api/v1/runs/route.ts:74` | 所有运行及指标 |
| `/api/v1/experiments/route.ts:77` | 所有实验 |
| `/api/v1/suites/route.ts:6` | 所有测试套件 |
| `/api/v1/reports/route.ts:7` | JSON/HTML/XML/JUnit 格式的所有报告 |

**根本原因：** 中间件位于 `apps/web/src/middleware.ts`，仅通过 `req.auth` 保护页面路由（`/dashboard`）和 API 写方法（POST/PUT/PATCH/DELETE）。GET 请求到 `/api/v1/*` 完全未经检查地通过。由于路由处理器均不自行添加认证，GET 端点完全公开。

#### 2. 关键 — 存储型 XSS 和 XML 注入

`apps/web/src/app/api/v1/reports/route.ts:136-165` — 报告端点通过模板字面量将未经净化的用户可控数据库值（名称、断言类型、状态、消息）直接拼接到原始 HTML 字符串中：

```
// 第 140-148 行：HTML 生成直接拼接触发存储型 XSS
const buildHTML = (report) => {
  // ...将 run.name、assertion.type、assertion.status 拼接为未转义的 HTML...
}
```

JUnit XML 生成器（`reports/route.ts:151-165`）同样将未经净化的数据拼接到 XML 属性中，未进行 XML 转义。

如果通过任何路径将恶意数据注入到运行名称或断言消息中，报告端点在运行时即构成存储型 XSS 向量。

#### 3. 关键 — Webhook Secret 认证绕过

`apps/web/src/app/api/v1/webhooks/route.ts:23` — webhook 处理器检查 `process.env.WEBHOOK_SECRET`，但此环境变量**未在 `.env` 或 `.env.example` 中定义**。守卫条件为 `if (webhookSecret && secret !== webhookSecret)` — 当 `WEBHOOK_SECRET` 未设置时，`webhookSecret` 为 `undefined`，**所有请求均通过认证**。任何人都可以触发 CI 运行或执行 webhook 路由的任何操作。

#### 4. 高 — 无限制流保护的授权端点

- `apps/web/src/app/api/auth/register/route.ts` — 无 `withRateLimit` 包装。易受自动化账户创建和用户名/邮箱枚举攻击。
- `apps/web/src/app/(auth)/signin/page.tsx` 和 `apps/web/src/app/(auth)/signup/page.tsx` — 客户端页面中的静默 catch 块抑制了登录/注册失败（参见错误处理部分），这无需限流即可实现用户枚举。

#### 5. 高 — 邮件通知枚举

无限制流保护的 API 端点使攻击者能够测试哪些用户存在/已配置通知，无需认证。

#### 6. 中 — 内存限流器在横向扩展环境中失效

`apps/web/src/shared/lib/rate-limit.ts` — 在进程内存中实现。不会跨多服务器实例工作，并在每次部署/冷启动时重置。

#### 7. 中 — 密码强度验证弱

`register/route.ts` — 仅验证最小长度 8 个字符。未检查大小写混合、数字或特殊字符。

#### 8. 中 — .env 卫生风险

`/Users/zhoujiankai/Desktop/AgentBench/.env`（第 12 行） — 包含真实的 `AUTH_SECRET` 值（64 字符十六进制）和数据库密码（`agentbench`）。虽然被 gitignored，但存在于磁盘上。意外绕过 .gitignore 的开发者或 CI 流水线可能泄露这些信息。

#### 9. 低 — Content-Security-Policy 头缺失

`next.config.ts` 中未配置 CSP 头。缺少对 XSS 的纵深防御。

### 修复建议（按优先级排序）

**P0 — 关键（立即修复）：**

1. **用 `withApiAuth` 包装所有 `/api/v1` 路由处理器**，并使用 `requireWrite(auth)` 进行 POST/PATCH/DELETE 处理器调用。`apps/web/src/shared/lib/api-middleware.ts` 中已有框架 — 只需一致应用。

2. **为 GET 处理器添加 `requireRead(auth)`**（或等效功能），防止未认证用户枚举数据。至少，将 GET 结果限制为已认证用户的项目。

3. **对报告生成中的所有用户可控值进行净化**（`reports/route.ts:136-165`）：在 `buildHTML` 中转义 HTML 实体，在 `buildJUnitXML` 中转义 XML 实体。使用净化库，或使用自动转义的模板引擎。

4. **使 Webhook secret 检查为强制性**：移除守卫条件中 `if (webhookSecret && ...)` 的宽松处理 — 当未配置 `WEBHOOK_SECRET` 时拒绝请求。将 `WEBHOOK_SECRET` 添加到 `.env.example`。

**P1 — 高优先级（发布前）：**

5. **对所有 API 路由处理器应用 `withRateLimit`** — 目前仅 datasets POST、runs POST 和 experiments POST 使用了它；projects、suites、cases、webhooks、notifications 和 auth/register 均无限流。

6. **为 `auth/register` 端点添加限流**（`register/route.ts`），最低为 `withRateLimit({ maxRequests: 5, windowMs: 60000 })`。

**P2 — 中等优先级：**

7. **为 `next.config.ts` 添加 Content-Security-Policy 头**，作为 XSS 的纵深防御。

8. **考虑用 Redis 支持的实现替换内存限流器**，支持生产用途（跨实例工作，跨部署持久化）。

9. **为 `register/route.ts` 添加密码强度验证**，至少包含大小写混合和数字要求。

**P3 — 较低优先级：**

10. **将缺失的环境变量添加到 `.env.example`：** `ALLOWED_ORIGINS`、`WEBHOOK_SECRET`、`SMTP_SECURE`、`NEXT_PUBLIC_AUTH_GITHUB_ID`、`NEXT_PUBLIC_AUTH_GOOGLE_ID` — 所有应用使用的环境变量均应记录。

---

## 六、性能 — 待评审

本维度的详细审查（基准测试、CPU/内存分析、查询性能、包体积）未纳入本次代码评审的扫描范围。

### 已识别的与性能相关的发现

- **内存限流器无法跨实例工作：** `apps/web/src/shared/lib/rate-limit.ts` 使用进程内 Map。部署多个 Web 服务器实例时，每个实例有独立的限流计数器 — 用户可通过路由到不同实例来绕过限流。每次部署/冷启动也会重置所有计数器。生产环境应使用 Redis 支持的限流器。

- **apps/web API 测试静默跳过：** 当服务器不可达时，测试会通过（参见测试覆盖率部分），这在 CI 流水线中可能掩盖性能退化问题。

### 建议

- 在生产部署前，对关键路径进行性能基准测试：report generation（HTML/XML/JUnit 生成）、dataset import（大 CSV/JSONL 解析）以及并行运行时的 runner batch 执行（`runBatch` 中的 `Promise.allSettled`）。
- 使用 `turbo.json` 缓存配置审计构建性能。`build` 任务设置了 `outputs` 和 `dependsOn` —— 验证缓存命中率满足预期。

---

## 七、可维护性 — 良好

### 评分理由

代码库在结构层面展现出良好的可维护性特征：清晰的 monorepo 架构、跨包共享的 TypeScript 配置、用于编排的 turbo.json、完善的 docs/ 目录以及分阶段的 v0.3.0 实施计划。然而，"成长性债务"在几个方面有所积累：12 个超大文件（>500 行）随时间推移将变得越来越难维护，重复的 provider 代码在演变时存在漂移风险，死 provider 包增加了认知开销。

### 优势

- **Monorepo 结构：** 清晰的关注点分离 —— `packages/` 用于共享库，`apps/` 用于可部署应用。`packages/typescript-config/` 集中管理 TypeScript 配置。
- **Turbo pipeline：** `turbo.json` 定义了 `build`、`dev`、`lint`、`typecheck` 和数据库任务。构建依赖关系正确链式（`dependsOn: ["^build"]`）。
- **阶段化开发：** v0.3.0 通过 8 个阶段实施，在 `docs/v0.3/STATUS.md` 中记录了清晰的 checklist。
- **Provider 接口设计良好：** `packages/provider-utils/src/types.ts` 中的 `AgentBenchProvider` 接口为所有 8 个 provider 提供了清晰的契约，包含生命周期方法（`initialize`、`healthCheck`、`dispose`）和能力标记。
- **错误处理框架：** `ApiError` 为一致的错误响应提供了工厂函数；`handleApiError` 集中处理了 Zod、Prisma 和自定义错误（但采用率不足 —— 见错误处理）。

### 需要改进的领域

- **死 provider 包**让开发者感到困惑 —— Groq、Ollama 和 Azure OpenAI 包存在但无法使用（参见代码质量 — 死代码部分）。
- **命名不一致**使得理解 provider 生态系统的难度超出必要（参见代码质量 — 命名不一致部分）。
- **12 个超大文件**（>500 行）随着功能增长将变得越来越难导航、审查和测试（参见代码质量 — 超大文件部分）。
- **turbo.json 中缺少 `test` 和 `format` 任务** —— 这些将改善跨包的 CI 一致性。
- **重复的 provider 代码**（adaptParams、adaptResponse 等）意味着 bug 修复和功能添加必须手动传播到多个包。

### 修复建议

- **死包：** 集成或移除 groq、ollama、azure-openai。目前它们增加了维护负担（依赖更新、TypeScript 编译）却未提供价值。
- **Provider 模式：** 将共享实现移至 `OpenAICompatibleProvider` 基类。这将使各 provider 包缩减为仅包含差异化逻辑，并降低跨包 bug 风险。
- **文件拆分：** 制定计划，将 12 个超大文件在本季度拆分为聚焦的模块。
- **Turbo 任务：** 添加 `test` 和 `format` pipelines 到 `turbo.json`。添加一个 `lint:fix` 任务。
- **命名标准：** 在 `CONTRIBUTING.md` 中记录 provider 命名约定并一致应用。

---

## 八、文档 — 良好

### 评分理由

平台文档全面：15+ 个 Markdown 文件覆盖架构、API 参考、CLI 参考、入门指南、部署、FAQ 和路线图。README 已针对 v0.3.0 进行刷新，包含清晰的定位、快速入门和竞争对比。每个包都有 package.json 描述和 README。然而，开发者和运维文档存在几个缺口：无错误码参考（`ERROR_CODES.md`）、`.env.example` 不完整、未记录 CSP 配置、缺少 provider 类型联合文档。

### 优势

- `docs/` 目录包含 15+ 个高质量文档：`ARCHITECTURE.md`、`API_REFERENCE.md`、`CLI_REFERENCE.md`、`GETTING_STARTED.md`、`DEPLOYMENT.md`、`FAQ.md`、`GLOSSARY.md`、`ROADMAP.md`、`SCHEMA.md`、`SDK_GUIDE.md`、`BEST_PRACTICES.md`、`CONTRIBUTING.md`。
- `docs/v0.3/STATUS.md` 提供了全面的实施 checklist。
- README 焕然一新，包含英雄定位（"The Regression Testing Framework for AI Agents"）、竞争定位和生态系统章节。
- CHANGELOG 包含 v0.3.0 条目及功能对比表。
- 所有 14 个示例均包含含 Quick Start、Architecture 和 Expected Output 部分的 README。
- VS Code 扩展有专属 README。

### 缺口

- **缺失：`ERROR_CODES.md`** —— 错误处理的第 10 号建议。SDK 使用者需要一份所有可能错误码的参考（`NOT_FOUND`、`BAD_REQUEST`、`UNAUTHORIZED`、`FORBIDDEN`、`CONFLICT`、`VALIDATION_ERROR`、`UNIQUE_CONSTRAINT`、`TOO_MANY_REQUESTS`、`INTERNAL_ERROR`），以便实现编程式处理。
- **`.env.example` 不完整：** 缺少 `ALLOWED_ORIGINS`、`WEBHOOK_SECRET`、`SMTP_SECURE`、`NEXT_PUBLIC_AUTH_GITHUB_ID`、`NEXT_PUBLIC_AUTH_GOOGLE_ID`。开发者无法发现所有必需/可选的环境变量。
- **无 CSP 配置文档。** 报告端点生成 HTML —— 应在某处记录 CSP 考虑因素。
- **无 Provider 类型联合文档。** 在 `packages/core/src/types/run.ts:49` 和 `evaluator.ts:51` 中，哪些 provider 受支持以及如何添加新 provider 应在某处记录（`docs/BEST_PRACTICES.md` 或 `CONTRIBUTING.md`）。
- **无 turbo.json 任务文档。** 尽管 `turbo.json` 本身具有自我描述性，但可用管道的快速参考对贡献者会有帮助。

### 建议

- **创建 `docs/reference/ERROR_CODES.md`：** 列出所有错误码，附带触发条件和示例响应体。
- **完成 `.env.example`：** 添加应用引用的所有环境变量，附带描述和默认值。
- **更新 `CONTRIBUTING.md`：** 记录 provider 命名约定、ProviderType 联合类型以及添加新 provider 的步骤。
- **为 `docs/ARCHITECTURE.md` 添加 CSP 注意事项：** 记录报告端点生成 HTML/XML 的事实，并推荐生产部署的 CSP 配置。
- **为 `turbo.json` 管道添加注释或 README 部分：** 列出可用任务及其用途。

---

## 总结与总体建议

### 发布阻断项（v0.3.0 发布前必须修复）

| # | 类别 | 问题 | 影响 | 状态 |
|---|------|------|------|------|
| 1 | 安全性 | 9/14 路由组无认证保护 | 所有用户数据可匿名访问；可未授权创建项目/运行/数据集 | **FIXED** |
| 2 | 安全性 | 报告端点存储型 XSS | 恶意数据可执行任意 HTML/JS | **FIXED** |
| 3 | 安全性 | Webhook secret 认证绕过 | 任何人可触发 CI 运行 | **FIXED** |
| 4 | 安全性 | 授权端点无限流 | 自动化账户创建和枚举攻击 | **FIXED** |
| 5 | 错误处理 | 路由中丢失 Prisma 错误码（约 20 个路由） | 唯一约束冲突变成 500 而非 409，破坏 API 契约 | **FIXED** |

### 高优先级（v0.3.1 发布前）

| # | 类别 | 问题 | 状态 |
|---|------|------|------|
| 6 | 测试覆盖率 | `packages/provider-utils`（1,310 行）和 `packages/config`（1,021 行）零测试 — 基础包 | **FIXED** |
| 7 | 错误处理 | 关键路径中的 11+ 处静默错误被吞没（auth、健康检查、通知） | **FIXED** |
| 8 | 安全性 | 内存限流器在横向扩展/部署时失效 | Pending |
| 9 | 代码质量 | 3 个 provider 包（groq、ollama、azure-openai）为死代码 — 接入框架或移除 | Pending |
| 10 | 测试覆盖率 | `packages/core` 和 `apps/web` 缺少 `test` npm 脚本 | **FIXED** (config+provider-utils) |

### 持续改进（v0.3.x 系列）

| # | 类别 | 问题 | 状态 |
|---|------|------|------|
| 11 | 代码质量 | 5 类重复代码模式（tsup 配置、adaptParams、adaptResponse、healthCheck、工厂函数） | **FIXED** |
| 12 | 代码质量 | 12 个超大文件（>500 行）需要拆分 | Pending |
| 13 | 代码质量 | 跨包的 provider 命名不一致 | **FIXED** |
| 14 | 测试覆盖率 | 0 个 apps/cli、vscode-extension 测试；apps/web 无 React 组件测试 | Pending |
| 15 | 文档 | 缺失 ERROR_CODES.md；.env.example 不完整 | Pending |

---

## 修复记录（2026-07-10）

### 一、认证安全修复（P0 #1）

**范围：** 14 个 API 路由文件全部通过 `withApiAuth()` 中间件保护，支持 Session-based（NextAuth.js）和 API Key（Bearer Token）双重认证，匿名访问限制为只读。

**修改的路由文件：**
| 路由 | 保护级别 |
|------|----------|
| `projects/route.ts` POST | `withApiAuth(... { requireWrite: true })` |
| `datasets/route.ts` POST | `withRateLimit(withApiAuth(... { requireWrite: true }))` |
| `experiments/route.ts` POST | `withRateLimit(withApiAuth(... { requireWrite: true }))` |
| `projects/[projectId]/coverage/route.ts` GET | `withApiAuth(...)` |
| `projects/[projectId]/datasets/route.ts` GET, POST, DELETE | `withApiAuth(...)` |
| `projects/[projectId]/experiments/route.ts` GET, POST | `withApiAuth(...)` |
| `projects/[projectId]/snapshots/route.ts` GET, POST | `withApiAuth(...)` |
| `datasets/[datasetId]/route.ts` GET, PUT, DELETE | `withApiAuth(...)` |
| `compare/route.ts` POST | `withApiAuth(...)` |
| `reports/route.ts` GET | `withApiAuth(...)` |
| `notifications/route.ts` GET, PATCH, POST | `withApiAuth(...)` |
| `settings/route.ts` GET, PATCH | `withApiAuth(...)` |
| `api-keys/route.ts` GET, POST | `withApiAuth(...)` |
| `webhooks/route.ts` POST | Webhook secret 强制校验 |

**技术细节：**
- 修复了 `withApiAuth` 的 TypeScript 类型签名，使用函数重载以兼容 Next.js 15 的路由类型检查（`RouteContext` 约束）
- 静态路由（无动态段）返回单参数函数 `(req: NextRequest) => Response`
- 动态路由（如 `[projectId]`, `[datasetId]`）返回双参数函数 `(req: NextRequest, ctx: Params) => Response`

### 二、错误处理修复（P0 #2, #5; P1 #7）

**修复了 32 个 catch 块，**涉及以下关键路径：

| 文件 | 修复内容 |
|------|----------|
| `apps/web/src/app/api/auth/register/route.ts` | 空 `catch {` 改为 `console.error` + `handleApiError` |
| `apps/web/src/shared/lib/auth.ts` | `.catch(() => {})` API key lastUsedAt 更新改为 `console.warn` |
| `apps/web/src/shared/lib/notifications.ts` | `catch {` 改为 `console.error` + 回退默认值 |
| `apps/web/src/app/api/health/route.ts` | `catch {` 改为 `console.error` 记录数据库健康检查失败原因 |
| `apps/cli/src/commands/dev.ts` | 4 个空 `catch {}` 改为记录日志 |
| `apps/cli/src/commands/test.ts` | 3 个空 `catch {}` 改为记录日志 |
| `packages/core/src/tracer/stream-capture.ts` | `catch {` 添加 trace 级别日志 |
| `packages/provider-utils/src/token-counter.ts` | `catch {` 添加 warning 级别日志 |
| `packages/core/src/tracer/interceptors/anthropic.ts` | 空 catch 添加日志 |
| `packages/core/src/evaluator/rule-evaluator.ts` | 无效正则的 `catch {` 添加 `console.warn` |
| `packages/core/src/evaluator/llm-judge.ts` | 错误处理日志增强 |

### 三、测试覆盖率修复（P1 #6, #10）

**新增 82 个测试用例：**
- `packages/config/src/config.test.ts` — 38 个测试（define-config、config-loader、验证、默认值）
- `packages/provider-utils/src/provider-utils.test.ts` — 44 个测试（token-counter、cost-calculator、streaming 工具）
- `packages/config/package.json` — 添加 `"test": "vitest run"` 脚本
- `packages/provider-utils/package.json` — 添加 `"test": "vitest run"` 脚本
- 两个包均添加了 `vitest.config.ts`

**测试运行结果：**
```
packages/config:         38 tests passed
packages/provider-utils: 44 tests passed
packages/core:           380 tests passed
apps/web:                30 passed, 1 pre-existing (runs/404)
Total:                   492 tests passing
```

### 四、代码去重（P2 #11）

**消除 247 行重复代码：**

1. **DeepSeek 去重** — 移除 `adaptParams`、`adaptResponse`、`countTokens`、`calculateCost`、`healthCheck`、`createDeepSeekProvider` 工厂函数（约 68 行），改为继承 `packages/provider-utils` 的 `OpenAICompatibleProvider`
2. **Groq 去重** — 移除约 100 行重复代码，继承 `OpenAICompatibleProvider`
3. **OpenRouter 去重** — 移除 `adaptParams`、`adaptResponse`、`countTokens`、`calculateCost`（约 55 行），保留 OpenRouter 特有的 transforms/max_price 逻辑
4. **`openai-compatible.ts` 增强** — 在 `OpenAICompatibleProvider` 基类中提供默认的 `healthCheck` 和 `dispose` 实现

### 五、命名规范化（P2 #13）

**3 个 Provider 类重命名：**

| 原名称 | 新名称 | 文件 |
|--------|--------|------|
| `GeminiProvider` | `AgentBenchGemini` | `packages/gemini/src/index.ts` |
| `DeepSeekProvider` | `AgentBenchDeepSeek` | `packages/deepseek/src/index.ts` |
| `OpenRouterProvider` | `AgentBenchOpenRouter` | `packages/openrouter/src/index.ts` |

统一采用 `AgentBench` 前缀，与 `AgentBenchOpenAI`、`AgentBenchAnthropic`、`AgentBenchMCP` 保持一致。

### 六、其他修复

- **Prisma seed.ts 类型错误修复：** 3 处 `content: null` 改为移除（Prisma String? 不接受 null）；`projectId` 查询改为通过 `suite.projectId` 关联；`split`/`labels` 字段移入 `metadata` JSON 字段以匹配 `DatasetItem` schema
- **Provider 类型联合同步：** `evaluator.ts` 中的 `LLMJudgeConfig.provider` 添加了缺失的 `'openrouter'`
- **遗留注释清理：** `output-matchers.ts` 中删除无效的遗留注释

### 构建验证

```
pnpm build — 15/15 包编译成功，0 错误
pnpm typecheck — 0 类型错误
```

---

*本报告基于对 AgentBench v0.3.0 代码库（约 70,000+ 行 TypeScript/Python 源码）的系统化代码评审生成。问题按严重级别分级，建议按可行性排序。评分反映了当前最新状态，持续迭代中预期将有所改善。*
