<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/AgentBench-v0.1.0-7c3aed?style=for-the-badge&logo=robot&logoColor=white&labelColor=1e1b4b">
    <img src="https://img.shields.io/badge/AgentBench-v0.1.0-7c3aed?style=for-the-badge&logo=robot&logoColor=white&labelColor=1e1b4b" alt="AgentBench">
  </picture>
</p>

<h1 align="center">
  <samp>🧪</samp> AgentBench
</h1>

<p align="center">
  <b>The Regression Testing Framework for AI Agents.</b><br/>
  <sub>Replay · Evaluate · Compare · Assert · Catch Regressions — in CI.</sub>
</p>

<p align="center">
  <a href="https://github.com/1304674612/agentbench/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square&logo=apache&logoColor=white" alt="License"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/status-alpha-orange?style=flat-square" alt="Status"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"/>
  </a>
</p>

<br/>

> [!IMPORTANT]
> **Alpha (v0.1.0)** — Phase 2 complete. Phase 3 (Regression & Replay) in progress. [→ Roadmap](docs/ROADMAP.md)

---

## ✨ Why AgentBench?

AI Agents are **unpredictable**. A prompt tweak, a model upgrade, or a tool swap can silently degrade your agent. Most teams "test" by clicking around — that doesn't scale.

AgentBench gives you the same rigor for your agents that you expect for your code.

<table>
<tr>
<td width="50%">

### ❌ Without AgentBench
- _"I think the prompt is better now"_
- Manual spot-checking, easily miss regressions
- No idea if Claude → GPT breaks behavior
- Can't reproduce or bisect agent failures
- Zero CI integration — pray and deploy

</td>
<td width="50%">

### ✅ With AgentBench
- _Score improved 7.2 → 9.1 (+26%) ✓_
- Automated test suites with assertions
- Cross-model replay catches drift instantly
- Full execution trace — every call, every tool use
- `agentbench test` in CI — ship with confidence

</td>
</tr>
</table>

---

## 🎯 What It Does

<table align="center">
<tr>
<td align="center" width="25%">
  <h3>🔄</h3>
  <b>Agent Runner</b><br/>
  <sub>Execute agents, capture<br/>full execution traces</sub>
</td>
<td align="center" width="25%">
  <h3>⚖️</h3>
  <b>Evaluation</b><br/>
  <sub>Rule-based + LLM-as-Judge<br/>across 8 dimensions</sub>
</td>
<td align="center" width="25%">
  <h3>✅</h3>
  <b>Assertions</b><br/>
  <sub>Chained DSL — expect,<br/>tool, output, score, tokens</sub>
</td>
<td align="center" width="25%">
  <h3>♻️</h3>
  <b>Replay & Diff</b><br/>
  <sub>Deterministic + cross-model<br/>replay, side-by-side diff</sub>
</td>
</tr>
<tr>
<td align="center" width="25%">
  <h3>📸</h3>
  <b>Snapshots</b><br/>
  <sub>Save complete agent state<br/>for later comparison</sub>
</td>
<td align="center" width="25%">
  <h3>🧬</h3>
  <b>A/B Experiments</b><br/>
  <sub>Compare prompts & models<br/>with statistical rigor</sub>
</td>
<td align="center" width="25%">
  <h3>🛡️</h3>
  <b>Coverage</b><br/>
  <sub>Prompt, tool, workflow<br/>& edge-case coverage</sub>
</td>
<td align="center" width="25%">
  <h3>📊</h3>
  <b>Reports & CI</b><br/>
  <sub>JSON, Markdown, JUnit —<br/>GitHub Actions native</sub>
</td>
</tr>
</table>

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** ≥ 20 &nbsp;·&nbsp; **pnpm** ≥ 9 &nbsp;·&nbsp; **Docker**

### 1. Clone & Install

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d    # PostgreSQL + Redis
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

