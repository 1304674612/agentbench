# Changelog

## v0.2.0 (2026-07-10) — Production Release: From Demo to Product

This release transforms AgentBench from an alpha prototype into a production-grade product. **12 work streams** delivered simultaneously.

### 🔴 P0: Critical Foundations

**Authentication System (S1)**
- Full NextAuth.js v5 integration with Prisma adapter
- Credentials provider (email + password) with bcrypt (12 rounds)
- OAuth providers: GitHub + Google (auto-enabled when env vars set)
- Route protection middleware (`/dashboard/*` requires auth)
- Sign-in / Sign-up pages with client-side validation
- Registration API endpoint with duplicate email detection
- Session provider wrapper for client components
- Updated `auth.ts` — real NextAuth.js session check replaces mock `ab-*` prefix
- Seed admin user: `admin@agentbench.dev`

**Comprehensive Testing (S2)**
- **342 unit tests** across 14 test files (was 51 tests in 3 files)
- New test files: `runner.test.ts` (10), `tracer.test.ts` (21), `assert.test.ts` (36), `llm-judge.test.ts` (26), `snapshot-manager.test.ts` (22), `diff-engine.test.ts` (20), `replay-engine.test.ts` (22), `experiment-engine.test.ts` (29), `coverage-engine.test.ts` (20), `report-generator.test.ts` (22)
- Expanded API integration tests: 31 tests covering all endpoints
- All core engine modules now have test coverage

**Streaming Support (S3)**
- New `StreamCapture` class — SSE parsing for OpenAI, Anthropic, and generic streams
- Captures: text deltas, tool calls (accumulated by index), finish reasons, usage
- Streaming metrics: `isStreaming`, `streamChunks`, `streamLatency` (time-to-first-token)
- `Tracer.traceLLMCallStream()` — end-to-end streaming trace capture
- Updated OpenAI interceptor: detects `stream: true`, assembles chunks into full trace
- Updated Anthropic interceptor: handles `content_block_start/delta/stop` events
- SDK streaming enhanced with tee'd streams for simultaneous user + trace consumption

### 🟡 P1: Ecosystem Expansion

**Real SDK Adapters (S4)**
- New `@agentbench/langgraph` package — real LangGraph integration
- `LangGraphAdapter` class: `run()` via `.invoke()`, `stream()` via async generator
- Duck-typing design — no hard dependency on `@langchain/langgraph`
- Produces `TraceStep[]` compatible with `@agentbench/core`
- Updated `createLangGraphAdapter()` — no longer throws, delegates to real adapter
- Improved error messages for `createCrewAIAdapter()` and `createLlamaIndexAdapter()`

**Production Hardening (S5)**
- Health check endpoint: `GET /api/health` (DB + Redis checks, 200/503)
- Token bucket rate limiter: 100 req/min per API key/IP, swap-to-Redis design
- Centralized Zod schemas for all API inputs: projects, runs, suites, cases, experiments, snapshots
- CORS middleware with OPTIONS preflight + configurable origins
- `ApiError` class with factory functions (notFound, badRequest, unauthorized, forbidden, conflict, internal, tooManyRequests)
- `handleApiError()` — unified error handler for ApiError, ZodError, Prisma errors
- Enhanced API middleware: `withRateLimit()`, `withLogging()`, `withStandardMiddleware()`
- 3 key API routes updated with validation + rate limiting + error handling

**Examples & Seed Data (S6)**
- `examples/customer-support-agent/` — 9 files, 4 test suites with chained DSL assertions
- `examples/code-review-agent/` — 6 files, security review + code quality tests
- `examples/research-agent/` — 6 files, multi-step research with source verification
- `apps/web/prisma/seed.ts` — 1066 lines: admin/demo users, 3 test suites, 5 runs with traces, experiment, snapshots, dataset with 8 items

