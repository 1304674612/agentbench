# AgentBench — Roadmap & Milestones

## Overview

- **Total Timeline**: 15 Weeks
- **Team Size**: 1-2 Developers (Solo/Small Team)
- **Methodology**: Milestone-driven, one module at a time
- **Quality Gate**: Each milestone requires review before proceeding

---

## Milestone 0: Foundation (Week 1)

**Goal**: Monorepo scaffolded, core package structure, database running, basic CI.

### Deliverables
- [ ] pnpm workspace + Turborepo monorepo
- [ ] `@agentbench/core` package scaffold (types, interfaces)
- [ ] PostgreSQL + Redis via Docker Compose
- [ ] Prisma schema + initial migration
- [ ] Next.js app scaffold (Tailwind + shadcn/ui)
- [ ] CLI scaffold (commander.js)
- [ ] ESLint/Biome + Prettier + Husky
- [ ] GitHub Actions CI template
- [ ] `agentbench.config.ts` spec
- [ ] `.env.example` + documentation

### Review Checklist
- `pnpm install` succeeds
- `docker compose up` brings up DB + Redis + App
- `pnpm db:migrate` runs successfully
- `pnpm dev` starts Next.js on :3000
- CLI binary prints help text

---

## Milestone 1: Core Engine (Week 2-3)

**Goal**: Agent Runner can execute, trace, and store runs.

### Week 2: Runner + Tracer
- [ ] `Runner` class — execute agent with config
- [ ] `Tracer` — intercept LLM calls, capture full trace
- [ ] `ExecutionContext` — build and manage execution context
- [ ] `TimeoutManager` — handle timeouts gracefully
- [ ] `ConcurrencyManager` — run multiple agents in parallel
- [ ] `TokenCounter` — tiktoken integration
- [ ] `CostCalculator` — per-model cost calculation
- [ ] Storage adapter interface + PostgreSQL implementation

### Week 3: Storage + Basic UI
- [ ] `RunStorage` — CRUD for runs, traces
- [ ] `ProjectStorage` — CRUD for projects
- [ ] REST API: projects, runs CRUD
- [ ] Web UI: Run list page
- [ ] Web UI: Run detail page (basic)
- [ ] CLI: `agentbench run` command
- [ ] CLI: `agentbench init` command

### Review Checklist
- Run an OpenAI agent → trace captured in DB
- Run an Anthropic agent → trace captured in DB
- Run listing shows all runs in Web UI
- Run detail shows trace steps
- CLI run command outputs summary

---

## Milestone 2: Evaluation & Assertion (Week 4-5)

**Goal**: Rule-based and LLM-as-Judge evaluation, assertion engine.

### Week 4: Evaluators
- [ ] `RuleEvaluator` — exact_match, contains, regex, json_schema, tool_called, etc.
- [ ] `LLMJudge` — OpenAI/Claude as judge
- [ ] Judge prompt templates (correctness, faithfulness, safety, relevance, completeness, reasoning)
- [ ] `JudgePool` — manage multiple judge models
- [ ] `HybridJudge` — rule-based + LLM combined
- [ ] Score storage + retrieval

### Week 5: Assertion + Test Cases
- [ ] `AssertionEngine` — all matchers (tool, token, latency, output, score)
- [ ] Assertion DSL (chained API: `expect(tool("x")).toBeCalled()`)
- [ ] TestCase model + CRUD API
- [ ] TestSuite model + CRUD API
- [ ] Web UI: Test case editor
- [ ] Web UI: Evaluation results on run detail
- [ ] CLI: `agentbench test` command

### Review Checklist
- Rule evaluator correctly validates exact_match, contains, json_schema
- LLM Judge returns scores with reasoning
- Assertion DSL compiles and runs
- Test case runs produce assertion results
- Evaluation scores display on run detail page

---

## Milestone 3: Regression & Replay (Week 6-7)

**Goal**: Snapshot, replay, regression detection, diff engine.

### Week 6: Snapshot + Replay
- [ ] `SnapshotManager` — create, list, restore snapshots
- [ ] Snapshot data model (full context serialization)
- [ ] `ReplayEngine` — replay from snapshot
- [ ] Deterministic replay (same seed)
- [ ] Cross-model replay (different model, same input)
- [ ] Batch replay (N times, aggregate stats)

### Week 7: Regression + Diff
- [ ] `RegressionDetector` — compare runs, detect regressions
- [ ] Regression thresholds (score drop, token increase, latency increase)
- [ ] `DiffEngine` — text diff (prompt, output)
- [ ] `DiffEngine` — metric diff (tokens, cost, latency)
- [ ] `DiffEngine` — trace diff (execution path comparison)
- [ ] Web UI: Run comparison/diff view
- [ ] Web UI: Replay button on run detail
- [ ] CLI: `agentbench replay`, `agentbench compare`

### Review Checklist
- Snapshot creates a restorable full context
- Replay reproduces execution (within tolerance)
- Cross-model replay works (GPT-4o → Claude)
- Regression detector flags score drops, token increases
- Diff view shows side-by-side output comparison
- Diff view shows metric comparison cards

---

## Milestone 4: Experiment & Coverage (Week 8-9)

