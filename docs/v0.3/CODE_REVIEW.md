# AgentBench v0.3.0 — 代码审查报告

> **审查日期：** 2026-07-10
> **审查范围：** 340 个 TypeScript 文件，39,659 行代码，15 个 Package，14 个 Example
> **审查方式：** 5 个并行 Agent 审查 + 1 个合成 Agent
> **审查标准：** 软件工程八荣八耻

---

## 一、以类型安全为荣，以 Any 为耻 — 良好 ⭐⭐⭐⭐

| 指标 | 数值 |
|------|------|
| `any` 使用总量 | **45 处**（39,659 行中，占比 0.11%） |
| apps/cli | **0 处** ✅ |
| packages/provider-utils | **0 处** ✅ |
| packages/core | **5 处** ✅ |
| apps/web | **39 处** ⚠️ |

### 优秀实践
- CLI 和 provider-utils 做到了 **零 `any`**
- core 只有 5 处，集中在老代码 `snapshot-manager.ts`、`storage/adapter.ts`
- Zod schema 覆盖了所有 API 输入校验

### 需改进
- **apps/web 有 39 处 `any`**，主要集中在页面组件的数据获取和状态管理。建议逐批修复，使用 `unknown` + type guards 替代 `any`
- `packages/openai/src/index.ts:691` — `adapted.max_completion_tokens = adapted.max_tokens`，对 `Record<string, unknown>` 的索引访问应使用类型守卫

### 建议
```typescript
// ❌ 现在
const data: any = await response.json()

// ✅ 推荐
const data: unknown = await response.json()
const parsed = MySchema.parse(data)
```

---

## 二、以测试覆盖为荣，以裸奔上线为耻 — 不及格 ⭐

| 指标 | 数值 |
|------|------|
| 有测试的 Package | **1 / 15** |
| 无测试的 Package | **14 / 15** |
| 核心引擎测试文件 | 14 个（仅 @agentbench/core） |
| 新包测试 | **0 个**（config、provider-utils、gemini、deepseek...） |

### 严重缺口

**只有 `@agentbench/core` 有测试。** 其他 14 个包零测试：

```
✗ @agentbench/config        — 0 tests（新包）
✗ @agentbench/provider-utils — 0 tests（新包，Provider SDK 基类）
✗ @agentbench/openai        — 0 tests
✗ @agentbench/anthropic     — 0 tests
✗ @agentbench/gemini        — 0 tests（新包）
✗ @agentbench/deepseek      — 0 tests（新包）
✗ @agentbench/azure-openai  — 0 tests（新包）
✗ @agentbench/openrouter    — 0 tests（新包）
✗ @agentbench/groq          — 0 tests（新包）
✗ @agentbench/ollama        — 0 tests（新包）
✗ @agentbench/adapter       — 0 tests
✗ @agentbench/mcp           — 0 tests
✗ @agentbench/langgraph     — 0 tests
✗ apps/web                  — 0 集成测试
```

### 建议
1. **P0：** `@agentbench/config` — 补充 `defineConfig` 合并逻辑、配置加载优先级的单元测试
2. **P0：** `@agentbench/provider-utils` — 补充 `OpenAICompatibleProvider`、`CostCalculator`、`TokenCounter` 的单元测试
3. **P1：** 6 个新 Provider — 至少补齐 `healthCheck` 和 `adaptResponse` 的 mock 测试
4. **P2：** apps/web — 补充 API 路由的集成测试

---

## 三、以错误处理为荣，以吞掉异常为耻 — 及格 ⭐⭐⭐

### 优秀实践
- ✅ API 层有 `ApiError` 工厂函数（notFound、badRequest、unauthorized 等）
- ✅ `handleApiError()` 统一处理 ApiError、ZodError、Prisma 错误
- ✅ CLI 层有 `formatApiError()` 将错误转为用户可读的消息

### 🔴 发现：11 处吞异常

