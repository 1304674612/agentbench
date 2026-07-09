<img src="https://img.shields.io/badge/AgentBench-v0.1.0-indigo?style=flat-square" alt="Version" /> <img src="https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square" alt="License" /> <img src="https://img.shields.io/badge/Status-Alpha-orange?style=flat-square" alt="Status" />

# AgentBench

**The Regression Testing Framework for AI Agents.**

AgentBench brings the rigor of software testing — replay, evaluate, compare, assert, regression test — to the world of AI Agents. Think _Playwright + Jest + LangSmith_, purpose-built for AI Agent developers.

> **Status**: Alpha (v0.1.0) — Active development. See [Roadmap](docs/ROADMAP.md).

---

## Why AgentBench?

AI Agents are **unpredictable**. A prompt change, a model upgrade, or a tool swap can silently break your agent's behavior. Today, most developers validate agent quality by manually clicking around — that doesn't scale.

AgentBench makes agent verification **repeatable, automatable, and CI-friendly**.

| Without AgentBench | With AgentBench |
|---|---|
| "I think the prompt is better now" | _Score improved from 7.2 → 9.1 (+26%)_ |
| Manual testing after every change | `agentbench test` in CI |
| No idea if GPT-5 breaks your agent | Cross-model replay catches regressions |
| "Why did the agent do that?" | Full execution trace with timeline |

---

## Core Features

- 🔄 **Agent Runner** — Execute agents, capture full execution traces
- ⏱️ **Timeline Visualization** — See every LLM call, tool invocation, and response
- ♻️ **Replay** — Replay any run with different models, prompts, or temperatures
- 📸 **Snapshot** — Save full agent context (prompt, model, tools, memory)
- ⚖️ **Diff** — Compare runs side-by-side (outputs, tokens, cost, latency)
- 📊 **Evaluation** — Rule-based + LLM-as-Judge across 8 dimensions
- ✅ **Assertion** — Programmatic assertions on agent behavior
- 🧪 **Regression Testing** — Catch agent behavior changes automatically
- 🧬 **A/B Experiments** — Compare prompts, models, or workflows statistically
- 🛡️ **Coverage** — Measure prompt, workflow, tool, and edge case coverage
- 💻 **CLI** — First-class command-line interface
- 🖥️ **Dashboard** — Modern web UI (dark-first, Linear-inspired)
- 🔌 **Multi-SDK** — Native support for OpenAI, Anthropic, MCP (LangGraph, CrewAI coming)

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** (for PostgreSQL + Redis)

### 1. Clone & Install

```bash
git clone https://github.com/agentbench/agentbench.git
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
# Edit .env with your settings
pnpm db:generate
pnpm db:migrate
```

### 4. Start Development

```bash
pnpm dev
```

- **Dashboard**: http://localhost:3000
- **CLI**: `pnpm --filter agentbench exec agentbench --help`

---

## Project Structure

```
agentbench/
├── apps/
│   ├── web/              # Next.js Dashboard (App Router)
│   └── cli/              # CLI Tool (commander.js)
├── packages/
│   ├── core/             # @agentbench/core — Engine
│   │   ├── runner/       # Agent Runner
│   │   ├── tracer/       # Execution Tracer
│   │   ├── evaluator/    # Evaluation Engine
│   │   ├── assertion/    # Assertion System
│   │   ├── diff/         # Diff Engine
│   │   ├── replay/       # Replay Engine
│   │   ├── coverage/     # Coverage Analysis
│   │   ├── experiment/   # A/B Testing
│   │   ├── snapshot/     # Snapshot Manager
│   │   ├── reporter/     # Report Generator
│   │   ├── storage/      # Storage Abstraction
│   │   └── types/        # Core TypeScript Types
│   ├── typescript-config/# Shared TS Config
│   └── (future SDKs)     # @agentbench/openai, /anthropic, /mcp
├── docs/                 # Architecture, Schema, Roadmap, Tasks
├── docker-compose.yml    # PostgreSQL + Redis
└── turbo.json            # Turborepo config
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI | Radix UI, Framer Motion, Recharts |
| Database | PostgreSQL 16 + Prisma |
| Cache/Queue | Redis + BullMQ |
| CLI | Commander.js, Chalk, Ora |
| Auth | NextAuth.js v5 |
| Monorepo | pnpm workspaces + Turborepo |
| Quality | Biome, Husky |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/SCHEMA.md)
- [Roadmap](docs/ROADMAP.md)
- [Task List](docs/TASKS.md)

---

## Development

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm dev

# Build all packages
pnpm build

# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm typecheck

# Database
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:studio      # Open Prisma Studio
```

---

## License

Apache 2.0 © AgentBench

---

> Built for AI Agent developers, by AI developers.
