<div align="center">
  <h1>AgentBench</h1>
  <h3>The Regression Testing Framework for AI Agents</h3>
  <p><strong>Replay · Evaluate · Compare · Assert · Catch Regressions — in CI</strong></p>
  <img src="https://img.shields.io/badge/AgentBench-v0.3.0-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjJzOC00IDgtMTBWNWwtOC0zLTggM3Y3YzAgNiA4IDEwIDggMTB6Ii8+PHBhdGggZD0iTTkgMTJsMiAyIDQtNCIvPjwvc3ZnPg==" alt="AgentBench" />
</div>

<p align="center">
  <a href="#-quick-start"><strong>Quick Start</strong></a> ·
  <a href="#-why-agentbench"><strong>Why</strong></a> ·
  <a href="#-assertion-dsl"><strong>DSL</strong></a> ·
  <a href="#-ecosystem"><strong>Ecosystem</strong></a> ·
  <a href="#-examples"><strong>Examples</strong></a> ·
  <a href="#-competitive-positioning"><strong>vs Others</strong></a> ·
  <a href="https://agentbench.dev/docs"><strong>Documentation</strong></a> ·
  <a href="https://github.com/1304674612/agentbench/releases"><strong>Releases</strong></a>
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
  <img src="https://img.shields.io/badge/Tests-391%2B-22c55e?logo=vitest&logoColor=white&style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/TS_Errors-0-22c55e?logo=typescript&logoColor=white&style=flat-square" alt="TS Errors" />
  <img src="https://img.shields.io/badge/Providers-12%2B-6366f1?style=flat-square" alt="Providers" />
  <img src="https://img.shields.io/badge/Examples-14-6366f1?style=flat-square" alt="Examples" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-3b82f6?logo=apache&logoColor=white&style=flat-square" alt="License" />
  <img src="https://img.shields.io/github/stars/1304674612/agentbench?style=flat-square&color=fbbf24" alt="Stars" />
  <br/>
  <img src="https://img.shields.io/badge/Python_SDK-0.2.0-3776AB?logo=python&logoColor=white&style=flat-square" alt="Python SDK" />
  <img src="https://img.shields.io/badge/npm-v0.3.0-CB3837?logo=npm&logoColor=white&style=flat-square" alt="npm" />
  <img src="https://img.shields.io/badge/VS_Code-Extension-007ACC?logo=visualstudiocode&logoColor=white&style=flat-square" alt="VS Code" />
  <br/>
  <a href="https://github.com/1304674612/agentbench/actions/workflows/agentbench-ci.yml"><img src="https://github.com/1304674612/agentbench/actions/workflows/agentbench-ci.yml/badge.svg?branch=main" alt="CI" style="max-width:100%;" /></a>
  <img src="https://img.shields.io/npm/v/@agentbench/cli?label=npm&color=CB3837&logo=npm&style=flat-square" alt="npm" />
</p>

---

## 🚀 Quick Start

```bash
npm install -g @agentbench/cli
agentbench init
agentbench test
```

**AgentBench is to AI agents what Jest is to JavaScript.**

Before Jest, JavaScript testing was fragmented — every team wrote their own harness, nobody trusted anyone else's results, there was no standard. Jest gave developers a unified way to write tests, run them fast, and catch regressions in CI. Playwright did the same for browser apps, bringing deterministic assertions to an inherently visual and interactive medium.

AgentBench does the same for AI agents — a domain that is non-deterministic, LLM-powered, and tool-calling by nature. Same philosophy: assertions, snapshots, replay, coverage, CI integration. Different domain: instead of `expect(2 + 2).toBe(4)`, you write `expect(agent).tool("search").toBeCalledWith({ query: "refund policy" })`. Instead of deterministic pass/fail, you get LLM-aware scoring, regression detection, and cross-model replay.

You test your code. You test your UI. You test your API. Now test your AI agents with the same rigor. One CLI. Five minutes. Ship agents with confidence.

<table>
<tr>
<td width="50%">

### Prerequisites
- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** (PostgreSQL + Redis)

</td>
<td width="50%">

### Install from Source

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

## 📖 Why AgentBench?

> *"I tracked my time. Coding was 10%. Testing was 90%. Not because I'm slow — because there was no tool."*
>
> — [Read the full origin story](docs/article-why-agent-testing.md)

AI Agents are **unpredictable**. A prompt tweak, a model upgrade, or a tool swap can silently degrade your agent -- and most teams discover this only when users complain.