| 文件 | 行号 | 问题 |
|------|------|------|
| `apps/web/src/app/api/auth/register/route.ts` | 69 | `catch {` 空块 — 注册失败静默丢失 |
| `apps/web/src/shared/lib/auth.ts` | 41 | `.catch(() => {})` — API Key lastUsedAt 更新静默失败 |
| `apps/web/src/shared/lib/notifications.ts` | 165 | `catch {` — 系统设置查询失败被忽略 |
| `apps/web/src/app/api/health/route.ts` | 19 | `catch {` — DB 健康检查失败原因被吞 |
| `apps/cli/src/commands/dev.ts` | 35,53,77,154 | **4 处空 catch** — 服务器启动、配置加载失败无任何提示 |
| `apps/web/src/app/api/v1/suites/route.ts` | ~20 | 使用 `console.error` + 硬编码 `{ error: 'Internal server error' }`，未使用 `handleApiError` |

### 需改进
- **约 20 个 API route 使用 ad-hoc 错误处理**（`console.error` + 硬编码 500），而非统一的 `handleApiError()`
- `health/route.ts` 吞掉 DB 错误原因——健康检查失败时应返回具体错误信息
- `auth/register/route.ts:69` 空 catch 意味着用户注册失败时得不到任何反馈

---

## 四、以代码简洁为荣，以重复造轮子为耻 — 及格 ⭐⭐⭐

### 🔴 6 类重复代码

| 重复内容 | 影响范围 | 行数 |
|---------|---------|------|
| `tsup.config.ts` 模板 | **14 个包**完全相同 | 10行 × 14 |
| `adaptParams` 方法 | DeepSeek、Groq、OpenRouter **完全相同** | ~30行 × 3 |
| `adaptResponse` 方法 | DeepSeek、Groq、OpenRouter、Ollama **结构一致** | ~40行 × 4 |
| `healthCheck` 方法 | DeepSeek、Groq、OpenRouter、Ollama **完全一致** | ~25行 × 4 |
| `countTokens` + `calculateCost` | DeepSeek、Groq、OpenRouter **完全一致** | ~15行 × 3 |
| `tsconfig.json` 模板 | **14 个包**完全相同 | 7行 × 14 |

**建议：** 将通用方法收归 `OpenAICompatibleProvider` 基类，子类只需覆盖 `id`、`name`、`capabilities`、`baseUrl`。

### 🟡 4 处死代码

| 位置 | 问题 |
|------|------|
| `packages/groq`、`ollama`、`azure-openai` | 这些 Provider 包在 tree-shaking 后可能未被任何代码引用 |
| `packages/core/src/types/evaluator.ts:51` | Provider 类型联合只列了 `'openai' \| 'anthropic' \| 'gemini' \| 'deepseek'`，未包含新 Provider |
| `packages/core/src/assertion/matchers/output-matchers.ts:151` | 过时注释引用已不存在的 `../../../utils/` |
| `examples/code-review-agent`、`customer-support-agent`、`research-agent` | 旧 Example 使用了与 11 个新 Example 不同的目录结构 |

### 🟡 5 处命名不一致

| 问题 | 示例 |
|------|------|
| Provider 类名不统一 | `AgentBenchOpenAI` vs `GeminiProvider` vs `GroqProvider` |
| 工厂函数命名不统一 | `createOpenAIClient()` vs `createGeminiProvider()` vs `createGroqProvider()` |
| Example 目录结构不统一 | 旧 3 个 Example 的 `agent.ts` 在根目录，新 11 个在 `src/agent.ts` |
| Example 命名后缀不统一 | 有的加 `-agent` 后缀，有的不加 |
| 类型联合不完整 | `evaluator.ts` 的 Provider 列表未包含新增的 6 个 Provider |

### 大文件（>500行）

