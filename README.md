<div align="center">
  <img src="https://img.shields.io/badge/AgentBench-v0.1.0-7c3aed?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjJzOC00IDgtMTBWNWwtOC0zLTggM3Y3YzAgNiA4IDEwIDggMTB6Ii8+PHBhdGggZD0iTTkgMTJsMiAyIDQtNCIvPjwvc3ZnPg==" alt="AgentBench" />
</div>

<h1 align="center">AgentBench</h1>
<h3 align="center">The Regression Testing Framework for AI Agents</h3>

<p align="center">
  <strong>Replay · Evaluate · Compare · Assert · Catch Regressions — in CI</strong>
</p>

<p align="center">
  <!-- Language & Platform -->
  <img src="https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-15+-000000?logo=next.js&logoColor=white&style=flat-square" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=white&style=flat-square" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql&logoColor=white&style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7+-DC382D?logo=redis&logoColor=white&style=flat-square" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white&style=flat-square" alt="Docker" />
  <br/>
  <!-- Quality -->
  <img src="https://img.shields.io/badge/Tests-51%2F51-22c55e?logo=vitest&logoColor=white&style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/TS_Errors-0-22c55e?logo=typescript&logoColor=white&style=flat-square" alt="TS Errors" />
  <img src="https://img.shields.io/badge/E2E-95%25-22c55e?style=flat-square" alt="E2E" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-3b82f6?logo=apache&logoColor=white&style=flat-square" alt="License" />
  <img src="https://img.shields.io/github/stars/1304674612/agentbench?style=flat-square&color=fbbf24" alt="Stars" />
</p>

<p align="center">
  <a href="#-quick-start"><strong>Quick Start</strong></a> ·
  <a href="#-features"><strong>Features</strong></a> ·
  <a href="#-assertion-dsl"><strong>DSL</strong></a> ·
  <a href="#-ecosystem"><strong>Ecosystem</strong></a> ·
  <a href="https://github.com/1304674612/agentbench/wiki"><strong>Documentation</strong></a> ·
  <a href="https://github.com/1304674612/agentbench/releases"><strong>Releases</strong></a>
</p>

<hr/>

## 📖 Why AgentBench?

AI Agents are **unpredictable**. A prompt tweak, a model upgrade, or a tool swap can silently degrade your agent — and most teams discover this only when users complain.

AgentBench gives you the same testing rigor for your AI agents that you expect for your software.

<table>
<tr>
<td width="50%">

> ❌ **Without AgentBench**

- "I _think_ the new prompt is better"
- Manual spot-checking — misses regressions
- No idea if GPT → Claude breaks behavior
- Can't reproduce or bisect failures
- `console.log(agentResponse)` as your test suite

</td>
<td width="50%">

> ✅ **With AgentBench**

- **Score improved 7.2 → 9.1 (+26%)** ✓
- Automated test suites with assertions
- Cross-model replay catches drift instantly
- Full trace — every call, every tool use
- `agentbench test` in CI — ship with confidence

</td>
</tr>
</table>

---

## 🚀 Quick Start

<table>
<tr>
<td width="50%">

### Prerequisites
- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** (PostgreSQL + Redis)

</td>
<td width="50%">

### Install & Launch

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench && pnpm install
docker compose up -d
cp .env.example .env && pnpm db:push
pnpm dev
```

| | URL |
|---|---|
| Dashboard | http://localhost:3000/dashboard |
| API | http://localhost:3000/api/v1 |

</td>
</tr>
</table>

---

## ✨ Features

<table>
<tr>
<td>

### 🔧 Core Engine
- **Agent Runner** — Execute agents with timeout & concurrency control
- **Execution Tracer** — Transparently intercept OpenAI, Anthropic, MCP calls
- **Token & Cost** — Count tokens, calculate cost for 15+ models

### 📊 Evaluation
- **14 Rule Evaluators** — exact_match, contains, regex, json_schema, tool_called…
- **LLM-as-Judge** — 8 quality dimensions: correctness, faithfulness, safety, relevance
- **Hybrid Judge** — Combine rules + LLM with configurable voting strategies

### ♻️ Regression & Replay
- **Snapshot Manager** — Save & restore complete agent state
- **Replay Engine** — Deterministic / cross-model / batch replay
- **Diff Engine** — Text, metric, trace, and score comparison
- **Regression Detection** — Auto-flag token/cost/latency/score regressions

</td>
<td>

### ✅ Assertion DSL
```typescript
await expect(runResult)
  .tool("search").toBeCalled()
  .output().toContain("30 days")
  .tokens().toBeLessThan(4096)
  .score("correctness").toBeGreaterThan(7)
  .run()