**Python SDK (S7)**
- 15 files: `agentbench` package, PyPI-ready with `pyproject.toml`
- `Runner` class — local agent execution with trace capture
- `Tracer` class — LLM call + tool call interception, cost estimation
- `AssertionBuilder` — chainable `expect()` DSL matching TypeScript API
- `AgentBench` HTTP client — sync + async methods for all API endpoints
- CLI: `agentbench run`, `agentbench test`, `agentbench init`
- OpenAI + Anthropic wrappers for automatic tracing
- **49 tests, all passing** (`pytest tests/ -v`)

### 🟢 P2: Polish & Delivery

**CLI Modularization (S8)**
- 734-line single file → 11 command modules + 4 shared libraries
- New `agentbench dev` command — polling file watcher with auto test re-run
- Progress spinners (ora) on all commands
- `--json` flag added to all commands for machine-readable output
- `--debug` flag for verbose error stacks
- Better error messages with server-unreachable suggestions

**Feature Directory Refactoring (S9)**
- 8 shared UI components: `StatusBadge`, `StatCard`, `EmptyState`, `MetricCard`, `DataTable`, `PageHeader`, `ConfirmDialog`, `CopyButton`
- 7 feature components: `StatsGrid`, `RunMetrics`, `TraceTimeline`, `ScoreCard`, `AssertionResult`, `VariantCard`, `MetricComparison`
- Loading skeletons for run detail + test pages
- Barrel export from `@/features`

**Email Notifications (S10)**
- nodemailer integration with console-fallback in development
- 4 responsive HTML email templates with AgentBench branding
- Notification service: create, mark-as-read, unread count, paginated listing
- Notification API routes: `GET/POST/PATCH /api/v1/notifications`
- `NotificationDropdown` component with bell icon, unread badge, 30s polling
- Auto-notification on run completion + regression detection

**Performance & SEO (S11)**
- SEO metadata on all 12+ pages (title, description, OpenGraph, Twitter cards)
- Dynamic `generateMetadata` for run detail pages
- OpenGraph image API: `GET /api/og` with gradient + title
- `sitemap.ts` + `robots.ts` for search engines
- `manifest.json` for PWA behavior
- Bundle optimization: `optimizePackageImports` for lucide, radix, recharts
- Production console removal (keep error/warn)

**Publishing Infrastructure (S12)**
- All 5 packages build to `dist/` with ESM + declarations + sourcemaps
- `@agentbench/core` tsup config: 13 subpath entries (was 5)
- Changesets configured with linked packages + public access
- Multi-stage Dockerfile for web app (Node 20 Alpine, standalone output)
- `docker-compose.prod.yml` with health checks
- GitHub Actions `release.yml` — tag-driven npm publish + Docker push to ghcr.io
- `.dockerignore` for clean builds

### 📊 Stats (v0.1.0 → v0.2.0)

| Metric | v0.1.0 | v0.2.0 |
|--------|--------|--------|
| Tests | 51 | **391+** |
| Test files | 3 | **17** |
| CLI files | 1 | **16** |
| Shared UI components | 3 | **11** |
| Feature components | 0 | **7** |
| Examples | 0 | **3** (21 files) |
| Python support | None | Full SDK (49 tests) |
| Auth | Mock (ab-*) | NextAuth.js + OAuth |
| Streaming | Not supported | Full SSE capture |
| Publishable packages | 0 | **5** |
| Docker support | DB only | Full production |
| Rate limiting | None | Token bucket |
| Health check | None | `/api/health` |
| Notifications | Schema only | Full email + in-app |
| SEO | None | Full metadata + OG + sitemap |

---

## v0.1.0 (2026-07-09) — Initial Alpha Release

### 🎉 First Public Release

AgentBench v0.1.0 is the first public alpha — a complete regression testing framework for AI agents, built over 7 milestones.

### ✨ Features

**Core Engine**
- Agent Runner with execution context, timeout, and concurrency management
- Execution Tracer with OpenAI, Anthropic, and generic interceptors
- Token counting (heuristic) and cost calculation for 15+ models
- Storage abstraction (PostgreSQL + in-memory) via Prisma