**Goal**: A/B testing platform, coverage analysis.

### Week 8: Experiment Platform
- [ ] `ExperimentEngine` — define variants, run experiment
- [ ] Experiment configuration (prompt A vs B, model A vs B, etc.)
- [ ] `StatisticsEngine` — t-test, bootstrap, effect size
- [ ] Experiment results + conclusion generation
- [ ] Web UI: Experiment creation wizard
- [ ] Web UI: Experiment results page

### Week 9: Coverage
- [ ] `PromptCoverage` — variable combination coverage
- [ ] `WorkflowCoverage` — execution path coverage
- [ ] `ToolCoverage` — tool call coverage
- [ ] `EdgeCoverage` — boundary condition coverage
- [ ] Coverage calculation + report generation
- [ ] Web UI: Coverage dashboard
- [ ] Web UI: Uncovered paths highlighting

### Review Checklist
- Experiment runs both variants N times
- Statistics show significant difference (or not)
- Coverage shows percentage per dimension
- Uncovered paths are identified and suggested

---

## Milestone 5: SDK Ecosystem (Week 10-11)

**Goal**: Multi-framework SDK support.

### Week 10: Core SDKs (P0)
- [ ] `@agentbench/openai` — OpenAI SDK wrapper
- [ ] `@agentbench/anthropic` — Anthropic SDK wrapper
- [ ] `@agentbench/mcp` — MCP client wrapper
- [ ] SDK documentation
- [ ] Usage examples

### Week 11: Framework Adapters (P1)
- [ ] `@agentbench/langgraph` — LangGraph adapter
- [ ] `@agentbench/crewai` — CrewAI adapter (placeholder)
- [ ] `@agentbench/llamaindex` — LlamaIndex adapter (placeholder)
- [ ] Generic adapter for custom agents
- [ ] Python SDK scaffold (placeholder)

### Review Checklist
- OpenAI SDK wrapper captures all API calls
- Anthropic SDK wrapper captures all API calls
- MCP wrapper captures tool invocations
- LangGraph adapter traces workflow execution
- All SDKs have README with examples

---

## Milestone 6: Platform Features (Week 12-13)

**Goal**: Dataset management, CI/CD integration, API keys, team support.

### Week 12: Datasets + CI/CD
- [ ] Dataset CRUD + import (CSV, JSON, JSONL)
- [ ] Dataset export
- [ ] Dataset split (train/test/validation)
- [ ] GitHub Actions integration
- [ ] GitLab CI integration
- [ ] Webhook triggers
- [ ] CI status badge

### Week 13: Platform
- [ ] API Key management (create, revoke, scopes)
- [ ] Authentication (NextAuth.js — full setup)
- [ ] Team/Organization management (Pro)
- [ ] Notification system (in-app + email)
- [ ] Report export (JSON, HTML, Markdown, JUnit XML)
- [ ] Report scheduling

### Review Checklist
- Dataset import works for CSV, JSON, JSONL
- GitHub Action runs agent tests and reports status
- API Key auth works for programmatic access
- Notifications appear on run completion

---

## Milestone 7: Polish & Release (Week 14-15)

**Goal**: Production-ready quality, documentation, launch.

### Week 14: Polish
- [ ] Dashboard page (all charts, metrics, trends)
- [ ] Landing page (agentbench.dev)
- [ ] Dark mode audit
- [ ] Responsive audit
- [ ] Loading states (skeleton) all pages
- [ ] Empty states all pages
- [ ] Error states all pages
- [ ] 404 / 500 pages
- [ ] Command K (⌘K) menu
- [ ] Keyboard shortcuts
- [ ] Performance optimization
- [ ] SEO optimization

### Week 15: Documentation + Launch
- [ ] README.md (comprehensive)
- [ ] Getting Started guide
- [ ] API Reference docs
- [ ] CLI Reference docs
- [ ] SDK guides (per framework)
- [ ] Deployment guide (Docker, Vercel, self-hosted)
- [ ] Contributing guide
- [ ] Example projects (3 real-world scenarios)
- [ ] Demo video / GIFs
- [ ] GitHub Release
- [ ] Product Hunt launch preparation
- [ ] Social media announcement

### Review Checklist
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95
- README enables 5-minute setup
- All example projects run successfully
- Docker deployment works end-to-end

---

## Versioning

| Milestone | Version | Type |
|-----------|---------|------|
| M0-M3 | v0.1.0 | Alpha — Core MVP |
| M4-M5 | v0.5.0 | Beta — Feature complete |
| M6 | v0.9.0 | RC — Platform ready |
| M7 | v1.0.0 | GA — Production release |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM API instability | High | Abstract all LLM calls, support fallback judges |
| Streaming capture complexity | Medium | Start with non-streaming, add streaming later |
| Performance at scale (1000+ runs) | Medium | JSONB for traces, partition by project, use Redis cache |
| Multi-framework SDK maintenance | High | Focus on P0 (OpenAI, Anthropic, MCP), rest as community adapters |
| Competition (LangSmith, Braintrust) | Medium | Differentiate on regression testing + self-hosted + open source |

---

> **Next Step**: Task List (actionable development tasks)
