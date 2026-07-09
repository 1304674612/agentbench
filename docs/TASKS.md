# AgentBench — Task List

## Phase 0: Foundation (Week 1)

### Task 0.1: Initialize Monorepo
- [ ] 0.1.1 Create root `package.json` with pnpm workspace config
- [ ] 0.1.2 Create `pnpm-workspace.yaml`
- [ ] 0.1.3 Create `turbo.json` with pipeline configuration
- [ ] 0.1.4 Create `.npmrc` with pnpm settings
- [ ] 0.1.5 Create `.gitignore`
- [ ] 0.1.6 Initialize git repository

### Task 0.2: @agentbench/core Package
- [ ] 0.2.1 Create `packages/core/package.json`
- [ ] 0.2.2 Create `packages/core/tsconfig.json`
- [ ] 0.2.3 Create `packages/core/src/index.ts` (public API)
- [ ] 0.2.4 Create `packages/core/src/types/` — all type definitions
  - [ ] `trace.ts` — ExecutionTrace, TraceStep
  - [ ] `run.ts` — RunConfig, RunResult, RunMetrics
  - [ ] `evaluator.ts` — Evaluator types
  - [ ] `assertion.ts` — Assertion types
  - [ ] `snapshot.ts` — Snapshot types
  - [ ] `experiment.ts` — Experiment types
  - [ ] `coverage.ts` — Coverage types
  - [ ] `project.ts` — Project types
  - [ ] `dataset.ts` — Dataset types

