# AgentBench — Task List

> **Note:** This file tracked the original v0.1.0–v0.3.0 development.  
> All items below were completed. The project is now at **v0.5.1**.  
> See [ROADMAP.md](./ROADMAP.md) for current and upcoming milestones.

---

## Phase 0: Foundation ✅

### Task 0.1: Initialize Monorepo ✅
- [x] 0.1.1 Create root `package.json` with pnpm workspace config
- [x] 0.1.2 Create `pnpm-workspace.yaml`
- [x] 0.1.3 Create `turbo.json` with pipeline configuration
- [x] 0.1.4 Create `.npmrc` with pnpm settings
- [x] 0.1.5 Create `.gitignore`
- [x] 0.1.6 Initialize git repository

### Task 0.2: @agentbench/core Package ✅
- [x] 0.2.1 Create `packages/core/package.json`
- [x] 0.2.2 Create `packages/core/tsconfig.json`
- [x] 0.2.3 Create `packages/core/src/index.ts` (public API)
- [x] 0.2.4 Create `packages/core/src/types/` — all type definitions
  - [x] `trace.ts`, `run.ts`, `evaluator.ts`, `assertion.ts`, `snapshot.ts`, `experiment.ts`, `coverage.ts`, `project.ts`, `dataset.ts`

### Task 0.3: Database Setup ✅
- [x] 0.3.1 Create `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- [x] 0.3.2 Create `prisma/schema.prisma`
- [x] 0.3.3 Create `.env.example`
- [x] 0.3.4 Generate Prisma client + migrations
- [x] 0.3.5 Initial migration (0001_init)

### Task 0.4: Next.js Dashboard ✅
- [x] 0.4.1 Create Next.js app `apps/web/`
- [x] 0.4.2 Install dependencies: tailwindcss, shadcn/ui
- [x] 0.4.3 Add shadcn/ui components
- [x] 0.4.4 Create layout components: Sidebar, Header, Breadcrumb
- [x] 0.4.5 Configure dark mode

---

## Phase 1: Core Engine ✅

### Task 1.1: Agent Runner ✅
- [x] 1.1.1 Implement `Runner` class with timeout support
- [x] 1.1.2 Implement `runBatch` for concurrent execution
- [x] 1.1.3 Batch trace step persistence (N+1 fix)
- [x] 1.1.4 Config system with defaults

### Task 1.2: Execution Tracer ✅
- [x] 1.2.1 OpenAI SDK interceptor
- [x] 1.2.2 Anthropic SDK interceptor
- [x] 1.2.3 SSE streaming capture
- [x] 1.2.4 Tool call capture

### Task 1.3: Evaluator Engine ✅
- [x] 1.3.1 Rule evaluator (exact_match, contains, regex, tool_called, etc.)
- [x] 1.3.2 LLM judge (8 dimensions)
- [x] 1.3.3 Hybrid judge (rule_first, llm_first, parallel)
- [x] 1.3.4 Judge pool with voting (majority, unanimous, weighted)
- [x] 1.3.5 Statistical tests (t-test, Mann-Whitney, bootstrap, power)

### Task 1.4: Assertion Engine ✅
- [x] 1.4.1 Chainable assert builder
- [x] 1.4.2 Tool matchers (tool_called, tool_called_with, tool_called_times)
- [x] 1.4.3 Token matchers (tokens_lt, tokens_gt)
- [x] 1.4.4 Latency matchers (latency_lt)
- [x] 1.4.5 Output matchers (contains, exact_match, regex)
- [x] 1.4.6 Score matchers (score_gt)

### Task 1.5: Snapshot & Replay ✅
- [x] 1.5.1 Snapshot creation (manual, auto, CI)
- [x] 1.5.2 Snapshot restore
- [x] 1.5.3 Deterministic replay
- [x] 1.5.4 Cross-model replay

### Task 1.6: Diff & Coverage ✅
- [x] 1.6.1 Text diff engine
- [x] 1.6.2 Metric diff engine
- [x] 1.6.3 Trace diff engine
- [x] 1.6.4 Prompt/workflow/tool/edge-case coverage

### Task 1.7: Reporter ✅
- [x] 1.7.1 Terminal reporter
- [x] 1.7.2 JSON reporter
- [x] 1.7.3 HTML reporter
- [x] 1.7.4 JUnit reporter

---

## Phase 2: Providers ✅

- [x] 2.1 `@agentbench/openai` — OpenAI SDK wrapper
- [x] 2.2 `@agentbench/anthropic` — Claude SDK wrapper
- [x] 2.3 `@agentbench/provider-utils` — OpenAI-compatible base class
- [x] 2.4 `@agentbench/gemini` — Google Gemini
- [x] 2.5 `@agentbench/deepseek` — DeepSeek with reasoning
- [x] 2.6 `@agentbench/groq` — Groq LPU inference
- [x] 2.7 `@agentbench/azure-openai` — Azure OpenAI
- [x] 2.8 `@agentbench/openrouter` — OpenRouter pass-through
- [x] 2.9 `@agentbench/ollama` — Local models
- [x] 2.10 `@agentbench/mcp` — MCP client
- [x] 2.11 `@agentbench/langgraph` — LangGraph adapter
- [x] **v0.5.1**: Provider tests for DeepSeek, Groq, OpenAI, Anthropic, Gemini
- [x] **v0.5.1**: Provider consistency contract test suite

---

## Phase 3: Web Dashboard ✅

- [x] 3.1 Project management UI
- [x] 3.2 Test suite/case management UI
- [x] 3.3 Run execution and monitoring
- [x] 3.4 Trace viewer (timeline, step details)
- [x] 3.5 Score and assertion result display
- [x] 3.6 Snapshot browser
- [x] 3.7 Experiment A/B comparison
- [x] 3.8 Dataset management UI
- [x] 3.9 Coverage visualization
- [x] 3.10 Report generation
- [x] **v0.5.0**: Failure guidance + quality trends
- [x] **v0.5.1**: Error handler, notifications, email templates

---

## Phase 4: CLI & DevOps ✅

- [x] 4.1 CLI tool (init, test, run, replay, dataset)
- [x] 4.2 GitHub Actions CI workflow
- [x] **v0.5.1**: Node.js version matrix (20/22)
- [x] 4.3 GitHub Marketplace Action
- [x] 4.4 Docker Compose production deployment
- [x] 4.5 Authentication (NextAuth.js)
- [x] 4.6 Rate limiting, CORS, middleware
- [x] **v0.5.1**: BullMQ Worker entry point

---

## Phase 5: v0.5.1 Quality Improvements ✅

| # | Task | Status |
|---|------|--------|
| 5.1 | Split StorageAdapter by domain (ISP) | ✅ |
| 5.2 | N+1 query fix — batch trace step persistence | ✅ |
| 5.3 | Magic number elimination — scoring constants | ✅ |
| 5.4 | Type safety — reduce unsafe casts | ✅ |
| 5.5 | Statistical tests — Mann-Whitney, power analysis, Bonferroni | ✅ |
| 5.6 | Provider tests — OpenAI, Anthropic, Gemini, DeepSeek, Groq | ✅ |
| 5.7 | Provider consistency contract test suite | ✅ |
| 5.8 | Vitest coverage config for all packages | ✅ |
| 5.9 | DB composite indexes | ✅ |
| 5.10 | Prisma initial migration | ✅ |
| 5.11 | BullMQ Worker stub | ✅ |
| 5.12 | LangGraph state graph tracing | ✅ |
| 5.13 | Judge prompt scoring bug fix | ✅ |
| 5.14 | Architecture docs update | ✅ |
| 5.15 | ROADMAP and CHANGELOG update | ✅ |
| 5.16 | Version bump to 0.5.1 | ✅ |

---

> **Last Updated:** 2026-07-17
> **Next Phase:** v0.6.0 — Enterprise (Team workspaces, Cloud offering, SSO, Audit logging, WebSocket)
