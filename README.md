<div align="center">

# AgentBench

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![TypeScript](https://img.shields.io/badge/TS_Errors-0-emerald?style=flat-square)](.)
[![E2E](https://img.shields.io/badge/E2E_Tests-95%25-emerald?style=flat-square)](.)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**The Regression Testing Framework for AI Agents**

*Replay · Evaluate · Compare · Assert · Catch Regressions — in CI.*

[English](README.md) | [中文](README_CN.md) | [Roadmap](docs/ROADMAP.md) | [Architecture](docs/ARCHITECTURE.md)

</div>

---

## ⚠️ Important Notice

- **🧪 Alpha Status**: AgentBench is in active development (v0.1.0). APIs may change before v1.0.0. See [Roadmap](docs/ROADMAP.md) for planned features.
- **🔑 LLM Costs**: Running evaluations and judges will consume API tokens and incur costs. Configure spending limits and choose cost-effective judge models.
- **📊 Early Feedback**: We welcome issues, PRs, and discussions. Your feedback during alpha directly shapes the roadmap.

---

## Overview

AgentBench brings the rigor of software testing — **replay, evaluate, compare, assert, regression test** — to AI Agents. Think _Playwright + Jest + LangSmith_, purpose-built for AI agent developers.

AI Agents are unpredictable. A prompt change, a model upgrade, or a tool swap can silently break your agent's behavior. Most teams validate agent quality by manually clicking around — that doesn't scale. AgentBench makes agent verification **repeatable, automatable, and CI-friendly**.

---

## Features

- **🔄 Agent Runner** — Execute agents and capture full, step-by-step execution traces
- **⏱️ Execution Tracer** — Transparently intercept OpenAI, Anthropic, and MCP calls with timing and token data
- **📊 Evaluation Engine** — Rule-based evaluators (14 rules) + LLM-as-Judge across 8 quality dimensions (correctness, faithfulness, safety, relevance, completeness, reasoning, conciseness, tool usage)
- **✅ Assertion DSL** — Chained, Jest-like API: `expect(run).tool("search").toBeCalled().tokens().toBeLessThan(4096).run()`
- **♻️ Replay Engine** — Deterministic and cross-model replay to catch regressions when models change
- **📸 Snapshots** — Save complete agent state (prompt, model, tools, memory) for later comparison
- **⚖️ Diff Engine** — Side-by-side comparison of outputs, tokens, cost, latency, and execution paths
- **🧬 A/B Experiments** — Compare prompts, models, or workflows with statistical rigor (t-test, bootstrap)
- **🛡️ Coverage Analysis** — Measure prompt variable, workflow path, tool call, and edge-case coverage
- **📄 Report Generation** — Export results as JSON, Markdown, HTML, and JUnit XML for CI integration
- **💻 CLI** — First-class command-line interface with colored output and structured formatting
- **🖥️ Dashboard** — Modern dark-first web UI (Linear-inspired) for monitoring and management

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** (for PostgreSQL + Redis)

### 1. Clone & Install

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

### 3. Set Up Database

```bash
cp .env.example .env
pnpm db:generate
pnpm db:migrate
```

### 4. Launch

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| 🖥️ Dashboard | http://localhost:3000 |
| 💻 CLI | `pnpm --filter agentbench exec agentbench --help` |

---

## CLI Usage

```bash
# Initialize AgentBench in your project
agentbench init

# Run an agent and capture its trace
agentbench run \
  --project <project-id> \
  --name "GPT-4o baseline" \
  --provider openai \
  --model gpt-4o

# Evaluate a run against rules
agentbench evaluate <run-id> \
  --tool "search" \
  --contains "answer" \
  --latency-lt 5000 \
  --tokens-lt 4096 \
  --verbose

# Run a test suite
agentbench test \
  --project <project-id> \
  --suite <suite-id> \
  --grep "customer-support" \
  --verbose

# Compare two runs
agentbench compare <run-a-id> <run-b-id> --format table

# Replay a run with a different model
agentbench replay <run-id> --model claude-sonnet-5

# Generate a report
agentbench report <run-id> --format markdown
```

---

## Assertion DSL

Write assertions as naturally as you write tests. The chained API reads like English:

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                     // Agent finished successfully
  .tool("search_docs").toBeCalled()             // Called the right tool
  .tool("search_docs").toBeCalledWith({         // Called with correct args
    query: "refund policy"
  })
  .tool("hallucinate").not.toBeCalled()         // No forbidden tools
  .output().toContain("30 days")                // Output has correct information
  .output().toMatchRegex(/refund.*policy/i)     // Pattern validation
  .tokens().toBeLessThan(4096)                  // Token budget respected
  .latency().toBeLessThan(5000)                 // Under 5 seconds
  .score("correctness").toBeGreaterThan(7)      // Quality threshold
  .score("safety").toBeGreaterThan(8)           // Safety threshold
  .run()

if (!result.allPassed) {
  console.error(`${result.failed} assertion(s) failed!`)
  process.exit(1)
}
```

### Available Matchers

| Category | Matchers |
|----------|----------|
| **Tool** | `toBeCalled()`, `toBeCalledWith()`, `toBeCalledTimes()`, `not.toBeCalled()` |
| **Tokens** | `toBeLessThan()`, `toBeGreaterThan()`, `toBeBetween()` |
| **Latency** | `toBeLessThan()`, `toBeGreaterThan()`, `firstToken().toBeLessThan()` |
| **Output** | `toContain()`, `not.toContain()`, `toEqual()`, `toMatchRegex()`, `toMatchSchema()`, `toMatchSnapshot()` |
| **Score** | `toBeGreaterThan()`, `toBeLessThan()`, `toBeBetween()` |
| **Status** | `toBeCompleted()`, `toBe("passed")` |
| **Compound** | `all()`, `any()` |

---

## Evaluation System

### Rule-Based Evaluators (14 rules)

`exact_match` · `contains` · `regex_match` · `json_schema` · `tool_called` · `tool_not_called` · `tool_called_with` · `tool_called_times` · `status_code` · `latency_lt` · `tokens_lt` · `tokens_gt` · `cost_lt` · `cost_gt`

### LLM-as-Judge (8 dimensions)

| Dimension | What It Measures |
|-----------|-----------------|
| `correctness` | Factual accuracy vs expected answer |
| `faithfulness` | Grounding in source — no hallucinations |
| `safety` | Harmful content, disclaimers, PII |
| `relevance` | On-topic, answers the actual question |
| `completeness` | Covers all aspects, no gaps |
| `reasoning` | Logical flow, valid conclusions |
| `conciseness` | No filler, no repetition |
| `tool_usage` | Right tools, efficient calls |

### Hybrid Judge

Combine rules and LLM judges with configurable strategies: `rule_first` · `llm_first` · `parallel`. Multi-judge voting with `majority` / `unanimous` / `weighted` consensus.

---

## Project Structure

```
agentbench/
├── apps/
│   ├── web/                 # Next.js Dashboard (App Router)
│   └── cli/                 # CLI Tool (commander.js)
├── packages/
│   ├── core/                # @agentbench/core — Engine
│   │   ├── runner/          # Agent Runner
│   │   ├── tracer/          # Execution Tracer + Interceptors
│   │   ├── evaluator/       # Rule + LLM + Hybrid Judge
│   │   ├── assertion/       # Chained Assertion DSL
│   │   ├── storage/         # Storage Adapter Interface
│   │   ├── types/           # Core TypeScript Types
│   │   └── utils/           # Token & Cost Helpers
│   └── typescript-config/   # Shared TS Config
├── docs/                    # Architecture, Schema, Roadmap, Tasks
├── docker-compose.yml       # PostgreSQL + Redis
└── turbo.json               # Turborepo pipeline
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Radix UI · Framer Motion · Recharts |
| **Backend** | Next.js API Routes · Prisma · PostgreSQL 16 · Redis 7 |
| **CLI** | Commander.js · Chalk · Ora |
| **Language** | TypeScript 5.7+ (strict) |
| **Monorepo** | pnpm workspaces · Turborepo |
| **Quality** | Biome · Husky |
| **Infra** | Docker Compose · GitHub Actions |

---

## Roadmap

| Milestone | Version | Status |
|-----------|---------|:--:|
| M0 — Foundation | v0.1.0 | ✅ |
| M1 — Core Engine (Runner, Tracer, Storage) | v0.1.0 | ✅ |
| M2 — Evaluation & Assertion | v0.1.0 | ✅ |
| M3 — Regression & Replay (Snapshot, Diff) | v0.1.0 | ✅ |
| M4 — Experiments & Coverage | v0.1.0 | ✅ |
| M5 — SDK Ecosystem (OpenAI, Anthropic, MCP) | v0.1.0 | ✅ |
| M6 — Platform (Reports, Datasets, CI/CD) | v0.1.0 | ✅ |
| M7 — Polish & Landing Page | v0.1.0 | ✅ |
| v1.0 — Auth, Tests, Production Hardening | v1.0.0 | 🔜 Next |

→ [Full Roadmap](docs/ROADMAP.md) · [Task List](docs/TASKS.md) · [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md)

---

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Start all apps in development
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
pnpm format           # Format with Biome
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Prisma Studio
```

---

## Contributing

We welcome contributions! Check the [Roadmap](docs/ROADMAP.md) and [Task List](docs/TASKS.md) to find something to work on.

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
pnpm dev              # Start hacking
pnpm typecheck        # Verify your changes
```

---

## License

[Apache 2.0](LICENSE) © AgentBench

---

<div align="center">
  <sub>Built with ❤️ for the AI agent community. If AgentBench saves you from shipping a broken agent, give it a ⭐</sub>
</div>
