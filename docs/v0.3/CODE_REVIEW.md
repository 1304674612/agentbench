# AgentBench v0.3.0 — 代码审查报告

> **审查日期：** 2026-07-10
> **审查范围：** 274 个 TypeScript 文件，39,659 行代码，15 个 Package，14 个 Example
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

## 三、以错误处理为荣，以吞掉异常为耻 — 良好 ⭐⭐⭐⭐

### 优秀实践
- ✅ **零空 catch 块** — 全项目没有 `catch {}` 吞异常的情况
- ✅ API 层有 `ApiError` 工厂函数（notFound、badRequest、unauthorized 等）
- ✅ `handleApiError()` 统一处理 ApiError、ZodError、Prisma 错误
- ✅ CLI 层有 `formatApiError()` 将错误转为用户可读的消息
- ✅ 14 个 API route 文件引用了 auth 中间件

### 需改进
- `packages/core/src/runner/` — Runner 执行错误时的错误信息可以更丰富，当前只有 `error.message`
- 部分 Provider 的 `healthCheck()` 只返回 `{ healthy: false, message }`，没有区分网络错误 vs 鉴权错误

---

## 四、以代码简洁为荣，以重复造轮子为耻 — 及格 ⭐⭐⭐

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

## 五、以安全第一为荣，以密钥泄露为耻 — 优秀 ⭐⭐⭐⭐⭐

### 检查结果

| 检查项 | 结果 |
|--------|------|
| 硬编码密钥/密码 | **0 处** ✅ |
| `.env.example` 是否完整 | **是** ✅（48 行，覆盖所有 Provider） |
| API 路由鉴权 | **14 个 route 引用了 auth** ✅ |
| 输入校验（Zod） | **所有 API 输入都有 Zod Schema** ✅ |
| SQL 注入风险 | **无**（Prisma 参数化查询） ✅ |
| XSS 风险 | **低**（Next.js + React 默认转义） ✅ |
| Rate Limiting | **已实现**（token bucket，100 req/min） ✅ |

### 优秀实践
- 没有硬编码密钥——所有 API key 通过 `process.env` 或 `.env` 文件读取
- `.env.example` 文档齐全，所有变量有注释说明
- API Key 管理页面使用软删除（revoke），不会暴露完整 key
- Prisma 使用参数化查询，无 SQL 拼接

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

| 维度 | 评级 |
|------|------|
| 类型安全 | 良好 ⭐⭐⭐⭐ |
| 测试覆盖 | **不及格** ⭐ |
| 错误处理 | 良好 ⭐⭐⭐⭐ |
| 代码质量 | 及格 ⭐⭐⭐ |
| 安全性 | 优秀 ⭐⭐⭐⭐⭐ |
| 文档 | 优秀 ⭐⭐⭐⭐⭐ |
| CI/CD | 良好 ⭐⭐⭐⭐ |
| 性能 | 良好 ⭐⭐⭐⭐ |

### 🔴 P0 改进项（本周必做）

1. **补测试** — `@agentbench/config` 和 `@agentbench/provider-utils` 作为基础设施包，必须有测试
2. **Provider 默认方法** — 将 `countTokens`、`calculateCost` 的通用实现提升到 `OpenAICompatibleProvider` 基类

### 🟡 P1 改进项（下个迭代）

3. **apps/web `any` 类型** — 39 处 `any` 逐步替换为 `unknown` + Zod parse
4. **大文件拆分** — `dataset.ts`、`test.ts`、`benchmark.ts`、`openai/index.ts`
5. **新 Provider 测试** — 至少补齐 mock 测试

### 🟢 P2 改进项（v0.4 之前）

6. **内存优化** — Dataset 大文件流式解析
7. **lint-staged** — 配置 pre-commit hook
8. **NPM 发布** — 登录并发布所有 `@agentbench/*` 包