**Evaluation & Assertion**
- 14 rule-based evaluators (exact match, contains, regex, JSON schema, tool checks, metrics)
- LLM-as-Judge across 8 dimensions (correctness, faithfulness, safety, relevance, completeness, reasoning, conciseness, tool usage)
- Hybrid Judge with rule_first/llm_first/parallel strategies
- Chained Assertion DSL: `expect(run).tool().tokens().latency().output().score().run()`

**Regression & Replay**
- Snapshot Manager (create, list, restore, compare)
- Replay Engine (deterministic, cross-model, batch)
- Regression Detection (score, token, latency, cost thresholds)
- Diff Engine (text, metric, trace, score comparison)

**Experiments & Coverage**
- A/B Experiment Engine (t-test, bootstrap, Cohen's d effect size)
- Coverage Analysis (prompt, workflow, tool, edge-case dimensions)

**SDK Ecosystem**
- `@agentbench/openai` — OpenAI wrapper with automatic tracing
- `@agentbench/anthropic` — Anthropic Claude wrapper with tracing
- `@agentbench/mcp` — MCP client wrapper for tool calls
- `@agentbench/adapter` — Generic adapter for LangGraph, CrewAI, LlamaIndex

**Platform**
- Report generation (JSON, Markdown, HTML, JUnit XML)
- Dataset management (CSV/JSON/JSONL import, train/test/validation split)
- CI/CD: GitHub Actions workflow + webhook endpoint
- 18 REST API endpoints with Zod validation

**Web Dashboard**
- Dark-first Linear-inspired UI (Next.js 15 + Radix + Tailwind v4)
- Landing page with code demo and feature grid
- Dashboard with real-time stats and pass/fail distribution
- Run detail with scores, assertion results, and execution timeline
- Test suites & cases management
- Experiments listing with variant previews
- Coverage dashboard with dimension progress bars
- Compare page for side-by-side run analysis
- Snapshot listing with metadata

**CLI**
- 8 commands: init, run, test, evaluate, replay, compare, snapshot, report
- Colored output with chalk, progress spinners with ora
- JSON and table output formats

**Quality**
- TypeScript strict mode across all packages (0 errors)
- 97 source files, ~14,500 lines of code
- E2E tested at 95% pass rate
- 4 documentation files (Architecture, Schema, Roadmap, Deployment)

### 🏗️ Architecture

```
agentbench/
├── apps/
│   ├── web/          Next.js 15 Dashboard + API
│   └── cli/          Commander.js CLI
├── packages/
│   ├── core/         @agentbench/core (Engine)
│   ├── openai/       @agentbench/openai
│   ├── anthropic/    @agentbench/anthropic
│   ├── mcp/          @agentbench/mcp
│   ├── adapter/      @agentbench/adapter
│   └── typescript-config/
├── docs/             Architecture, Schema, Roadmap, Deployment
└── .github/          CI workflow
```

### 📊 Stats

| Metric | Value |
|--------|-------|
| TypeScript Files | 97 |
| Lines of Code | 14,500 |
| Packages | 8 |
| API Endpoints | 18 |
| CLI Commands | 8 |
| TS Errors | 0 |
| E2E Test Coverage | 95% |

### 🔜 Roadmap to v1.0

- [ ] Unit tests for core engine modules
- [ ] Integration tests for all API routes
- [ ] Full NextAuth.js authentication
- [ ] Rate limiting
- [ ] Real LLM integration tests
- [ ] Performance benchmarking
- [ ] Community contribution guide

---

## Versioning

AgentBench follows [Semantic Versioning](https://semver.org/).

| Stage | Version Pattern |
|-------|----------------|
| Alpha | v0.1.x — Feature development |
| Beta | v0.5.x — Feature complete, stabilization |
| RC | v0.9.x — Release candidate |
| GA | v1.0.0 — Production ready |