| | URL |
|---|---|
| 🖥️ Dashboard | [http://localhost:3000](http://localhost:3000) |
| 💻 CLI | `pnpm --filter agentbench exec agentbench --help` |

---

## 🧪 30-Second Demo

```bash
# 1. Initialize
agentbench init

# 2. Run an agent & capture its trace
agentbench run \
  --project <project-id> \
  --name "GPT-4o baseline" \
  --provider openai \
  --model gpt-4o

# 3. Evaluate the run against rules
agentbench evaluate <run-id> \
  --tool "search" \
  --contains "answer" \
  --latency-lt 5000 \
  --tokens-lt 4096 \
  --verbose

# 4. Run a test suite with assertions
agentbench test \
  --project <project-id> \
  --grep "customer-support" \
  --verbose

# ✅ 8 passed  ✗ 1 failed  ⚠ 0 errors
```

---

## 🔌 Assertion DSL

Write assertions for your agents as naturally as you write tests:

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                     // Agent finished
  .tool("search_docs").toBeCalled()             // Called the right tool
  .tool("search_docs").toBeCalledWith({         // With correct args
    query: "refund policy"
  })
  .tool("hallucinate").not.toBeCalled()         // No forbidden tools
  .output().toContain("30 days")                // Output has correct info
  .output().toMatchRegex(/refund.*policy/i)     // Pattern check
  .tokens().toBeLessThan(4096)                  // Budget respected
  .latency().toBeLessThan(5000)                 // Under 5 seconds
  .score("correctness").toBeGreaterThan(7)      // Quality threshold
  .score("safety").toBeGreaterThan(8)           // Safety threshold
  .run()

if (!result.allPassed) {
  console.error(`${result.failed} assertion(s) failed!`)
  process.exit(1)
}
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────┐
│                AgentBench                   │
├────────────────────────────────────────────┤
│  📱 Web Dashboard (Next.js 15)              │
│  💻 CLI (Commander + Chalk)                 │
│  🔌 SDKs (OpenAI · Anthropic · MCP)        │
├────────────────────────────────────────────┤
│       @agentbench/core (Engine)             │
│  ┌──────────┬──────────┬──────────────┐    │
│  │  Runner  │  Tracer  │  Evaluator   │    │
│  │  Replay  │  Diff    │  Assertion   │    │
│  │ Snapshot │ Coverage │  Experiment  │    │
│  │ Reporter │  Storage │  Types       │    │
│  └──────────┴──────────┴──────────────┘    │
├────────────────────────────────────────────┤
│  🗄️  PostgreSQL 16  ·  ⚡ Redis  ·  🐳 Docker│
└────────────────────────────────────────────┘
```

```
agentbench/
├── apps/
│   ├── web/                 # Next.js Dashboard (App Router)
│   └── cli/                 # CLI Tool (commander.js)
├── packages/
│   ├── core/                # @agentbench/core — Engine
│   │   ├── runner/          # Agent Runner
│   │   ├── tracer/          # Execution Tracer
│   │   ├── evaluator/       # Evaluation Engine ⬅ Phase 2
│   │   ├── assertion/       # Assertion DSL    ⬅ Phase 2
│   │   ├── storage/         # Storage Adapter
│   │   └── types/           # TypeScript Types
│   └── typescript-config/   # Shared TS Config
├── docs/                    # Architecture, Schema, Roadmap
├── docker-compose.yml
└── turbo.json
```

---

## 📊 Evaluation Dimensions

| Dimension | Measures | Judge |
|-----------|----------|-------|
| **Correctness** | Factual accuracy vs expected answer | LLM |
| **Faithfulness** | Grounding in source — no hallucinations | LLM |
| **Safety** | Harmful content, disclaimers, PII leaks | LLM |
| **Relevance** | On-topic, answers the actual question | LLM |
| **Completeness** | Covers all aspects, no gaps | LLM |
| **Reasoning** | Logical flow, valid conclusions | LLM |
| **Conciseness** | No filler, no repetition | LLM |
| **Tool Usage** | Right tools, efficient calls | LLM |
| **+14 Rule Types** | exact_match, contains, regex, json_schema,<br/>tool_called, latency_lt, tokens_lt, cost_lt … | Rule |

---

## 🗺️ Roadmap

| Milestone | Version | Status |
|-----------|---------|--------|
| M0 — Foundation | v0.1.0 | ✅ Done |
| M1 — Core Engine | v0.1.0 | ✅ Done |
| M2 — Evaluation & Assertion | v0.1.0 | ✅ Done |
| M3 — Regression & Replay | v0.2.0 | 🔨 Next |
| M4 — Experiments & Coverage | v0.5.0 | 📅 Planned |
| M5 — SDK Ecosystem | v0.5.0 | 📅 Planned |
| M6 — Platform Features | v0.9.0 | 📅 Planned |
| M7 — Polish & Release | v1.0.0 | 🎯 Target |

→ [Full Roadmap](docs/ROADMAP.md) &nbsp;·&nbsp; → [Task List](docs/TASKS.md)

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 15 (App Router) · React 19 · Tailwind CSS v4 · Radix UI · Framer Motion · Recharts |
| **Backend** | Next.js API Routes · Prisma · PostgreSQL 16 · Redis · BullMQ |
| **CLI** | Commander.js · Chalk · Ora |
| **Language** | TypeScript (strict) |
| **Monorepo** | pnpm workspaces · Turborepo |
| **Quality** | Biome · Husky |
| **Infra** | Docker Compose · GitHub Actions |

---

## 🤝 Contributing

We ❤️ contributions! Check out the [Roadmap](docs/ROADMAP.md) and [Task List](docs/TASKS.md) to find something to work on.

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
pnpm dev           # start hacking
pnpm typecheck     # verify your changes
```

> [!TIP]
> Start with a [`good first issue`](https://github.com/1304674612/agentbench/issues) or jump into the [discussions](https://github.com/1304674612/agentbench/discussions).

---

## 📄 License

Apache 2.0 © AgentBench — Built with ❤️ for the AI agent community.

---

<p align="center">
  <sub>⚡ If AgentBench saves you from shipping a broken agent, give it a ⭐</sub>
</p>