AgentBench gives you the same testing rigor for your AI agents that you expect for your software.

<table>
<tr>
<td width="50%">

> **Without AgentBench**

- "I _think_ the new prompt is better"
- Manual spot-checking -- misses regressions
- No idea if GPT to Claude breaks behavior
- Cannot reproduce or bisect failures
- `console.log(agentResponse)` as your test suite

</td>
<td width="50%">

> **With AgentBench**

- **Score improved 7.2 to 9.1 (+26%)** -- know, do not guess
- Automated test suites with assertions
- Cross-model replay catches drift instantly
- Full trace -- every call, every tool use
- `agentbench test` in CI -- ship with confidence

</td>
</tr>
</table>

---

## ✨ Features

<table>
<tr>
<td>

### Core Engine
- **Agent Runner** -- Execute agents with timeout and concurrency control
- **Execution Tracer** -- Transparently intercept OpenAI, Anthropic, Gemini, DeepSeek, and 8+ more providers
- **Token and Cost** -- Count tokens, calculate cost for 15+ models
- **Streaming** -- Full SSE capture with time-to-first-token metrics

### Evaluation
- **14 Rule Evaluators** -- exact_match, contains, regex, json_schema, tool_called, and more
- **LLM-as-Judge** -- 8 quality dimensions: correctness, faithfulness, safety, relevance, completeness, reasoning, conciseness, tool usage
- **Hybrid Judge** -- Combine rules + LLM with configurable voting strategies (rule_first, llm_first, parallel)

### Regression and Replay
- **Snapshot Manager** -- Save and restore complete agent state
- **Replay Engine** -- Deterministic / cross-model / batch replay
- **Diff Engine** -- Text, metric, trace, and score comparison
- **Regression Detection** -- Auto-flag token/cost/latency/score regressions

</td>
<td>

### Assertion DSL
```typescript
await expect(runResult)
  .tool("search").toBeCalled()
  .tool("search").toBeCalledWith({ query: "refund policy" })
  .output().toContain("30 days")
  .tokens().toBeLessThan(4096)
  .latency().toBeLessThan(5000)
  .score("correctness").toBeGreaterThan(7)
  .run()
```

### Experiments and Coverage
- **A/B Testing** -- t-test, bootstrap CI, Cohen's d effect size
- **4D Coverage** -- Prompt, workflow, tool, edge-case dimensions

### Web and CLI
- **Dashboard** -- Dark-first Linear-inspired UI (Next.js 15 + Radix + Tailwind v4)
- **12 CLI Commands** -- init, run, test, evaluate, replay, compare, report, snapshot, experiment, config, dev, benchmark
- **CI-Ready** -- GitHub Actions workflow, GitLab CI, JUnit XML export
- **VS Code Extension** -- Run, debug, and replay tests from your editor

### Platform
- **4 Report Formats** -- JSON, Markdown, HTML, JUnit XML
- **Dataset Management** -- CSV/JSON/JSONL import/export, train/test/validation split
- **Benchmark Marketplace** -- Discover, install, and run standardized agent benchmarks
- **Webhooks** -- GitHub + GitLab CI triggers

</td>
</tr>
</table>

---

## 🔌 Assertion DSL

The most fluent way to test an AI agent. Chainable, type-safe, reads like English.

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                     // Agent finished successfully
  .tool("search_docs").toBeCalled()             // Called the right tool
  .tool("search_docs").toBeCalledWith({         // Called with correct args
    query: "refund policy"
  })
  .tool("hallucinate").not.toBeCalled()         // No forbidden tools
  .output().toContain("30 days")                // Output has correct info
  .output().toMatchRegex(/refund.*policy/i)     // Pattern validation
  .tokens().toBeLessThan(4096)                  // Token budget respected
  .latency().toBeLessThan(5000)                 // Under 5 seconds
  .score("correctness").toBeGreaterThan(7)       // Quality threshold met
  .score("safety").toBeGreaterThan(8)            // Safety threshold met
  .run()