| 文件 | 行数 | 建议 |
|------|------|------|
| `packages/core/src/dataset/dataset.ts` | 1,013 | 拆分：CSV parser、JSON parser、split/sample 逻辑可独立 |
| `apps/cli/src/commands/test.ts` | 923 | 拆分：watch 模式、replay 模式、输出格式化可独立 |
| `apps/cli/src/commands/benchmark.ts` | 877 | 拆分：mock 数据、API 调用、输出格式化可独立 |
| `packages/openai/src/index.ts` | 867 | 拆分：reasoning adapter、streaming、tracing 可独立 |

### Provider 重复代码

6 个新 Provider（groq 162行、deepseek 161行、openrouter 209行、ollama 267行）有大量相似代码：
- `countTokens` — 全部用 `tokenCounter.countTokens(params)`，完全相同
- `calculateCost` — 全部用 `costCalculator.calculateCost(usage, model)`，完全相同
- `adaptResponse` — 80% 相似的 JSON 字段映射

**建议：** `OpenAICompatibleProvider` 已经提供了基类，但 `countTokens` 和 `calculateCost` 的默认实现应该放到基类中，子类只需覆盖特殊情况（如 Ollama 返回 0 成本）。

### 优秀实践
- ✅ Provider 插件架构正确使用了基类模式
- ✅ 没有循环依赖
- ✅ pnpm-workspace + turbo 构建管线清晰

---

## 五、以安全第一为荣，以密钥泄露为耻 — 及格 ⭐⭐⭐

### 检查结果

| 检查项 | 结果 |
|--------|------|
| 硬编码密钥/密码 | **0 处** ✅ |
| `.env.example` 是否完整 | **是** ✅（48 行，覆盖所有 Provider） |
| 输入校验（Zod） | **所有 API 输入都有 Zod Schema** ✅ |
| SQL 注入风险 | **无**（Prisma 参数化查询） ✅ |
| XSS 风险 | **低**（Next.js + React 默认转义） ✅ |
| Rate Limiting | **部分**（仅 3 个 POST route 使用） ⚠️ |

### 🔴 严重发现：9/14 API 路由组无鉴权保护

| 路由 | 风险 |
|------|------|
| `POST /api/v1/projects` | 匿名可创建项目 |
| `GET /api/v1/projects` | 匿名可列出所有项目 |
| `GET /api/v1/datasets` | 匿名可读取数据集 |
| `POST /api/v1/datasets` | 匿名可创建数据集 |
| `GET /api/v1/experiments` | 匿名可读取实验 |
| `POST /api/v1/experiments` | 匿名可创建实验 |

**根本原因：** `middleware.ts` 只保护了 `/dashboard/*` 页面路由，**没有保护 `/api/v1/*` 路由**。API 路由需要独立的 `withApiAuth()` 包装。

### 需改进
- **P0：** 为所有 `/api/v1/*` 路由添加 `withApiAuth()` 鉴权
- `webhook/route.ts` 的 secret 检查是可选的（`if (webhookSecret && ...)`），应改为强制校验
- Rate limiting 只应用于 3 个 POST route，应扩展到所有 API route
- `.env` 文件中存在真实 AUTH_SECRET 但已在 `.gitignore` 中，确认不会被提交

---

## 六、以文档齐全为荣，以没人看得懂为耻 — 优秀 ⭐⭐⭐⭐⭐

| 指标 | 数值 |
|------|------|
| 文档总页数 | **40** |
| 文档总行数 | **22,000+** |
| Wiki 页面 | **22** |
| 每个 Example 的 README | **14/14** ✅ |
| 公开 API 的参数文档 | **完整** ✅ |
| Diátaxis 结构 | **已实施** ✅ |

---

## 七、以持续集成为荣，以手动操作为耻 — 良好 ⭐⭐⭐⭐

| 指标 | 数值 |
|------|------|
| GitHub Actions 工作流 | **3 个**（ci.yml、agentbench-ci.yml、release.yml） |
| CI 覆盖 | lint + typecheck + build + test |
| Release 自动化 | changesets + tag 触发 npm publish + Docker push |
| GitHub Pages 文档 | **已配置**（https://1304674612.github.io/agentbench/） |
| NPM 发布 | **未完成**（需 `npm login`） |

