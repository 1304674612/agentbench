# Changelog

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