if (!result.allPassed) process.exit(1)
```

<details>
<summary><strong>All 22 Matchers</strong></summary>

| Category | Matchers |
|----------|----------|
| **Tool** | `toBeCalled()`, `toBeCalledWith()`, `toBeCalledTimes()`, `not.toBeCalled()` |
| **Tokens** | `toBeLessThan()`, `toBeGreaterThan()`, `toBeBetween()` |
| **Latency** | `toBeLessThan()`, `toBeGreaterThan()`, `firstToken().toBeLessThan()` |
| **Output** | `toContain()`, `not.toContain()`, `toEqual()`, `toMatchRegex()`, `toMatchSchema()`, `toMatchSnapshot()` |
| **Score** | `toBeGreaterThan()`, `toBeLessThan()`, `toBeBetween()` |
| **Status** | `toBeCompleted()`, `toBe("passed")` |
| **Compound** | `all()`, `any()` |

</details>

---

## 📦 Ecosystem

### Provider Plugins

| Provider | Package | Capabilities | Status |
|----------|---------|-------------|:--:|
| **OpenAI** | `@agentbench/openai` | Streaming, reasoning, tool-calling, vision, function-calling, JSON mode | GA |
| **Anthropic** | `@agentbench/anthropic` | Streaming, reasoning, tool-calling, vision | GA |
| **Gemini** | `@agentbench/gemini` | Streaming, embeddings, tool-calling, vision, JSON mode | GA |
| **DeepSeek** | `@agentbench/deepseek` | Streaming, reasoning, tool-calling, JSON mode | GA |
| **Azure OpenAI** | `@agentbench/azure-openai` | Streaming, embeddings, tool-calling, vision | Beta |
| **OpenRouter** | `@agentbench/openrouter` | Streaming, tool-calling (pass-through to 200+ models) | Beta |
| **Groq** | `@agentbench/groq` | Streaming, tool-calling, JSON mode (fast inference) | Beta |
| **Mistral** | `@agentbench/mistral` | Streaming, embeddings, tool-calling, JSON mode | Beta |
| **Cohere** | `@agentbench/cohere` | Streaming, embeddings, tool-calling | Beta |
| **Ollama** | `@agentbench/ollama` | Streaming, embeddings, tool-calling, JSON mode (local) | Beta |
| **vLLM** | `@agentbench/vllm` | Streaming, tool-calling (OpenAI-compatible) | Beta |
| **LM Studio** | `@agentbench/lm-studio` | Streaming, tool-calling (OpenAI-compatible, local) | Beta |

### SDK Packages

| Package | Description | Status |
|---------|-------------|:--:|
| `@agentbench/core` | Core engine -- Runner, Tracer, Evaluator, Assertion DSL, Replay, Diff, Coverage | GA |
| `@agentbench/mcp` | MCP client wrapper for tool calls and resource access | GA |
| `@agentbench/adapter` | Generic adapter for LangGraph, CrewAI, LlamaIndex, and custom agents | GA |
| `@agentbench/langgraph` | First-class LangGraph adapter with state graph tracing | GA |
| `@agentbench/provider-utils` | Shared base classes for building custom providers | GA |
| `agentbench` (Python) | Full Python SDK -- Runner, Tracer, Assertions, HTTP client | GA |

---

## 📚 Examples

14 production-quality reference implementations. Each demonstrates how to test a specific kind of AI agent with comprehensive test suites.

| # | Example | Category | What It Demonstrates |
|---|---------|----------|---------------------|
| 1 | **Hello Agent** | General | Minimal starter -- the template generated by `agentbench init` |
| 2 | **Customer Support** | customer-support | Multi-turn support agent with RAG, tool calling, escalation, regression suite |
| 3 | **Research Agent** | research | Multi-step research with web search, source verification, citation accuracy |
| 4 | **RAG Agent** | rag | Retrieval-augmented generation with grounding, context-window, latency tests |
| 5 | **SQL Agent** | sql | Text-to-SQL with schema awareness, join/aggregation, SQL injection prevention |
| 6 | **Code Review Agent** | coding | Security review, code quality, false-positive detection, large diff handling |
| 7 | **Coding Agent** | coding | Code generation, bug-fix loop, refactoring, test-driven development |
| 8 | **Tool-Calling Agent** | tool-calling | Complex tool orchestration -- selection, parallel calls, ordering, error handling |
| 9 | **MCP Agent** | mcp | Model Context Protocol -- tool discovery, resource access, multi-server, lifecycle |
| 10 | **LangGraph Agent** | agent-workflow | State graph testing -- workflow paths, transitions, conditional edges, human-in-loop |
| 11 | **OpenAI Agent SDK** | agent-workflow | Guardrails, handoffs, tool use, tracing integration |
| 12 | **CrewAI Agent** | multi-agent | Multi-agent crews -- task completion, delegation, sequential workflow, output quality |
| 13 | **LlamaIndex Agent** | rag | Query engine, chat engine, tool integration, index quality |
| 14 | **Multi-Agent Workflow** | multi-agent | Complex orchestration -- handoff, consensus, concurrency, failure recovery |

Each example includes:
- README with quick start, architecture diagram, and key takeaways
- 3-5 test suites with 8+ test cases
- At least 3 different assertion types (tool, output, score, latency, tokens)
- Replay test suite (zero-cost, deterministic)
- CI workflow file (`.github/workflows/agentbench.yml`)
- Dataset of 20+ test inputs
- 100% pass rate when run against their target agent

```bash
# Run any example
cd examples/customer-support-agent
cp .env.example .env   # Add your API key
npm install
agentbench test
```

---

## 🆚 Competitive Positioning

AgentBench is not an observability platform or an evaluation library. It is a **testing framework** -- the same category as Jest, Playwright, and Pytest, but purpose-built for the non-deterministic world of AI agents.

### At a Glance

| Tool | Category | Best For |
|------|----------|----------|
| **AgentBench** | Agent Testing | CI/CD regression testing, assertions, replay |
| **LangSmith** | Observability | Debugging traces, monitoring production |
| **DeepEval** | LLM Evaluation | Evaluating output quality metrics |
| **Promptfoo** | Prompt Testing | Comparing prompt variants |
| **Playwright** | Browser Testing | Testing browser interactions |
| **Jest** | Unit Testing | Testing deterministic code |

### AgentBench vs The Alternatives

| Tool | Category | What It Does | Key Difference from AgentBench |
|------|----------|--------------|-------------------------------|
| **LangSmith** | LLM Observability | Trace, monitor, and annotate LLM calls | LangSmith helps you **observe** what happened. AgentBench helps you **assert** what should happen and **gate** on it in CI. Use LangSmith to debug; use AgentBench to block broken agents from shipping. |
| **DeepEval** | LLM Evaluation | Metrics and benchmarks for LLM outputs | DeepEval evaluates **output text**. AgentBench tests the **entire agent** -- which tools were called, in what order, with what arguments, token budgets, latency budgets, and whether quality regressed from the last run. |
| **Promptfoo** | Prompt Testing | Compare prompt variants | Promptfoo tests **prompts**. AgentBench tests **agents** -- prompts + tools + chains + state + multi-turn conversation. |
| **OpenAI Evals** | LLM Benchmarking | Standardized eval suites for models | OpenAI Evals is a **benchmark runner**. AgentBench is a **developer testing workflow** -- assertions, replay, regression detection, CI/CD, VS Code integration. |
| **Jest / Vitest** | Unit Testing | JavaScript/TypeScript test runner | Jest expects **deterministic** outputs. AI agents are **non-deterministic**. AgentBench provides LLM-aware assertions, replay, and regression detection that Jest cannot. |
| **Playwright** | Browser Testing | Automate and test browser interactions | Playwright tests **browser apps**. AgentBench tests **AI agents**. Complementary -- an agent that uses a browser can be tested with both. |

### The "Why Not Just Use X" Answers

**Why not just use LangSmith?**
LangSmith is for observability -- seeing what happened. AgentBench is for testing -- asserting what _should_ happen and gating on it. You use LangSmith to debug; you use AgentBench in CI to prevent broken agents from reaching production.

**Why not just use Jest?**
Jest expects deterministic outputs. AI agents are non-deterministic. AgentBench provides LLM-aware assertions (`tool().toBeCalled()`, `score("correctness").toBeGreaterThan(7)`), replay, and regression detection that Jest cannot.

**Why not just use DeepEval?**
DeepEval evaluates the _output text_. AgentBench tests the _agent behavior_ -- which tools were called, in what order, with what arguments, how many tokens were used, whether the response was fast enough, and whether quality regressed from the last run.

---

## 📊 Project Status

| Metric | Value | | Metric | Value |
|--------|-------|--|--------|-------|
| TypeScript Files | **120+** | | CLI Commands | **12** |
| Lines of Code | **22,000+** | | Providers Supported | **12+** |
| Packages | **8** | | Official Examples | **14** |
| API Endpoints | **18** | | VS Code Extension | **Published** |
| Unit Tests | **391+** | | Documentation Pages | **25+** |
| TS Errors | **0** | | npm Package | **Published** |

| Phase | Milestone | |
|:--:|-----------|:--:|
| M0-M3 | Foundation, Core Engine, Evaluation, Regression & Replay | GA |
| M4-M7 | Experiments & Coverage, SDK Ecosystem, Platform, Polish | GA |
| v0.3.0 | **Brand refresh, 14 examples, 12+ providers, dataset system, GitHub integration, VS Code extension, benchmark marketplace, documentation site** | Current |
| v0.4.0 | Ecosystem -- GitHub Actions PR integration, full dataset system, VS Code Trace Viewer, benchmark validation pipeline | Q4 2026 |
| v0.5.0 | Enterprise -- Team workspaces, AgentBench Cloud, SSO, audit logs | Q1 2027 |
| v1.0.0 | Standard -- Plugin marketplace, stable v1 API, Python SDK v1.0, certification program | Q3 2027 |

---

## 🏗 Architecture

```
agentbench/
├── apps/
│   ├── web/                    Next.js 15 Dashboard + REST API + Benchmark Marketplace
│   ├── cli/                    Commander.js CLI (12 commands)
│   └── docs/                   VitePress documentation site (25+ pages)
├── packages/
│   ├── core/                   @agentbench/core -- Engine
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
│   │   ├── dataset/            Dataset Management (CSV/JSON/JSONL)
│   │   ├── storage/            Storage Abstraction (Postgres + Memory)
│   │   ├── types/              TypeScript Type Definitions
│   │   └── utils/              Token Counter + JSON Validator
│   ├── openai/                 @agentbench/openai
│   ├── anthropic/              @agentbench/anthropic
│   ├── gemini/                 @agentbench/gemini
│   ├── deepseek/               @agentbench/deepseek
│   ├── azure-openai/           @agentbench/azure-openai
│   ├── openrouter/             @agentbench/openrouter
│   ├── groq/                   @agentbench/groq
│   ├── mistral/                @agentbench/mistral
│   ├── cohere/                 @agentbench/cohere
│   ├── ollama/                 @agentbench/ollama
│   ├── vllm/                   @agentbench/vllm
│   ├── lm-studio/              @agentbench/lm-studio
│   ├── provider-utils/         @agentbench/provider-utils
│   ├── mcp/                    @agentbench/mcp
│   ├── adapter/                @agentbench/adapter
│   ├── langgraph/              @agentbench/langgraph
│   └── typescript-config/      Shared TSConfig
├── examples/                   14 official examples
├── sdk-python/                 Python SDK
├── vscode-extension/           VS Code extension
├── benchmark-registry/         Benchmark registry + DB
├── docs/                       Internal docs (architecture, schema, roadmap)
├── docker-compose.yml          PostgreSQL 16 + Redis 7
└── .github/workflows/          CI pipeline
```

---

## 📚 Documentation

| Document | |
|----------|--|
| [Documentation Hub](https://agentbench.dev/docs) | Full docs site built with VitePress |
| [Getting Started](docs/GETTING_STARTED.md) | Step-by-step tutorial |
| [API Reference](docs/API_REFERENCE.md) | 18 endpoints with curl examples |
| [CLI Reference](docs/CLI_REFERENCE.md) | 12 commands with all options |
| [SDK Guide](docs/SDK_GUIDE.md) | Usage for OpenAI, Anthropic, MCP, Adapter, and more |
| [Architecture](docs/ARCHITECTURE.md) | System design and data flow |
| [Roadmap](docs/ROADMAP.md) | v0.3 through v1.0 plans |
| [Deployment](docs/DEPLOYMENT.md) | Docker, Vercel, self-hosted |
| [FAQ](docs/FAQ.md) | 20+ common questions |
| [Glossary](docs/GLOSSARY.md) | 50+ terminology definitions |

---

## Community

AgentBench is open source and community-driven. We welcome all contributions.

| | Link |
|--|------|
| **Discussions** | [github.com/1304674612/agentbench/discussions](https://github.com/1304674612/agentbench/discussions) |
| **Issue Tracker** | [github.com/1304674612/agentbench/issues](https://github.com/1304674612/agentbench/issues) |
| **Contributing Guide** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Security Policy** | [SECURITY.md](SECURITY.md) |
| **Code of Conduct** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |

---

<div align="center">
  <br/>
  <strong>Built with love for the AI agent community</strong>
  <br/><br/>
  <sub>Apache 2.0 License - (c) 2026 AgentBench Contributors</sub>
  <br/>
  <sub>If AgentBench saves you from shipping a broken agent, give it a star</sub>
  <br/><br/>
  <a href="https://star-history.com/#1304674612/agentbench&Date">
    <img src="https://api.star-history.com/svg?repos=1304674612/agentbench&type=Date" alt="Star History Chart" width="500" />
  </a>
</div>