```

### 🧬 Experiments & Coverage
- **A/B Testing** — t-test, bootstrap CI, Cohen's d
- **4D Coverage** — Prompt, workflow, tool, edge-case

### 🖥️ Web & CLI
- **Dashboard** — Dark-first Linear-inspired UI
- **8 CLI Commands** — init, run, test, evaluate, replay, compare, snapshot, report
- **CI-Ready** — GitHub Actions workflow, JUnit export

### 🛡️ Platform
- **4 Report Formats** — JSON, Markdown, HTML, JUnit XML
- **Dataset Management** — CSV/JSON/JSONL import + train/test split
- **Webhooks** — GitHub + GitLab CI triggers

</td>
</tr>
</table>

---

## 🔌 Assertion DSL

The most fluent way to test an AI agent. Chainable, type-safe, reads like English.

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                     // ✅ Agent finished successfully
  .tool("search_docs").toBeCalled()             // ✅ Called the right tool
  .tool("search_docs").toBeCalledWith({         // ✅ Called with correct args
    query: "refund policy"
  })
  .tool("hallucinate").not.toBeCalled()         // ✅ No forbidden tools
  .output().toContain("30 days")                // ✅ Output has correct info
  .output().toMatchRegex(/refund.*policy/i)     // ✅ Pattern validation
  .tokens().toBeLessThan(4096)                  // ✅ Token budget respected
  .latency().toBeLessThan(5000)                 // ✅ Under 5 seconds
  .score("correctness").toBeGreaterThan(7)       // ✅ Quality threshold met
  .score("safety").toBeGreaterThan(8)            // ✅ Safety threshold met
  .run()

if (!result.allPassed) process.exit(1)
```

<details>
<summary><strong>📋 All 22 Matchers</strong></summary>

| Category | Matchers |
|----------|----------|
| **Tool** | `toBeCalled()` · `toBeCalledWith()` · `toBeCalledTimes()` · `not.toBeCalled()` |
| **Tokens** | `toBeLessThan()` · `toBeGreaterThan()` · `toBeBetween()` |
| **Latency** | `toBeLessThan()` · `toBeGreaterThan()` · `firstToken().toBeLessThan()` |
| **Output** | `toContain()` · `not.toContain()` · `toEqual()` · `toMatchRegex()` · `toMatchSchema()` · `toMatchSnapshot()` |
| **Score** | `toBeGreaterThan()` · `toBeLessThan()` · `toBeBetween()` |
| **Status** | `toBeCompleted()` · `toBe("passed")` |
| **Compound** | `all()` · `any()` |

</details>

---

## 📦 Ecosystem

| Package | Description | Status |
|---------|-------------|:--:|
| `@agentbench/core` | Core engine — Runner, Tracer, Evaluator, Assertion, Storage | ✅ |
| `@agentbench/openai` | OpenAI wrapper with auto-tracing, token counting, cost calc | ✅ |
| `@agentbench/anthropic` | Anthropic Claude wrapper with streaming & tool use | ✅ |
| `@agentbench/mcp` | MCP client for tool calls and resource access | ✅ |
| `@agentbench/adapter` | Generic adapter for LangGraph, CrewAI, LlamaIndex, custom agents | ✅ |

---

## 📊 Project Status

| Metric | Value | | Metric | Value |
|--------|-------|--|--------|-------|
| TypeScript Files | **100+** | | Packages | **8** |
| Lines of Code | **16,000+** | | API Endpoints | **18** |
| CLI Commands | **8** | | Unit Tests | **51 / 51** |
| TS Errors | **0** | | E2E Pass Rate | **95%** |