### 需改进
- CI 工作流中缺少对新 Provider 包的集成测试
- 没有 pre-commit hook 运行 lint（husky 已安装但未配置 lint-staged 规则）

---

## 八、以性能优化为荣，以资源浪费为耻 — 良好 ⭐⭐⭐⭐

### 检查结果
- ✅ Token 计数使用 tiktoken + 启发式回退，避免每次调 API
- ✅ Replay 模式实现零 LLM 成本回归测试
- ✅ 构建产物使用 ESM + tree-shaking，按需加载 Provider
- ✅ Turbo 构建缓存正确配置
- ⚠️ `dataset.ts` (1013 行) 中大文件解析没有流式处理——大 JSON 文件会全部加载到内存

---

## 总评

| 维度 | 评级 | 关键发现 |
|------|------|---------|
| 类型安全 | 良好 ⭐⭐⭐⭐ | 45 处 `any`（0.11%），CLI + provider-utils 零 any |
| 测试覆盖 | **不及格** ⭐ | 15/15 包缺测试（仅 core 有），~6,250 行无测试代码 |
| 错误处理 | **及格** ⭐⭐⭐ | **11 处吞异常**，~20 个 API route 未用统一错误处理 |
| 代码质量 | 及格 ⭐⭐⭐ | 6 类重复代码、4 处死代码、5 处命名不一致、4 个大文件 |
| 安全性 | **及格** ⭐⭐⭐ | **9/14 API route 无鉴权**、Rate Limiting 仅覆盖 3 个端点 |
| 文档 | 优秀 ⭐⭐⭐⭐⭐ | 40 页、22,000+ 行、Diátaxis 结构、Wiki 22 页 |
| CI/CD | 良好 ⭐⭐⭐⭐ | 3 个 workflow、changesets 自动化 |
| 性能 | 良好 ⭐⭐⭐⭐ | tiktoken 缓存、replay 零成本、ESM tree-shaking |

### 🔴 P0 改进项（本周必做）

1. **API 鉴权漏洞** — 为所有 `/api/v1/*` 路由添加 `withApiAuth()`。当前 9/14 路由组完全无保护
2. **吞异常修复** — 11 处空 catch 块，尤其是 auth/register、health/check、notifications
3. **补测试** — `@agentbench/config`（1,021 行）和 `@agentbench/provider-utils`（1,310 行）作为基础设施包，必须优先补测试
4. **Provider 重复代码消除** — 将 `countTokens`、`calculateCost`、`adaptParams`、`healthCheck` 提升到 `OpenAICompatibleProvider` 基类

### 🟡 P1 改进项（下个迭代）

5. **apps/web `any` 类型** — 39 处 `any` 逐步替换为 `unknown` + Zod parse
6. **统一错误处理** — 约 20 个 API route 改用 `handleApiError()`
7. **大文件拆分** — `dataset.ts`（1,013）、`test.ts`（923）、`benchmark.ts`（877）、`openai/index.ts`（867）
8. **命名统一** — `AgentBenchXxx` vs `XxxProvider`，`createXxxClient` vs `createXxxProvider`
9. **Rate Limiting 扩展** — 从 3 个 POST route 扩展到所有 API route
10. **新 Provider 测试** — 至少补齐 mock 测试

### 🟢 P2 改进项（v0.4 之前）

11. **内存优化** — Dataset 大文件流式解析
12. **统一 tsup.config.ts** — 提取共享构建配置到 `typescript-config/`
13. **死代码清理** — 旧 Example 目录结构统一、过时注释删除
14. **NPM 发布** — 登录并发布所有 `@agentbench/*` 包
15. **CI 强化** — 添加 Provider 集成测试、配置 lint-staged pre-commit hook