### Task 0.3: Database Setup
- [ ] 0.3.1 Create `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- [ ] 0.3.2 Create `prisma/schema.prisma` from SCHEMA.md
- [ ] 0.3.3 Create `.env.example`
- [ ] 0.3.4 Run `docker compose up -d`
- [ ] 0.3.5 Run `pnpm db:generate` + `pnpm db:migrate`

### Task 0.4: Next.js Dashboard Scaffold
- [ ] 0.4.1 Create Next.js app `apps/web/` with create-next-app
- [ ] 0.4.2 Install dependencies: tailwindcss, shadcn/ui init
- [ ] 0.4.3 Add shadcn/ui components: Button, Card, Input, Table, Dialog, Dropdown, Tabs, Badge, Avatar, Separator, Sheet, Tooltip, Toast, Skeleton
- [ ] 0.4.4 Create layout components: Sidebar, Header, Breadcrumb
- [ ] 0.4.5 Configure dark mode (next-themes)
- [ ] 0.4.6 Create base layout with sidebar navigation
- [ ] 0.4.7 Add Inter + JetBrains Mono fonts

### Task 0.5: CLI Scaffold
- [ ] 0.5.1 Create `apps/cli/package.json` with commander.js + ink
- [ ] 0.5.2 Create `apps/cli/src/index.ts` entry point
- [ ] 0.5.3 Create `apps/cli/src/cli.ts` bootstrap
- [ ] 0.5.4 Set up build tooling (tsup)
- [ ] 0.5.5 Create `agentbench` binary in package.json

### Task 0.6: Shared Config
- [ ] 0.6.1 Create `packages/eslint-config/` shared ESLint config
- [ ] 0.6.2 Create `packages/typescript-config/` shared TS config
- [ ] 0.6.3 Configure Biome (lint + format)
- [ ] 0.6.4 Add Husky + lint-staged
- [ ] 0.6.5 Add commitlint

### Task 0.7: Docker & Deployment Config
- [ ] 0.7.1 Create `apps/web/Dockerfile`
- [ ] 0.7.2 Create `docker-compose.prod.yml`
- [ ] 0.7.3 Create GitHub Actions CI workflow

---

## Phase 1: Core Engine (Week 2-3)

### Task 1.1: Agent Runner
- [ ] 1.1.1 Implement `Runner` class in `packages/core/src/runner/`
- [ ] 1.1.2 Implement `ExecutionContext` builder
- [ ] 1.1.3 Implement `TimeoutManager`
- [ ] 1.1.4 Implement `ConcurrencyManager`
- [ ] 1.1.5 Unit tests for Runner

### Task 1.2: Execution Tracer
- [ ] 1.2.1 Implement `Tracer` class
- [ ] 1.2.2 Implement OpenAI interceptor (stream + non-stream)
- [ ] 1.2.3 Implement Anthropic interceptor (stream + non-stream)
- [ ] 1.2.4 Implement generic interceptor base class
- [ ] 1.2.5 Implement `StreamCapture` for streaming responses
- [ ] 1.2.6 Implement `ToolCapture` for tool calls
- [ ] 1.2.7 Unit tests for Tracer

### Task 1.3: Token & Cost
- [ ] 1.3.1 Implement `TokenCounter` (tiktoken)
- [ ] 1.3.2 Implement `CostCalculator` with per-model pricing
- [ ] 1.3.3 Add pricing data for OpenAI, Anthropic, Gemini, DeepSeek
- [ ] 1.3.4 Unit tests

### Task 1.4: Storage Layer
- [ ] 1.4.1 Define `StorageAdapter` interface
- [ ] 1.4.2 Implement `PostgresAdapter`
- [ ] 1.4.3 Implement `MemoryAdapter` (for testing)
- [ ] 1.4.4 Implement Run storage (CRUD)
- [ ] 1.4.5 Implement Trace storage
- [ ] 1.4.6 Implement Project storage
- [ ] 1.4.7 Unit tests for storage

### Task 1.5: Basic Web UI
- [ ] 1.5.1 Projects list page `app/(dashboard)/projects/page.tsx`
- [ ] 1.5.2 Project create dialog
- [ ] 1.5.3 Runs list page with filters
- [ ] 1.5.4 Run detail page (basic info + status)
- [ ] 1.5.5 Skeleton loading states
- [ ] 1.5.6 Empty state for no runs

### Task 1.6: Basic CLI
- [ ] 1.6.1 Implement `agentbench init` command
- [ ] 1.6.2 Implement `agentbench run` command
- [ ] 1.6.3 Implement `agentbench config` command
- [ ] 1.6.4 Output formatting (table, JSON, colored)

---

## Phase 2: Evaluation & Assertion (Week 4-5)

### Task 2.1: Rule-Based Evaluator
- [ ] 2.1.1 Implement exact_match evaluator
- [ ] 2.1.2 Implement contains evaluator
- [ ] 2.1.3 Implement regex_match evaluator
- [ ] 2.1.4 Implement json_schema evaluator
- [ ] 2.1.5 Implement tool_called / tool_not_called evaluators
- [ ] 2.1.6 Implement latency_lt / tokens_lt / cost_lt evaluators
- [ ] 2.1.7 Unit tests for all rule evaluators

### Task 2.2: LLM Judge
- [ ] 2.2.1 Implement `LLMJudge` class
- [ ] 2.2.2 Judge prompt: Correctness
- [ ] 2.2.3 Judge prompt: Faithfulness
- [ ] 2.2.4 Judge prompt: Safety
- [ ] 2.2.5 Judge prompt: Relevance
- [ ] 2.2.6 Judge prompt: Completeness
- [ ] 2.2.7 Judge prompt: Reasoning
- [ ] 2.2.8 Judge prompt: Tool Usage
- [ ] 2.2.9 Implement `JudgePool` (multi-model)
- [ ] 2.2.10 Implement score aggregation
- [ ] 2.2.11 Unit tests

### Task 2.3: Hybrid Judge
- [ ] 2.3.1 Implement hybrid rule+LLM judge
- [ ] 2.3.2 Implement majority voting across judges
- [ ] 2.3.3 Implement judge consistency scoring

### Task 2.4: Assertion Engine
- [ ] 2.4.1 Implement `AssertionBuilder` (chained API)
- [ ] 2.4.2 Implement tool matchers (toBeCalled, toBeCalledWith, toBeCalledTimes, notToBeCalled)
- [ ] 2.4.3 Implement token matchers (toBeLessThan, toBeGreaterThan)
- [ ] 2.4.4 Implement latency matchers
- [ ] 2.4.5 Implement output matchers (toContain, toMatchSnapshot, toMatchSchema)
- [ ] 2.4.6 Implement score matchers
- [ ] 2.4.7 Implement compound assertions
- [ ] 2.4.8 Unit + integration tests

### Task 2.5: Test Case Management
- [ ] 2.5.1 Test Suite CRUD API
- [ ] 2.5.2 Test Case CRUD API
- [ ] 2.5.3 Assertion CRUD API (nested under test case)
- [ ] 2.5.4 Evaluator CRUD API (nested under test case)
- [ ] 2.5.5 Web UI: Test suite list + create
- [ ] 2.5.6 Web UI: Test case editor (with assertion builder)
- [ ] 2.5.7 Web UI: Test case run button

### Task 2.6: Results UI
- [ ] 2.6.1 Run detail: Scores display (radar chart + list)
- [ ] 2.6.2 Run detail: Assertion results (pass/fail list)
- [ ] 2.6.3 Run detail: Timeline visualization (basic)
- [ ] 2.6.4 CLI: `agentbench test` command with results table

---

## Phase 3: Regression & Replay (Week 6-7)

### Task 3.1: Snapshot System
- [ ] 3.1.1 Implement `SnapshotManager.create()`
- [ ] 3.1.2 Implement `SnapshotManager.list()`
- [ ] 3.1.3 Implement `SnapshotManager.restore()`
- [ ] 3.1.4 Implement `SnapshotManager.compare()`
- [ ] 3.1.5 Snapshot API endpoints
- [ ] 3.1.6 Web UI: Snapshot list page
- [ ] 3.1.7 Web UI: Snapshot detail page
- [ ] 3.1.8 CLI: `agentbench snapshot` commands

### Task 3.2: Replay Engine
- [ ] 3.2.1 Implement deterministic replay (same seed)
- [ ] 3.2.2 Implement cross-model replay
- [ ] 3.2.3 Implement batch replay (N times)
- [ ] 3.2.4 Replay API endpoint
- [ ] 3.2.5 Web UI: Replay button + config dialog
- [ ] 3.2.6 CLI: `agentbench replay` command

### Task 3.3: Regression Detection
- [ ] 3.3.1 Implement score regression detection
- [ ] 3.3.2 Implement token regression detection
- [ ] 3.3.3 Implement latency regression detection
- [ ] 3.3.4 Implement cost regression detection
- [ ] 3.3.5 Implement regression threshold configuration
- [ ] 3.3.6 Regression notification trigger

### Task 3.4: Diff Engine
- [ ] 3.4.1 Implement text diff (prompt + output)
- [ ] 3.4.2 Implement metric diff (tokens, cost, latency)
- [ ] 3.4.3 Implement trace diff (execution path)
- [ ] 3.4.4 Diff API endpoint
- [ ] 3.4.5 Web UI: Side-by-side comparison view
- [ ] 3.4.6 Web UI: Metric comparison cards
- [ ] 3.4.7 CLI: `agentbench compare` command

---

## Phase 4: Experiment & Coverage (Week 8-9)

### Task 4.1: Experiment Platform
- [ ] 4.1.1 Implement `ExperimentEngine`
- [ ] 4.1.2 Implement variant definition + validation
- [ ] 4.1.3 Implement experiment runner (parallel variants)
- [ ] 4.1.4 Implement statistics (t-test, bootstrap, effect size)
- [ ] 4.1.5 Implement conclusion generation
- [ ] 4.1.6 Experiment CRUD API
- [ ] 4.1.7 Web UI: Experiment creation wizard
- [ ] 4.1.8 Web UI: Experiment results page (charts + conclusion)
- [ ] 4.1.9 CLI: `agentbench experiment` commands

### Task 4.2: Coverage Engine
- [ ] 4.2.1 Implement prompt variable coverage calculator
- [ ] 4.2.2 Implement workflow path coverage calculator
- [ ] 4.2.3 Implement tool call coverage calculator
- [ ] 4.2.4 Implement edge case coverage calculator
- [ ] 4.2.5 Coverage report generation
- [ ] 4.2.6 Coverage API endpoints
- [ ] 4.2.7 Web UI: Coverage dashboard (progress bars)
- [ ] 4.2.8 Web UI: Uncovered paths list with suggestions

---

## Phase 5: SDK Ecosystem (Week 10-11)

### Task 5.1: @agentbench/openai
- [ ] 5.1.1 Implement OpenAI client wrapper
- [ ] 5.1.2 Implement chat.completions interception
- [ ] 5.1.3 Implement streaming interception
- [ ] 5.1.4 Implement tool call interception
- [ ] 5.1.5 Implement `AgentBench.run()` integration
- [ ] 5.1.6 Write README + examples
- [ ] 5.1.7 Unit tests

### Task 5.2: @agentbench/anthropic
- [ ] 5.2.1 Implement Anthropic client wrapper
- [ ] 5.2.2 Implement messages.create interception
- [ ] 5.2.3 Implement streaming interception
- [ ] 5.2.4 Implement tool use interception
- [ ] 5.2.5 Write README + examples
- [ ] 5.2.6 Unit tests

### Task 5.3: @agentbench/mcp
- [ ] 5.3.1 Implement MCP client wrapper
- [ ] 5.3.2 Implement tool invocation interception
- [ ] 5.3.3 Implement resource access tracing
- [ ] 5.3.4 Write README + examples
- [ ] 5.3.5 Unit tests

### Task 5.4: Framework Adapters
- [ ] 5.4.1 @agentbench/langgraph adapter (placeholder)
- [ ] 5.4.2 @agentbench/crewai adapter (placeholder)
- [ ] 5.4.3 Generic adapter for custom agents
- [ ] 5.4.4 Adapter documentation

---

## Phase 6: Platform Features (Week 12-13)

### Task 6.1: Dataset Management
- [ ] 6.1.1 Dataset CRUD API
- [ ] 6.1.2 CSV import with parsing
- [ ] 6.1.3 JSON/JSONL import
- [ ] 6.1.4 Dataset export (all formats)
- [ ] 6.1.5 Dataset split (train/test/validation)
- [ ] 6.1.6 Web UI: Dataset list + detail pages
- [ ] 6.1.7 Web UI: Dataset import dialog

### Task 6.2: CI/CD Integration
- [ ] 6.2.1 GitHub Actions workflow template
- [ ] 6.2.2 GitLab CI template
- [ ] 6.2.3 Webhook endpoint
- [ ] 6.2.4 CI status badge generation
- [ ] 6.2.5 PR comment integration

### Task 6.3: Authentication & API Keys
- [ ] 6.3.1 NextAuth.js configuration
- [ ] 6.3.2 Sign-in / Sign-up pages
- [ ] 6.3.3 OAuth providers (Google, GitHub)
- [ ] 6.3.4 API Key CRUD
- [ ] 6.3.5 API Key authentication middleware
- [ ] 6.3.6 API Key scope enforcement

### Task 6.4: Team & Notifications
- [ ] 6.4.1 Organization CRUD
- [ ] 6.4.2 Team member management
- [ ] 6.4.3 Role-based access (owner/admin/member/viewer)
- [ ] 6.4.4 Notification system (in-app)
- [ ] 6.4.5 Email notification (optional)
- [ ] 6.4.6 Web UI: Notification center (bell icon + dropdown)

### Task 6.5: Reports
- [ ] 6.5.1 JSON report generation
- [ ] 6.5.2 HTML report generation
- [ ] 6.5.3 Markdown report generation
- [ ] 6.5.4 JUnit XML report generation
- [ ] 6.5.5 Report scheduling
- [ ] 6.5.6 Report download endpoint

---

## Phase 7: Polish & Release (Week 14-15)

### Task 7.1: Dashboard
- [ ] 7.1.1 Statistics cards (pass rate, total runs, avg score, issues)
- [ ] 7.1.2 Regression trend chart (line)
- [ ] 7.1.3 Score distribution chart (histogram)
- [ ] 7.1.4 Latency percentile chart (P50/P95/P99)
- [ ] 7.1.5 Cost trend chart
- [ ] 7.1.6 Failure categories chart (pie)
- [ ] 7.1.7 Model comparison chart (radar)
- [ ] 7.1.8 Recent runs table
- [ ] 7.1.9 Real-time data refresh (TanStack Query polling/revalidation)

### Task 7.2: Advanced UI
- [ ] 7.2.1 Timeline visualization (interactive, zoomable)
- [ ] 7.2.2 Step detail panel (expandable)
- [ ] 7.2.3 Command K menu (⌘K)
- [ ] 7.2.4 Keyboard shortcuts
- [ ] 7.2.5 Breadcrumb navigation
- [ ] 7.2.6 Loading skeletons (all pages)
- [ ] 7.2.7 Empty states (all pages)
- [ ] 7.2.8 Error states + error recovery
- [ ] 7.2.9 404 + 500 pages
- [ ] 7.2.10 Toast notifications for actions

### Task 7.3: Performance & SEO
- [ ] 7.3.1 Image optimization
- [ ] 7.3.2 Code splitting audit
- [ ] 7.3.3 Bundle size optimization
- [ ] 7.3.4 Server component optimization
- [ ] 7.3.5 SEO metadata (all pages)
- [ ] 7.3.6 OpenGraph + Twitter cards
- [ ] 7.3.7 Sitemap generation

### Task 7.4: Landing Page
- [ ] 7.4.1 Hero section
- [ ] 7.4.2 Features section
- [ ] 7.4.3 How it works section
- [ ] 7.4.4 Code examples / demo
- [ ] 7.4.5 Pricing section
- [ ] 7.4.6 Testimonials placeholder
- [ ] 7.4.7 CTA + Footer

### Task 7.5: Documentation
- [ ] 7.5.1 README.md (comprehensive, with badges)
- [ ] 7.5.2 Getting Started guide
- [ ] 7.5.3 Configuration reference
- [ ] 7.5.4 CLI reference
- [ ] 7.5.5 API reference
- [ ] 7.5.6 SDK guides (OpenAI, Anthropic, MCP)
- [ ] 7.5.7 Deployment guide (Docker, self-hosted)
- [ ] 7.5.8 Contributing guide
- [ ] 7.5.9 Changelog

### Task 7.6: Examples
- [ ] 7.6.1 Example: Customer Support Agent
- [ ] 7.6.2 Example: Code Review Agent
- [ ] 7.6.3 Example: Research Agent
- [ ] 7.6.4 Seed data for demo

### Task 7.7: Release
- [ ] 7.7.1 Version bump to v1.0.0
- [ ] 7.7.2 GitHub Release with release notes
- [ ] 7.7.3 Docker image publish
- [ ] 7.7.4 npm publish (@agentbench/core, SDKs)
- [ ] 7.7.5 Product Hunt listing preparation
- [ ] 7.7.6 Social media announcement content

---

## Priority Legend

| Label | Meaning |
|-------|---------|
| 🔴 P0 | Must have for MVP (M0-M3) |
| 🟡 P1 | Important for Beta (M4-M5) |
| 🟢 P2 | Nice to have for GA (M6-M7) |
| ⚪ P3 | Future / Post-launch |

---

> **Next**: Start Phase 0 — Project Initialization