| Phase | Milestone | |
|:--:|-----------|:--:|
| M0 | Foundation — Monorepo, DB, Scaffold | ✅ |
| M1 | Core Engine — Runner, Tracer, Storage | ✅ |
| M2 | Evaluation & Assertion — 14 rules + 8 judges + DSL | ✅ |
| M3 | Regression & Replay — Snapshot, Replay, Diff | ✅ |
| M4 | Experiments & Coverage — t-test, 4D coverage | ✅ |
| M5 | SDK Ecosystem — OpenAI, Anthropic, MCP, Adapter | ✅ |
| M6 | Platform — Reports, Datasets, CI/CD, Webhooks | ✅ |
| M7 | Polish — Dashboard, Landing Page, Documentation | ✅ |
| v1.0 | **Next** — Auth, Rate Limiting, Production Hardening | 🔜 |

---

## 🏗️ Architecture

```
agentbench/
├── apps/
│   ├── web/                    Next.js 15 Dashboard + REST API
│   └── cli/                    Commander.js CLI (8 commands)
├── packages/
│   ├── core/                   @agentbench/core — Engine
│   │   ├── runner/             Agent Runner
│   │   ├── tracer/             Execution Tracer + LLM Interceptors
│   │   ├── evaluator/          Rule + LLM + Hybrid Judge
│   │   ├── assertion/          Chained Assertion DSL
│   │   ├── snapshot/           Snapshot Manager
│   │   ├── replay/             Replay Engine
│   │   ├── diff/               Diff Engine
│   │   ├── experiment/         A/B Testing Engine
│   │   ├── coverage/           Coverage Analysis
│   │   ├── reporter/           Report Generator (JSON/MD/HTML/JUnit)
│   │   ├── storage/            Storage Abstraction (Postgres + Memory)
│   │   ├── types/              TypeScript Type Definitions
│   │   └── utils/              Token Counter + JSON Validator
│   ├── openai/                 @agentbench/openai
│   ├── anthropic/              @agentbench/anthropic
│   ├── mcp/                    @agentbench/mcp
│   ├── adapter/                @agentbench/adapter
│   └── typescript-config/      Shared TSConfig
├── docs/                       11 Wiki-synced documents
├── docker-compose.yml          PostgreSQL 16 + Redis 7
└── .github/workflows/          CI pipeline
```

---

## 📚 Documentation

| Document | |
|----------|--|
| [📖 Documentation Hub](https://github.com/1304674612/agentbench/wiki) | Full Wiki with sidebar navigation |
| [🚀 Getting Started](docs/GETTING_STARTED.md) | Step-by-step tutorial |
| [📡 API Reference](docs/API_REFERENCE.md) | 18 endpoints with curl examples |
| [💻 CLI Reference](docs/CLI_REFERENCE.md) | 8 commands with all options |
| [📦 SDK Guide](docs/SDK_GUIDE.md) | Usage for OpenAI, Anthropic, MCP, Adapter |
| [🏗️ Architecture](docs/ARCHITECTURE.md) | System design & data flow |
| [🚢 Deployment](docs/DEPLOYMENT.md) | Docker, Vercel, self-hosted |
| [❓ FAQ](docs/FAQ.md) | 20+ common questions |
| [📋 Glossary](docs/GLOSSARY.md) | 50+ terminology definitions |
| [🇨🇳 中文文档](README_CN.md) | Complete Chinese documentation |

---

## 🤝 Community

AgentBench is open source and community-driven. We welcome all contributions!

| | Link |
|--|------|
| 💬 **Discussions** | [github.com/1304674612/agentbench/discussions](https://github.com/1304674612/agentbench/discussions) |
| 🐛 **Issue Tracker** | [github.com/1304674612/agentbench/issues](https://github.com/1304674612/agentbench/issues) |
| 📝 **Contributing Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 🔒 **Security Policy** | [SECURITY.md](SECURITY.md) |
| 📋 **Code of Conduct** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

---

<div align="center">
  <br/>
  <strong>Built with ❤️ for the AI Agent community</strong>
  <br/><br/>
  <sub>Apache 2.0 License · © 2026 AgentBench Contributors</sub>
  <br/>
  <sub>If AgentBench saves you from shipping a broken agent, give it a ⭐</sub>
</div>
