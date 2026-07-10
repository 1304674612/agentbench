
# AgentBench v0.3.0 — Product Design Document

> **Status:** Draft for Review
> **Author:** AgentBench Team
> **Date:** 2026-07-10
> **Target Release:** Q3 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Brand Positioning](#2-brand-positioning)
3. [Developer Experience Redesign](#3-developer-experience-redesign)
4. [Official Examples](#4-official-examples)
5. [Provider Plugin Ecosystem](#5-provider-plugin-ecosystem)
6. [Dataset System](#6-dataset-system)
7. [GitHub Integration](#7-github-integration)
8. [VS Code Extension](#8-vs-code-extension)
9. [Benchmark Marketplace](#9-benchmark-marketplace)
10. [Documentation Redesign](#10-documentation-redesign)
11. [System Architecture](#11-system-architecture)
12. [Roadmap](#12-roadmap)
13. [Adoption Strategy](#13-adoption-strategy)
14. [Ecosystem Strategy](#14-ecosystem-strategy)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### 1.1 The Problem

AI Agents are software. Software needs tests. But today, testing an AI agent means:

- Manually spot-checking responses in a playground
- `console.log(agentOutput)` as the test suite
- No way to know if a prompt change made things better or worse
- No regression detection when switching models
- No CI integration — agents ship untested

This is where software engineering was before JUnit, before Jest, before Pytest. Every team builds their own ad-hoc testing. Nobody trusts anyone else's results. There is no standard.

### 1.2 The Solution

**AgentBench is the testing framework for AI Agents.**

What Jest did for JavaScript testing, what Playwright did for browser testing, what Pytest did for Python testing — AgentBench does for AI Agent testing.

### 1.3 v0.3.0 Mission

v0.2.0 proved the concept. It has the engine, the assertion DSL, the replay system, the dashboard. It works.

v0.3.0 is not about more features. It is about:

| Pillar | Goal |
|--------|------|
| **Adoption** | Any developer can install, init, and run their first test in 5 minutes |
| **Developer Experience** | The CLI, config, and workflow feel like Jest/Vitest — familiar, fast, delightful |
| **Ecosystem** | Providers, examples, datasets, and benchmarks form a self-reinforcing network |
| **Standard** | AgentBench becomes the obvious default for AI agent testing |

### 1.4 Key Metrics for v0.3.0 Success

| Metric | Current (v0.2.0) | Target (v0.3.0) |
|--------|-------------------|------------------|
| Time-to-first-test | ~30 min (clone, docker, db setup, .env) | **< 5 min** (`npm install -g agentbench && agentbench init && agentbench test`) |
| npm downloads/week | 0 (not published) | 500+ |
| GitHub stars | — | 500+ |
| Official examples | 3 (demo quality) | 14 (production quality) |
| Provider support | 2 (OpenAI, Anthropic) | 12+ |
| Documentation pages | 12 (wiki) | 25+ (dedicated docs site) |
| VS Code extension | None | Published on marketplace |
| GitHub Actions users | Manual setup | 1-click workflow |

---

## 2. Brand Positioning

### 2.1 One-Line Positioning

> **AgentBench is the Regression Testing Framework for AI Agents.**
>
> Replay. Evaluate. Assert. Catch regressions — in CI.

### 2.2 30-Second Pitch

> You test your code with Jest. You test your UI with Playwright. You test your API with Pytest.
>
> What do you test your AI agents with?
>
> AgentBench. The same rigor — assertions, regression detection, replay, coverage, CI — for the AI layer of your stack. One CLI. Five minutes. Ship agents with confidence.

### 2.3 Website Hero

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   The Testing Framework for AI Agents                    │
│                                                          │
│   Replay · Evaluate · Compare · Assert · CI              │
│                                                          │
│   ┌────────────────────────────────────────┐             │
│   │  npm install -g agentbench             │             │
│   │  agentbench init                        │             │
│   │  agentbench test                        │             │
│   └────────────────────────────────────────┘             │
│                                                          │
│   [Quick Start]  [Documentation]  [GitHub]               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.4 README Opening

```markdown
# AgentBench

**The Regression Testing Framework for AI Agents.**

```bash
npm install -g agentbench
agentbench init
agentbench test
```

AgentBench brings software engineering rigor to AI agents:
- **Replay** — Record and replay agent executions deterministically
- **Assert** — Chainable DSL: `expect(run).tool("search").toBeCalled().output().toContain("answer")`
- **Evaluate** — 14 rule evaluators + LLM-as-Judge across 8 dimensions
- **Regression Detection** — Catch prompt, model, and tool degradations automatically
- **CI-Ready** — GitHub Actions, GitLab CI, JUnit XML export

AgentBench is to AI agents what Jest is to JavaScript, Playwright is to browsers, and Pytest is to Python.
```

### 2.5 GitHub Metadata

**Description (350 chars):**
> The Regression Testing Framework for AI Agents. Replay, evaluate, assert, and catch regressions — in CI. Like Jest for your AI layer. Supports OpenAI, Anthropic, Gemini, DeepSeek, LangGraph, CrewAI, and more.

**Topics:** `ai-agents`, `testing`, `regression-testing`, `agent-testing`, `llm-evaluation`, `playwright`, `jest`, `ci-cd`, `developer-tools`, `ai-engineering`, `agentops`, `typescript`, `python`

### 2.6 Competitive Positioning

#### 2.6.1 Positioning Map

```
                    FUNCTIONAL TESTING
                         │
                    Jest · Pytest
                         │
     ASSERTIONS ─────────┼────────── OBSERVABILITY
                         │
                   AgentBench          LangSmith
                         │
                    Playwright         LangFuse
                         │
              REPLAY / TRACE ────────── PROMPT MANAGEMENT
```

#### 2.6.2 Differentiation Table

| Tool | Category | What It Does | Overlap with AgentBench | Key Difference |
|------|----------|--------------|------------------------|----------------|
| **LangSmith** | LLM Observability | Trace, monitor, annotate LLM calls | Tracing, evaluation | LangSmith is a monitoring platform; AgentBench is a testing framework. LangSmith helps you *observe*; AgentBench helps you *assert and gate*. |
| **DeepEval** | LLM Evaluation | Metrics and benchmarks for LLM outputs | Evaluation metrics | DeepEval evaluates outputs; AgentBench tests the *entire agent* — tools, workflows, multi-turn, regression. |
| **OpenAI Evals** | LLM Benchmarking | Standardized eval suites for models | Dataset evaluation | OpenAI Evals is a benchmark runner; AgentBench is a developer testing workflow. |
| **Promptfoo** | Prompt Testing | Compare prompt variants | Compare, evaluate | Promptfoo tests prompts; AgentBench tests agents (prompts + tools + chains + state). |
| **Playwright** | Browser Testing | Automate and test browser interactions | Replay, assertions, CI | Playwright tests browser apps; AgentBench tests AI agents. Complementary — an agent that uses a browser can be tested with both. |
| **Jest** | Unit Testing | JavaScript test runner | Assertions, coverage, CI | Jest tests deterministic code; AgentBench tests non-deterministic agents. Same philosophy, different domain. |

#### 2.6.3 The "Why Not X" Answers

**Why not just use LangSmith?**
LangSmith is for observability — seeing what happened. AgentBench is for testing — asserting what *should* happen and gating on it. You use LangSmith to debug; you use AgentBench in CI to block broken agents from shipping.

**Why not just use Jest?**
Jest expects deterministic outputs. AI agents are non-deterministic. AgentBench provides LLM-aware assertions (`toBeCalled()`, `score("correctness").toBeGreaterThan(7)`), replay, and regression detection that Jest cannot.

**Why not just use DeepEval?**
DeepEval evaluates the *output text*. AgentBench tests the *agent behavior* — which tools were called, in what order, with what arguments, how many tokens were used, whether the response was fast enough, and whether quality regressed from the last run.

### 2.7 Core Messaging Pillars

Every piece of communication should reinforce these four ideas:

1. **Regression Testing** — "Don't let your agent get worse. Catch it in CI."
2. **Replay** — "Record once. Replay forever. Know exactly what changed."
3. **Assertions** — "Your agent should call the right tool, say the right thing, stay within budget. Assert it."
4. **Developer Workflow** — "`agentbench test`. That's it. Like Jest, but for agents."

---

## 3. Developer Experience Redesign

> **Highest Priority for v0.3.0**

### 3.1 DX North Star

The goal is to match the experience of:

```bash
# Jest
npm install --save-dev jest
npx jest --init
npx jest

# Playwright
npm init playwright@latest
npx playwright test

# Vitest
npm install --save-dev vitest
npx vitest
```

AgentBench should feel just as natural:

```bash
npm install -g agentbench
agentbench init
agentbench test
```

### 3.2 `agentbench init` — Complete CLI Flow

#### 3.2.1 Interactive Walkthrough

```
$ agentbench init

 █████╗  ██████╗ ███████╗███╗  ██╗████████╗██████╗ ███████╗███╗  ██╗ ██████╗██╗  ██╗
██╔══██╗██╔════╝ ██╔════╝████╗ ██║╚══██╔══╝██╔══██╗██╔════╝████╗ ██║██╔════╝██║  ██║
███████║██║  ██╗ █████╗  ██╔██╗██║   ██║   ██████╦╝█████╗  ██╔██╗██║██║     ███████║
██╔══██║██║  ╚██╗██╔══╝  ██║╚████║   ██║   ██╔══██╗██╔══╝  ██║╚████║██║     ██╔══██║
██║  ██║╚██████╔╝███████╗██║ ╚███║   ██║   ██████╦╝███████╗██║ ╚███║╚██████╗██║  ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚══╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚══╝ ╚═════╝╚═╝  ╚═╝

                    The Regression Testing Framework for AI Agents
                                   v0.3.0

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Welcome to AgentBench! Let's set up your first agent test suite.   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

✔ Detected Node.js v22.5.1

▶ Step 1/5: Project Setup

  Project name: (my-agent-tests)
  Language: TypeScript (default) / JavaScript
  Package manager: npm / pnpm / yarn (detected: pnpm)

▶ Step 2/5: Provider Detection

  🔍 Scanning environment for API keys...

  ✔ OpenAI       OPENAI_API_KEY        (sk-...abc123)  → Auto-configured
  ✔ Anthropic    ANTHROPIC_API_KEY     (sk-ant-...xyz) → Auto-configured
  ✔ Gemini       GEMINI_API_KEY        (AIza...def456) → Auto-configured
  ✗ DeepSeek     DEEPSEEK_API_KEY      (not found)
  ✗ OpenRouter   OPENROUTER_API_KEY    (not found)

  Would you like to configure additional providers? (Y/n)

▶ Step 3/5: Choose a Starter Template

  ▶ Hello Agent     Minimal single-agent test — best for learning
    Customer Support   Multi-turn support agent with tool calling
    RAG Agent          Retrieval-augmented generation agent
    Empty              Blank project — for experienced users

  Use ↑/↓ to navigate, Enter to select

▶ Step 4/5: Configuration

  ▶ Test directory:     tests/
  ▶ Dataset directory:  dataset/
  ▶ Report directory:   report/
  ▶ Snapshot directory: .agentbench/snapshots/
  ▶ Output format:      terminal + JSON + HTML
  ▶ CI mode:            GitHub Actions

  Customize? (y/N)

▶ Step 5/5: Generating Project...

  ✔ Created agentbench.config.ts
  ✔ Created tests/hello-agent.test.ts
  ✔ Created tests/hello-agent.test.snap
  ✔ Created dataset/hello-agent.queries.csv
  ✔ Created examples/
  ✔ Created report/
  ✔ Created .agentbench/
  ✔ Created .github/workflows/agentbench.yml
  ✔ Created .gitignore entry
  ✔ Installed dependencies

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ✨ AgentBench is ready!                                           │
│                                                                     │
│   Quick Start:                                                      │
│     agentbench test                    Run all tests                │
│     agentbench test --watch            Watch mode                   │
│     agentbench test --ui               Open test UI                 │
│     agentbench replay                  Replay last run              │
│     agentbench compare                 Compare two runs             │
│                                                                     │
│   Next Steps:                                                       │
│     • Edit tests/hello-agent.test.ts to add your first assertion    │
│     • Edit agentbench.config.ts to configure your agent             │
│     • Read the docs: https://agentbench.dev/docs                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

  ⚡ 5 minutes to your first agent test. Go ship with confidence.
```

#### 3.2.2 Non-Interactive Mode

```bash
# Quick init with defaults
agentbench init --yes

# Init with specific template
agentbench init --template hello-agent

# Init with specific providers
agentbench init --provider openai,anthropic

# Init in CI mode
agentbench init --ci

# Init from existing config URL
agentbench init --from https://github.com/user/repo/blob/main/agentbench.config.ts
```

#### 3.2.3 Error Handling & Recovery

| Scenario | Behavior |
|----------|----------|
| Directory not empty | Warn, offer to merge or create subdirectory |
| No API keys found | Continue anyway, show "Add your API key to .env to run tests" |
| Node.js < 20 | Error with upgrade instructions |
| Network error (npm install) | Retry 3 times, then show manual instructions |
| Permission denied | Show chmod/chown instructions |
| git not initialized | Offer `git init` or skip |
| Docker not found | "Optional: Docker provides PostgreSQL + Redis for the dashboard. You can still run tests without it." |

### 3.3 File Templates

#### 3.3.1 `agentbench.config.ts`

```typescript
import { defineConfig } from 'agentbench'

export default defineConfig({
  // ── Project ──────────────────────────────────────────
  name: 'my-agent-tests',
  description: 'Test suite for my AI agent',

  // ── Agent Under Test ──────────────────────────────────
  agent: {
    // Option A: Point to an agent function
    entry: './src/agent.ts',
    // Option B: Configure an LLM-powered agent inline
    // model: 'openai/gpt-4o',
    // systemPrompt: 'You are a helpful assistant.',
    // tools: ['./tools/search.ts', './tools/calculator.ts'],
  },

  // ── Providers ─────────────────────────────────────────
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: 'gpt-4o',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel: 'claude-sonnet-4-5',
    },
    // Auto-detected from env; add more here
  },

  // ── Test Configuration ────────────────────────────────
  test: {
    testDir: './tests',
    timeout: 30000,
    retry: 2,
    maxConcurrency: 4,
    globalSetup: './tests/setup.ts',
    globalTeardown: './tests/teardown.ts',
  },

  // ── Assertion Defaults ────────────────────────────────
  assertions: {
    scoreThreshold: 7,         // Default minimum score (1-10)
    maxTokens: 4096,           // Default token budget
    maxLatency: 30000,         // Default max latency (ms)
    forbiddenTools: [],        // Tools the agent must never call
  },

  // ── Replay ────────────────────────────────────────────
  replay: {
    storage: '.agentbench/snapshots',
    mode: 'deterministic',     // 'deterministic' | 'llm' | 'mixed'
  },

  // ── Evaluation ────────────────────────────────────────
  evaluation: {
    judges: ['correctness', 'faithfulness', 'safety'],
    judgeModel: 'openai/gpt-4o-mini',  // Cheaper model for judging
  },

  // ── Coverage ──────────────────────────────────────────
  coverage: {
    dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
    thresholds: {
      prompt: 0.8,
      workflow: 0.7,
      tool: 0.9,
      'edge-case': 0.5,
    },
  },

  // ── Output ────────────────────────────────────────────
  report: {
    formats: ['terminal', 'json', 'html', 'junit'],
    outputDir: './report',
  },

  // ── CI ────────────────────────────────────────────────
  ci: {
    provider: 'github-actions',  // 'github-actions' | 'gitlab-ci' | 'circleci' | 'none'
    commentOnPR: true,
    failOnRegression: true,
  },
})
```

#### 3.3.2 `tests/hello-agent.test.ts` (Hello Agent Template)

```typescript
import { expect, test, suite } from 'agentbench'
import { myAgent } from '../src/agent'

suite('Hello Agent', () => {
  test('should respond to a simple greeting', async () => {
    const result = await myAgent.run('Hello! Who are you?')

    await expect(result)
      .status().toBeCompleted()
      .output().toContain('assistant')      // It identifies itself
      .tokens().toBeLessThan(1000)           // Stays within budget
      .latency().toBeLessThan(15000)         // Responds in <15s
      .score('correctness').toBeGreaterThan(7)
      .run()
  })

  test('should handle a factual question', async () => {
    const result = await myAgent.run('What is the capital of France?')

    await expect(result)
      .status().toBeCompleted()
      .output().toContain('Paris')
      .score('correctness').toBeGreaterThan(8)
      .run()
  })

  // Example: Replay test (deterministic, uses recorded response)
  test.replay('greeting should be consistent', async () => {
    const result = await myAgent.run('Hello! Who are you?')
    // Replay mode: runs against recorded snapshot, no LLM cost
    await expect(result).toMatchSnapshot()
  })
})
```

#### 3.3.3 `tests/hello-agent.test.ts` (Customer Support Template)

```typescript
import { expect, test, suite } from 'agentbench'
import { supportAgent } from '../src/agent'

suite('Customer Support Agent', () => {
  suite('Greeting', () => {
    test('should welcome the customer', async () => {
      const result = await supportAgent.run('Hi, I need help')
      await expect(result)
        .status().toBeCompleted()
        .output().toMatchRegex(/welcome|help|how can i/i)
        .score('correctness').toBeGreaterThan(7)
        .run()
    })
  })

  suite('Refund Policy', () => {
    test('should call the refund_policy tool', async () => {
      const result = await supportAgent.run('What is your refund policy?')
      await expect(result)
        .tool('search_knowledge_base').toBeCalled()
        .tool('search_knowledge_base').toBeCalledWith({ query: 'refund policy' })
        .output().toContain('30 days')
        .score('faithfulness').toBeGreaterThan(7)
        .run()
    })

    test('should not hallucinate the refund period', async () => {
      const result = await supportAgent.run('Can I get a refund after 60 days?')
      await expect(result)
        .tool('search_knowledge_base').toBeCalled()
        .score('faithfulness').toBeGreaterThan(8)
        .run()
    })
  })

  suite('Escalation', () => {
    test('should escalate when unable to help', async () => {
      const result = await supportAgent.run('I want to speak to a human')
      await expect(result)
        .tool('escalate_to_human').toBeCalled()
        .run()
    })

    test('should not escalate for simple queries', async () => {
      const result = await supportAgent.run('What are your business hours?')
      await expect(result)
        .tool('escalate_to_human').not.toBeCalled()
        .run()
    })
  })

  suite('Multi-turn Conversation', () => {
    test('should maintain context across turns', async () => {
      const session = supportAgent.session()
      await session.run('I need to return an order')
      const result2 = await session.run('The order number is #12345')
      await expect(result2)
        .output().toMatchRegex(/order.*12345|#12345|return/i)
        .run()
    })
  })
})
```

### 3.4 Directory Structure After `agentbench init`

```
my-agent-tests/
├── agentbench.config.ts          # Main configuration
├── src/
│   └── agent.ts                  # Your agent under test (Hello Agent starter)
├── tests/
│   ├── setup.ts                  # Global test setup
│   ├── teardown.ts               # Global test teardown
│   ├── hello-agent.test.ts       # First test (generated by init)
│   ├── hello-agent.test.snap     # Snapshot for replay tests
│   └── __snapshots__/            # Auto-generated snapshots
├── dataset/
│   ├── hello-agent.queries.csv   # Sample test queries
│   └── README.md                 # Dataset format guide
├── examples/
│   └── hello-agent/              # The generated example as a standalone project
├── report/                       # Generated test reports (gitignored)
├── .agentbench/                  # Internal state (gitignored)
│   ├── snapshots/
│   ├── traces/
│   └── cache/
├── .env                          # API keys (gitignored)
├── .env.example                  # Template for API keys
├── .github/
│   └── workflows/
│       └── agentbench.yml        # Auto-generated CI workflow
├── .gitignore                    # Updated with AgentBench entries
└── package.json                  # With agentbench devDependency
```

### 3.5 `agentbench test` — The Test Command

#### 3.5.1 Default Output

```
$ agentbench test

▶ AgentBench v0.3.0 — Running tests for "my-agent-tests"

  Model: openai/gpt-4o  |  Concurrency: 4  |  Timeout: 30s

  Running 5 test(s) in 2 suite(s)...

  ✓  Customer Support Agent › Greeting
     should welcome the customer (1.2s, 342 tokens, $0.0034)

  ✓  Customer Support Agent › Refund Policy
     should call the refund_policy tool (0.8s, 256 tokens, $0.0026)

  ✓  Customer Support Agent › Refund Policy
     should not hallucinate the refund period (1.5s, 412 tokens, $0.0041)

  ✓  Customer Support Agent › Escalation
     should escalate when unable to help (0.9s, 198 tokens, $0.0020)

  ✗  Customer Support Agent › Escalation
     should not escalate for simple queries (FAILED)

     ┌─────────────────────────────────────────────────────────────┐
     │  Assertion failed: tool("escalate_to_human").not.toBeCalled() │
     │                                                               │
     │  Expected: tool "escalate_to_human" was NOT called              │
     │  Received: tool "escalate_to_human" was called 1 time           │
     │                                                               │
     │  Agent output: "I'll connect you with a human agent..."        │
     │                                                               │
     │  ▶ View full trace: agentbench replay --run run_abc123         │
     └─────────────────────────────────────────────────────────────┘

──────────────────────────────────────────────────────────────────
  Tests:  4 passed, 1 failed, 5 total
  Suites: 1 passed, 1 failed, 2 total
  Time:   5.6s
  Tokens: 1,756 (prompt: 1,012, completion: 744)
  Cost:   $0.0176
──────────────────────────────────────────────────────────────────

  ✗ 1 test failed. Check the report for details:
    ▶ HTML Report:  report/index.html
    ▶ JSON Report:  report/results.json
```

#### 3.5.2 Watch Mode

```
$ agentbench test --watch

  👀 Watching for changes in tests/ and src/...

  ── File changed: src/agent.ts ──

  Re-running...

  ✓  Customer Support Agent › Greeting             (1.3s)
  ✓  Customer Support Agent › Refund Policy         (0.9s)
  ✓  Customer Support Agent › Refund Policy (2)     (1.4s)
  ✓  Customer Support Agent › Escalation            (0.8s)
  ✓  Customer Support Agent › Escalation (2)        (1.1s)

  All 5 tests passed. (5.5s, $0.0182)

  Press 'q' to quit, 'r' to re-run, 'f' to filter
```

#### 3.5.3 CLI Flags

| Flag | Description |
|------|-------------|
| `--suite <name>` | Run a specific suite |
| `--test <name>` | Run a specific test |
| `--grep <pattern>` | Run tests matching pattern |
| `--watch` | Watch mode — re-run on file changes |
| `--ui` | Open the interactive test UI |
| `--json` | Output results as JSON |
| `--junit` | Output results as JUnit XML |
| `--replay` | Run in replay mode (cached responses, no LLM cost) |
| `--update-snapshots` | Update stored snapshots |
| `--coverage` | Generate coverage report |
| `--verbose` | Show full traces on failure |
| `--debug` | Show debug output (request/response bodies) |
| `--concurrency <n>` | Max parallel tests |
| `--timeout <ms>` | Per-test timeout |
| `--retry <n>` | Retry failed tests n times |
| `--ci` | CI mode: JSON + JUnit output, non-interactive |
| `--no-cost` | Don't display cost estimates |

### 3.6 DX Optimizations

#### 3.6.1 Zero-Config Philosophy

Following Jest/Vitest convention: everything has sensible defaults.

```bash
# The only required files after init:
# - agentbench.config.ts   (generated, works out of the box)
# - tests/*.test.ts        (generated with Hello Agent example)

# Everything else is optional.
```

#### 3.6.2 Progressive Disclosure

| Experience Level | What They See |
|-----------------|---------------|
| **First-time user** | `agentbench init` → pick template → `agentbench test` → green ✓ |
| **Week 2 user** | Adds custom assertions, tweaks config, adds more test suites |
| **Power user** | Custom judges, CI integration, replay strategies, coverage thresholds, custom reporters |
| **Enterprise user** | Dashboard, team collaboration, webhooks, benchmark marketplace |

#### 3.6.3 Smart Defaults

| Setting | Default | Rationale |
|---------|---------|-----------|
| Test directory | `tests/` | Matches Jest, Vitest, Playwright convention |
| Config file | `agentbench.config.ts` | TypeScript-first, like `vitest.config.ts` |
| Snapshot directory | `.agentbench/snapshots/` | Hidden, like `.git/` |
| Report directory | `report/` | Gitignored generated artifacts |
| Assertion timeout | 30s | Generous for LLM calls |
| Retry count | 2 | Handles LLM non-determinism |
| Score threshold | 7/10 | Reasonable default for quality |
| Judge model | `gpt-4o-mini` | Cheap, fast, good enough for judging |

#### 3.6.4 Familiar Patterns

AgentBench deliberately mirrors Jest/Vitest APIs:

```typescript
// Jest                          → AgentBench
test('name', async () => {...})  // Same
suite('name', () => {...})       // Like describe()
expect(value).toBe(x)            // Like Jest's expect
expect(result).toMatchSnapshot() // Like Jest snapshots
test.only('name', ...)           // Like test.only()
test.skip('name', ...)           // Like test.skip()
beforeAll(() => {...})           // Same
afterAll(() => {...})            // Same
```

#### 3.6.5 Error Message Quality

AgentBench errors should be as helpful as Rust compiler errors:

```
✗ Assertion failed: tool("search_knowledge_base").toBeCalled()

  Expected: agent called tool "search_knowledge_base"
  Received: agent called these tools instead:
    • "get_current_weather" (1 time)
    • "calculate" (2 times)

  The agent didn't call the expected tool. This might mean:
  1. The tool name in your assertion doesn't match the agent's tool name
  2. The prompt isn't guiding the agent to use the right tool
  3. The agent is hallucinating a tool that doesn't exist

  ▶ View full trace: agentbench replay --run run_xyz789
  ▶ Compare with last passing run: agentbench compare run_xyz789 run_abc123
  ▶ Documentation: https://agentbench.dev/docs/assertions/tool-assertions
```

### 3.7 Configuration Resolution

Following the same pattern as Jest, Vitest, and Playwright:

```
1. CLI flags (highest priority)
2. agentbench.config.ts (local)
3. agentbench.config.js
4. agentbench.config.mjs
5. agentbench.config.json
6. "agentbench" key in package.json
7. Environment variables (AGENTBENCH_*)
8. Built-in defaults (lowest priority)
```

### 3.8 Global vs Local Installation

```
# Option 1: Global install (recommended for individuals)
npm install -g agentbench
agentbench init && agentbench test

# Option 2: Local devDependency (recommended for teams)
npm install --save-dev agentbench
npx agentbench init && npx agentbench test

# Option 3: No install (try before you commit)
npx agentbench init && npx agentbench test
```

---

## 4. Official Examples

### 4.1 Philosophy

Current examples (v0.2.0) are demos — they show the API works. v0.3.0 examples are **reference implementations** — production-quality agent projects that happen to have comprehensive test suites.

Each example must answer: "How do I test *this kind* of agent?"

### 4.2 Example Catalog

```
examples/
├── hello-agent/                  # ← The starter template (generated by init)
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/agent.ts
│   ├── tests/
│   │   ├── greeting.test.ts
│   │   ├── factual.test.ts
│   │   └── replay.test.ts
│   └── dataset/
│       └── queries.csv
│
├── customer-support-agent/       # ← Multi-turn, tool-calling, RAG
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts              # LangGraph-based support agent
│   │   ├── tools.ts              # search_kb, escalate, create_ticket
│   │   └── prompts.ts            # System prompt with variants
│   ├── tests/
│   │   ├── greeting.test.ts
│   │   ├── refund-policy.test.ts
│   │   ├── escalation.test.ts
│   │   ├── multi-turn.test.ts
│   │   └── regression.test.ts    # Snapshot-based regression suite
│   ├── dataset/
│   │   ├── customer-queries.csv  # 200 real customer queries
│   │   └── expected-tools.json   # Expected tool calls per query
│   └── .github/
│       └── workflows/
│           └── agentbench.yml
│
├── research-agent/               # ← Multi-step, source verification
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts              # Multi-step research with web search
│   │   ├── tools.ts              # search_web, fetch_page, summarize
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── research-quality.test.ts
│   │   ├── source-verification.test.ts
│   │   ├── citation-accuracy.test.ts
│   │   └── hallucination.test.ts
│   └── dataset/
│       └── research-questions.csv
│
├── rag-agent/                    # ← Retrieval-augmented generation
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── retriever.ts          # Vector DB integration
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── retrieval-quality.test.ts
│   │   ├── grounding.test.ts
│   │   ├── context-window.test.ts
│   │   └── latency-budget.test.ts
│   └── dataset/
│       ├── documents/             # Sample knowledge base
│       └── queries.csv
│
├── sql-agent/                    # ← Text-to-SQL, schema awareness
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── db-schema.ts          # Schema introspector
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── select-queries.test.ts
│   │   ├── join-queries.test.ts
│   │   ├── aggregation.test.ts
│   │   ├── sql-injection.test.ts
│   │   └── schema-awareness.test.ts
│   └── dataset/
│       ├── schema.sql
│       ├── seed.sql
│       └── queries.csv
│
├── code-review-agent/            # ← Code analysis, security review
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── tools.ts              # read_file, git_diff, lint
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── security-review.test.ts
│   │   ├── code-quality.test.ts
│   │   ├── false-positive.test.ts
│   │   └── large-diff.test.ts
│   └── dataset/
│       └── sample-code/          # Vulnerable + correct code samples
│
├── coding-agent/                 # ← Code generation, edit-apply loop
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── tools.ts              # write_file, run_test, git_commit
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── code-generation.test.ts
│   │   ├── bug-fix.test.ts
│   │   ├── refactoring.test.ts
│   │   └── test-driven.test.ts
│   └── dataset/
│       └── tasks.jsonl           # {"task": "...", "expectedOutput": "...", ...}
│
├── tool-calling-agent/           # ← Complex tool orchestration
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── tools.ts              # 10+ tools with complex schemas
│   │   └── prompts.ts
│   ├── tests/
│   │   ├── tool-selection.test.ts
│   │   ├── parallel-tools.test.ts
│   │   ├── tool-ordering.test.ts
│   │   ├── error-handling.test.ts
│   │   └── tool-schema-adherence.test.ts
│   └── dataset/
│       └── scenarios.json
│
├── mcp-agent/                    # ← Model Context Protocol
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   └── mcp-server.ts         # Custom MCP server for testing
│   ├── tests/
│   │   ├── tool-discovery.test.ts
│   │   ├── resource-access.test.ts
│   │   ├── multi-server.test.ts
│   │   └── mcp-lifecycle.test.ts
│   └── dataset/
│       └── mcp-configs/
│
├── langgraph-agent/              # ← LangGraph workflow testing
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── graph.ts              # LangGraph state graph
│   │   ├── nodes.ts              # Custom nodes
│   │   └── state.ts              # State schema
│   ├── tests/
│   │   ├── workflow-paths.test.ts
│   │   ├── state-transitions.test.ts
│   │   ├── conditional-edges.test.ts
│   │   └── human-in-loop.test.ts
│   └── dataset/
│       └── graph-scenarios.json
│
├── openai-agent-sdk/             # ← OpenAI Agents SDK
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── tools.ts
│   │   └── guardrails.ts
│   ├── tests/
│   │   ├── guardrail.test.ts
│   │   ├── handoff.test.ts
│   │   ├── tool-use.test.ts
│   │   └── tracing.test.ts
│   └── dataset/
│       └── scenarios.json
│
├── crewai-agent/                 # ← CrewAI multi-agent
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── crew.ts               # CrewAI crew definition
│   │   ├── agents.ts             # Agent role definitions
│   │   └── tasks.ts              # Task definitions
│   ├── tests/
│   │   ├── task-completion.test.ts
│   │   ├── agent-delegation.test.ts
│   │   ├── sequential-workflow.test.ts
│   │   └── output-quality.test.ts
│   └── dataset/
│       └── crew-tasks.json
│
├── llamaindex-agent/             # ← LlamaIndex agent
│   ├── README.md
│   ├── agentbench.config.ts
│   ├── src/
│   │   ├── agent.ts
│   │   ├── index.ts              # LlamaIndex setup
│   │   └── tools.ts
│   ├── tests/
│   │   ├── query-engine.test.ts
│   │   ├── chat-engine.test.ts
│   │   ├── tool-integration.test.ts
│   │   └── index-quality.test.ts
│   └── dataset/
│       └── documents/
│
└── multi-agent-workflow/         # ← Complex multi-agent orchestration
    ├── README.md
    ├── agentbench.config.ts
    ├── src/
    │   ├── orchestrator.ts       # Multi-agent orchestrator
    │   ├── agents/               # Individual agent definitions
    │   │   ├── researcher.ts
    │   │   ├── writer.ts
    │   │   ├── reviewer.ts
    │   │   └── coordinator.ts
    │   └── tools/
    ├── tests/
    │   ├── orchestration.test.ts
    │   ├── handoff.test.ts
    │   ├── consensus.test.ts
    │   ├── concurrency.test.ts
    │   └── failure-recovery.test.ts
    └── dataset/
        └── workflows.json
```

### 4.3 Example README Template

Each example's README follows this structure:

```markdown
# [Agent Type] — AgentBench Example

**Reading time:** 5 min
**Prerequisites:** Node.js ≥ 20, OpenAI API key
**What you'll learn:** How to test a [agent type] with assertions, replay, and CI

## Quick Start

```bash
cd examples/[agent-name]
cp .env.example .env  # Add your API key
npm install
agentbench test
```

## Architecture

[Diagram showing agent structure — tools, prompts, flow]

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| Greeting   | Agent introduces itself correctly | Output + Score |
| Tool Use   | Agent calls the right tool with right args | Tool + Output |
| ...        | ...             | ...            |

## Running Individual Tests

```bash
agentbench test --suite "Greeting"
agentbench test --test "should welcome the customer"
agentbench test --grep "refund"
```

## Replay (Zero-Cost Testing)

```bash
agentbench test --replay       # No LLM calls, instant
```

## Compare Mode

```bash
# After changing a prompt or model:
agentbench compare --baseline last-good-run
```

## CI Integration

This example includes a `.github/workflows/agentbench.yml` that runs on every PR.

## Expected Output

```
✓ Greeting › should welcome the customer (1.2s, $0.003)
✓ Tool Use › should call the right tool (0.8s, $0.002)
...
Tests: 8 passed, 8 total
```

## Key Takeaways

1. Use `tool().toBeCalled()` to verify agent behavior, not just output
2. Use replay mode for fast, cost-free regression testing
3. Set score thresholds based on your quality bar
4. Run in CI to catch regressions before merging
```

### 4.4 Example Quality Bar

Each official example MUST:

- [ ] Run `agentbench test` and pass with 100% success rate
- [ ] Include at least 3 test suites
- [ ] Include at least 8 test cases total
- [ ] Demonstrate at least 3 different assertion types (tool, output, score, latency, tokens)
- [ ] Include a replay test suite
- [ ] Include a CI workflow file
- [ ] Have a README following the template above
- [ ] Be reproducible (no hardcoded secrets; use .env)
- [ ] Include a dataset of at least 20 test inputs
- [ ] Have expected output documented in README

---

## 5. Provider Plugin Ecosystem

### 5.1 Design Goals

1. **Uniform Interface** — Every provider exposes the same API surface
2. **Pluggable** — Third-party providers can be installed as npm packages
3. **Auto-detection** — Providers auto-register when detected in `node_modules`
4. **Tree-shakeable** — Only load providers you use
5. **Testable** — Every provider can be mocked/replayed

### 5.2 Unified Provider Interface

```typescript
// @agentbench/core — Provider Interface

/**
 * The canonical provider interface.
 * Every provider (OpenAI, Anthropic, Gemini, etc.) implements this.
 */
interface AgentBenchProvider {
  /** Unique provider ID */
  readonly id: string

  /** Human-readable name */
  readonly name: string

  /** Provider version */
  readonly version: string

  /** Supported capabilities */
  readonly capabilities: ProviderCapabilities

  // ── Core Methods ──────────────────────────────────────

  /** Create a chat completion (non-streaming) */
  createChatCompletion(
    params: ChatCompletionParams
  ): Promise<ChatCompletionResult>

  /** Create a streaming chat completion */
  createStreamingChatCompletion(
    params: ChatCompletionParams
  ): AsyncGenerator<StreamChunk>

  /** Count tokens for a given input */
  countTokens(params: TokenCountParams): Promise<TokenCountResult>

  /** Calculate cost for a completion */
  calculateCost(usage: Usage, model: string): CostBreakdown

  // ── Lifecycle ─────────────────────────────────────────

  /** Initialize the provider (called once at startup) */
  initialize(config: ProviderConfig): Promise<void>

  /** Health check */
  healthCheck(): Promise<HealthStatus>

  /** Cleanup (called on shutdown) */
  dispose(): Promise<void>
}

interface ProviderCapabilities {
  streaming: boolean
  reasoning: boolean           // o1, o3, Claude thinking
  embeddings: boolean
  toolCalling: boolean
  vision: boolean
  functionCalling: boolean
  jsonMode: boolean
  maxContextWindow: number
  supportedModels: string[]
}
```

### 5.3 Provider Catalog

| Provider | Package | Capabilities | Priority |
|----------|---------|-------------|----------|
| **OpenAI** | `@agentbench/openai` | streaming, reasoning, embeddings, tool-calling, vision, function-calling, JSON mode | P0 — Exists, enhance |
| **Anthropic** | `@agentbench/anthropic` | streaming, reasoning, tool-calling, vision | P0 — Exists, enhance |
| **Gemini** | `@agentbench/gemini` | streaming, embeddings, tool-calling, vision, JSON mode | P0 — New |
| **DeepSeek** | `@agentbench/deepseek` | streaming, reasoning, tool-calling, JSON mode | P0 — New |
| **Azure OpenAI** | `@agentbench/azure-openai` | streaming, embeddings, tool-calling, vision, function-calling | P1 — New |
| **OpenRouter** | `@agentbench/openrouter` | streaming, tool-calling (pass-through to 200+ models) | P1 — New |
| **Groq** | `@agentbench/groq` | streaming, tool-calling, JSON mode (fast inference) | P1 — New |
| **Mistral** | `@agentbench/mistral` | streaming, embeddings, tool-calling, JSON mode | P2 — New |
| **Cohere** | `@agentbench/cohere` | streaming, embeddings, tool-calling | P2 — New |
| **Ollama** | `@agentbench/ollama` | streaming, embeddings, tool-calling, JSON mode | P2 — New |
| **vLLM** | `@agentbench/vllm` | streaming, tool-calling (OpenAI-compatible) | P2 — New |
| **LM Studio** | `@agentbench/lm-studio` | streaming, tool-calling (OpenAI-compatible) | P2 — New |

### 5.4 OpenAI-Compatible Adapter

Many providers (vLLM, LM Studio, Ollama, OpenRouter, Groq) implement the OpenAI API format. A shared base adapter eliminates duplication:

```typescript
// @agentbench/provider-utils

/**
 * Base class for any provider that speaks the OpenAI chat completions protocol.
 * Ollama, vLLM, LM Studio, Groq, OpenRouter all extend this.
 */
abstract class OpenAICompatibleProvider implements AgentBenchProvider {
  abstract readonly id: string
  abstract readonly name: string

  protected baseUrl: string
  protected apiKey: string

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(this.adaptParams(params)),
    })
    return this.adaptResponse(await response.json())
  }

  // Subclasses only need to implement these:
  abstract adaptParams(params: ChatCompletionParams): unknown
  abstract adaptResponse(raw: unknown): ChatCompletionResult
  abstract countTokens(params: TokenCountParams): Promise<TokenCountResult>
}
```

### 5.5 Third-Party Provider Development Guide

A developer should be able to add a new provider with minimal code:

```typescript
// my-custom-provider/src/index.ts

import { OpenAICompatibleProvider } from '@agentbench/provider-utils'

export class MyCustomProvider extends OpenAICompatibleProvider {
  readonly id = 'my-custom'
  readonly name = 'My Custom Provider'
  readonly version = '0.1.0'

  readonly capabilities = {
    streaming: true,
    reasoning: false,
    embeddings: false,
    toolCalling: true,
    vision: false,
    functionCalling: false,
    jsonMode: true,
    maxContextWindow: 128000,
    supportedModels: ['my-model-v1', 'my-model-v2'],
  }

  // Only these 3 methods are required:
  adaptParams(params) { /* translate to provider format */ }
  adaptResponse(raw) { /* translate to unified format */ }
  countTokens(params) { /* token counting logic */ }
  calculateCost(usage, model) { /* cost calculation */ }
}
```

Plug in via `agentbench.config.ts`:

```typescript
import { defineConfig } from 'agentbench'
import { MyCustomProvider } from 'my-custom-provider'

export default defineConfig({
  providers: {
    'my-custom': {
      provider: new MyCustomProvider(),
      apiKey: process.env.MY_CUSTOM_API_KEY,
      defaultModel: 'my-model-v1',
    },
  },
})
```

Or publish as an npm package `@agentbench/provider-my-custom` for auto-discovery.

### 5.6 Provider Package Structure

```
packages/
├── openai/                        # Existing
├── anthropic/                     # Existing
├── gemini/                        # NEW
│   ├── src/
│   │   ├── index.ts              # GeminiProvider
│   │   ├── adapter.ts            # Google AI SDK → Unified format
│   │   └── token-counter.ts      # Gemini token counting
│   ├── package.json
│   └── tsup.config.ts
├── deepseek/                      # NEW
├── azure-openai/                  # NEW
├── openrouter/                    # NEW
├── groq/                          # NEW
├── mistral/                       # NEW
├── cohere/                        # NEW
├── ollama/                        # NEW
├── vllm/                          # NEW
├── lm-studio/                     # NEW
└── provider-utils/                # NEW — Shared base classes
    ├── src/
    │   ├── index.ts
    │   ├── openai-compatible.ts   # Base for OpenAI-compatible providers
    │   ├── streaming.ts           # SSE parsing utilities
    │   ├── token-counter.ts       # tiktoken + heuristic counters
    │   └── cost-calculator.ts     # Unified cost calculation
    ├── package.json
    └── tsup.config.ts
```

### 5.7 Provider Auto-Discovery

At startup, AgentBench scans for installed provider packages:

```
1. Check agentbench.config.ts for explicit provider configs
2. Scan node_modules for @agentbench/provider-* packages
3. Check environment variables for API keys
4. Auto-register any discovered providers
5. Report which providers are available in `agentbench test --verbose`
```

---

## 6. Dataset System

### 6.1 Design Goals

1. **Format-agnostic** — CSV, JSON, JSONL, HuggingFace, OpenAI Evals, DeepEval, LangSmith
2. **Versioned** — Datasets have versions; you can diff between versions
3. **Splittable** — train/test/validation splits with stratification
4. **Importable/Exportable** — Move data between formats and tools
5. **CI-friendly** — Datasets are files; they live in your repo

### 6.2 Dataset Schema

```typescript
interface Dataset {
  /** Unique identifier */
  id: string

  /** Dataset metadata */
  meta: DatasetMeta

  /** Dataset items */
  items: DatasetItem[]

  /** Version history */
  versions: DatasetVersion[]
}

interface DatasetMeta {
  name: string
  description?: string
  version: string              // semver
  format: DatasetFormat
  author?: string
  license?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  itemCount: number
  schema?: JSONSchema           // Expected schema for items
}

interface DatasetItem {
  id: string
  input: string                 // The agent's input
  expected?: {                  // Optional expected behavior
    output?: string             // Expected output (for exact match)
    toolCalls?: ToolCall[]      // Expected tool calls
    contains?: string[]         // Strings that must appear in output
    notContains?: string[]      // Strings that must not appear
    schema?: JSONSchema         // Expected output schema
    metadata?: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
}

type DatasetFormat = 'csv' | 'json' | 'jsonl' | 'huggingface' | 'openai-evals' | 'deepeval' | 'langsmith'
```

### 6.3 CLI Commands

```bash
# Import data from any supported format
agentbench dataset import ./data/queries.csv --name "Customer Queries v1"
agentbench dataset import ./data/hf-dataset/ --format huggingface
agentbench dataset import https://huggingface.co/datasets/user/dataset --format huggingface
agentbench dataset import langsmith://dataset-id --format langsmith

# Export to any format
agentbench dataset export my-dataset --format csv --output ./export/
agentbench dataset export my-dataset --format jsonl --split test

# Validate dataset integrity
agentbench dataset validate my-dataset
# Checks: schema compliance, missing fields, duplicate IDs, item count mismatch

# Split a dataset
agentbench dataset split my-dataset --train 0.7 --test 0.2 --validation 0.1
agentbench dataset split my-dataset --stratify category  # Stratified by field

# Sample a dataset
agentbench dataset sample my-dataset --count 50
agentbench dataset sample my-dataset --percentage 0.1 --seed 42

# Version management
agentbench dataset version my-dataset                    # List versions
agentbench dataset version my-dataset --create v1.1      # Create new version
agentbench dataset version my-dataset --checkout v1.0    # Switch to specific version

# Diff between versions
agentbench dataset diff my-dataset v1.0 v1.1
# Shows: added, removed, modified items

# Compare two datasets
agentbench dataset compare dataset-a dataset-b
# Shows: overlap, unique items, schema differences
```

### 6.4 Dataset API (REST)

```
GET    /api/v1/datasets                    List datasets
POST   /api/v1/datasets                    Create dataset
GET    /api/v1/datasets/:id                Get dataset details
PUT    /api/v1/datasets/:id                Update dataset metadata
DELETE /api/v1/datasets/:id                Delete dataset
POST   /api/v1/datasets/:id/items          Add items
GET    /api/v1/datasets/:id/items          List items (paginated)
PUT    /api/v1/datasets/:id/items/:itemId  Update item
DELETE /api/v1/datasets/:id/items/:itemId  Delete item
POST   /api/v1/datasets/import             Import from external source
POST   /api/v1/datasets/:id/export         Export to format
POST   /api/v1/datasets/:id/split          Create train/test/val splits
GET    /api/v1/datasets/:id/versions       List versions
POST   /api/v1/datasets/:id/versions       Create version
POST   /api/v1/datasets/:id/validate       Validate dataset
```

### 6.5 Dataset SDK

```typescript
import { Dataset } from '@agentbench/core'

// Load from file
const ds = await Dataset.fromCSV('./queries.csv')
const ds = await Dataset.fromJSON('./queries.json')
const ds = await Dataset.fromJSONL('./queries.jsonl')
const ds = await Dataset.fromHuggingFace('user/dataset')
const ds = await Dataset.fromOpenAIEvals('./evals/')
const ds = await Dataset.fromDeepEval('./deep-eval/')
const ds = await Dataset.fromLangSmith('dataset-id')

// Validate
const report = ds.validate()
// { valid: true, errors: [], warnings: [{ item: 42, field: 'expected', message: '...' }] }

// Split
const { train, test, validation } = ds.split({ train: 0.7, test: 0.2, validation: 0.1 })

// Sample
const sample = ds.sample(100)

// Version
ds.createVersion('v1.1')
const old = ds.checkout('v1.0')

// Diff
const diff = ds.diff(old)
// { added: 5, removed: 2, modified: [{ itemId: 12, changes: [...] }] }

// Iterate
for await (const item of ds) {
  const result = await agent.run(item.input)
  // ...
}
```

### 6.6 Dataset Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  Datasets                                         [+ Import] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Customer Queries v1.2          CSV · 2,341 items    │     │
│  │  Updated 2 days ago            ▸ View ▸ Split ▸ ... │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  Support Tickets v3.0          JSONL · 15,892 items  │     │
│  │  Updated 5 hours ago           ▸ View ▸ Split ▸ ... │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  Code Review Tasks v1.0        JSON · 500 items      │     │
│  │  Updated 1 week ago            ▸ View ▸ Split ▸ ... │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.7 Database Schema (Prisma Additions)

```prisma
model Dataset {
  id          String   @id @default(uuid())
  name        String
  description String?
  format      String   // csv, json, jsonl, huggingface, openai-evals, deepeval, langsmith
  version     String   @default("1.0.0")
  author      String?
  license     String?
  tags        String[] @default([])
  itemCount   Int      @default(0)
  schema      Json?    // JSON Schema for item validation
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items    DatasetItem[]
  versions DatasetVersion[]
  runs     TestRun[]

  @@index([name])
  @@index([format])
}

model DatasetItem {
  id        String   @id @default(uuid())
  datasetId String
  input     String
  expected  Json?    // Optional expected output
  metadata  Json?    // Arbitrary metadata
  order     Int      @default(0)
  createdAt DateTime @default(now())

  dataset Dataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  @@index([datasetId])
}

model DatasetVersion {
  id        String   @id @default(uuid())
  datasetId String
  version   String
  itemCount Int
  diff      Json?    // Diff from previous version
  createdAt DateTime @default(now())

  dataset Dataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  @@unique([datasetId, version])
}
```

---

## 7. GitHub Integration

### 7.1 Design Goals

1. **Zero-Config** — `agentbench init` generates the workflow file
2. **PR Comments** — Rich, actionable feedback on every PR
3. **Checks API** — Native GitHub check runs with pass/fail status
4. **Regression Detection** — Automatically flags when an agent gets worse
5. **Cost Tracking** — Shows cost impact of changes right in the PR

### 7.2 GitHub Actions Workflow

```yaml
# .github/workflows/agentbench.yml
name: AgentBench

on:
  pull_request:
    paths:
      - 'src/agent/**'
      - 'prompts/**'
      - 'tools/**'
      - 'agentbench.config.*'
      - 'tests/**'
      - 'dataset/**'
  push:
    branches: [main]

jobs:
  agent-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run AgentBench
        id: agentbench
        uses: agentbench/github-action@v0.3
        with:
          mode: pr-check           # 'pr-check' | 'regression' | 'full'
          fail-on-regression: true
          comment-on-pr: true
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentbench-report
          path: report/
```

### 7.3 PR Comment Template

```markdown
## 🤖 AgentBench Report

> **Commit:** abc1234 → def5678
> **Workflow:** [AgentBench Run #42](https://github.com/user/repo/actions/runs/123)

### 📊 Summary

| Metric | Baseline | This PR | Change |
|--------|----------|---------|--------|
| **Overall Score** | 8.2 / 10 | 7.9 / 10 | **-0.3** ⚠️ |
| **Pass Rate** | 24/25 (96%) | 23/25 (92%) | **-1 test** ❌ |
| **Avg Latency** | 1.2s | 1.4s | +0.2s |
| **Avg Tokens** | 850 | 920 | +70 |
| **Cost per Run** | $0.0085 | $0.0092 | +$0.0007 |

### 🔴 Regression Detected

**Test:** Customer Support > Refund Policy > should not hallucinate refund period

| | Baseline (main) | This PR |
|--|----------------|---------|
| **Score** | 8.5 | 6.2 |
| **Faithfulness** | 9.0 | 5.5 |
| **Tool called** | search_knowledge_base ✓ | search_knowledge_base ✓ |

**Suspected cause:** The prompt change in `src/agent/prompts.ts:42` reduced the system prompt specificity about refund policies. The agent now includes information not found in the knowledge base.

<details>
<summary>🔍 View Full Diff</summary>

```diff
- You MUST only use information from the knowledge base. Never fabricate policies.
+ Answer the customer's question accurately and helpfully.
```

</details>

### ✅ Passing Tests (23/25)

<details>
<summary>View all passing tests</summary>

| Test | Score | Latency | Tokens |
|------|-------|---------|--------|
| Greeting › should welcome | 9.2 | 0.8s | 234 |
| Refund Policy › should call tool | 8.8 | 1.1s | 312 |
| ... | ... | ... | ... |

</details>

### ❌ Failing Tests (2/25)

| Test | Failure |
|------|---------|
| Refund Policy › should not hallucinate | Score 6.2 < threshold 7.0 |
| Escalation › should escalate | Tool `escalate_to_human` was not called |

---

<sub>🤖 Generated by [AgentBench](https://agentbench.dev) · [View Full Report](https://github.com/user/repo/actions/runs/123) · [Replay Locally](https://agentbench.dev/docs/ci#replay)</sub>
```

### 7.4 GitHub Check Runs API

```
POST /repos/{owner}/{repo}/check-runs

{
  "name": "AgentBench",
  "head_sha": "def5678",
  "status": "completed",
  "conclusion": "failure",   // "success" | "failure" | "neutral"
  "output": {
    "title": "AgentBench: 1 regression detected",
    "summary": "23/25 tests passed. 1 regression in refund policy test.",
    "text": "..."
  }
}
```

### 7.5 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       GitHub PR Event                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              GitHub Actions Runner                     │    │
│  │                                                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │ Checkout │→│ agentbench│→│ agentbench/action │   │    │
│  │  │   PR     │  │   test   │  │   post-comment    │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │    │
│  │                      │                               │    │
│  │                      ▼                               │    │
│  │          ┌──────────────────────┐                    │    │
│  │          │  AgentBench Engine   │                    │    │
│  │          │                      │                    │    │
│  │          │  1. Replay baseline  │                    │    │
│  │          │  2. Run tests        │                    │    │
│  │          │  3. Evaluate         │                    │    │
│  │          │  4. Regression check │                    │    │
│  │          │  5. Compare          │                    │    │
│  │          │  6. Generate report  │                    │    │
│  │          └──────────────────────┘                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  GitHub API                                            │    │
│  │  ├── POST /repos/:owner/:repo/check-runs              │    │
│  │  └── POST /repos/:owner/:repo/issues/:num/comments    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 7.6 GitHub App (Future)

Beyond Actions, a GitHub App would enable:

- **Comment on every PR** without Actions setup
- **Required status checks** — block merging if AgentBench fails
- **Webhook-driven** — faster than scheduled Actions
- **Managed secrets** — no need to configure API keys in repo settings

This is scoped for v0.4+.

---

## 8. VS Code Extension

### 8.1 Design Goals

1. **Run tests from the editor** — like Jest and Playwright extensions
2. **Visual trace viewer** — inspect agent execution step by step
3. **Inline diagnostics** — see assertion failures in the code
4. **Status bar integration** — test status at a glance
5. **One-click replay** — replay any run directly from the editor

### 8.2 Extension Architecture

```
agentbench-vscode/
├── package.json                  # Extension manifest
├── tsconfig.json
├── src/
│   ├── extension.ts              # Activation entry point
│   ├── commands.ts               # Command palette registrations
│   ├── testRunner.ts             # Test execution integration
│   ├── traceViewer.ts            # Trace visualization panel
│   ├── codeLens.ts               # CodeLens provider (Run | Debug | Replay)
│   ├── statusBar.ts              # Status bar item
│   ├── diagnostics.ts            # Diagnostic collection
│   ├── treeView.ts               # Sidebar tree view provider
│   ├── coverage.ts               # Coverage visualization
│   └── config.ts                 # Extension configuration
├── webview/
│   ├── trace-viewer/             # Trace viewer webview (React)
│   │   ├── index.html
│   │   ├── app.tsx
│   │   ├── components/
│   │   │   ├── TraceTimeline.tsx
│   │   │   ├── StepDetail.tsx
│   │   │   ├── ToolCallCard.tsx
│   │   │   ├── TokenUsage.tsx
│   │   │   └── ScoreBreakdown.tsx
│   │   └── styles.css
│   ├── report-viewer/            # Report viewer webview
│   └── compare-viewer/           # Side-by-side compare viewer
└── media/
    ├── icon.png
    └── icon-dark.png
```

### 8.3 Commands (Command Palette)

| Command | ID | Description |
|---------|-----|-------------|
| **AgentBench: Run All Tests** | `agentbench.test.runAll` | Run all tests in the workspace |
| **AgentBench: Run Current Test** | `agentbench.test.runCurrent` | Run the test at cursor |
| **AgentBench: Run Test Suite** | `agentbench.test.runSuite` | Run the suite containing the cursor |
| **AgentBench: Debug Test** | `agentbench.test.debug` | Run test with debugger attached |
| **AgentBench: Replay Last Run** | `agentbench.replay.last` | Replay the most recent test run |
| **AgentBench: Replay Run...** | `agentbench.replay.select` | Select a run to replay |
| **AgentBench: View Trace** | `agentbench.trace.view` | Open trace viewer for last/selected run |
| **AgentBench: Compare Runs...** | `agentbench.compare.select` | Select two runs to compare |
| **AgentBench: Show Coverage** | `agentbench.coverage.show` | Show coverage report |
| **AgentBench: Update Snapshots** | `agentbench.snapshot.update` | Update all snapshots |
| **AgentBench: Create Snapshot** | `agentbench.snapshot.create` | Create snapshot from current run |
| **AgentBench: Open Dashboard** | `agentbench.dashboard.open` | Open web dashboard |
| **AgentBench: Initialize Project** | `agentbench.init` | Run `agentbench init` |

### 8.4 UI Components

#### 8.4.1 Sidebar Tree View

```
┌──────────────────────────┐
│ AGENTBENCH               │
│                          │
│ ▶ RUN                    │
│   ▸ Run All Tests        │
│   ▸ Run Failed Tests     │
│   ▸ Debug Last Run       │
│                          │
│ ▶ HISTORY                │
│   ✓ run_abc123 (2m ago)  │
│   ✗ run_def456 (5m ago)  │
│   ✓ run_ghi789 (1h ago)  │
│   ...                    │
│                          │
│ ▶ TEST SUITES            │
│   Customer Support (4/4) │
│   ▸ Greeting             │
│   ▸ Refund Policy        │
│   ▸ Escalation           │
│   ▸ Multi-turn           │
│                          │
│ ▶ COVERAGE               │
│   Prompt:     ████████░ 85%│
│   Workflow:   ██████░░░ 65%│
│   Tool:       █████████ 92%│
│   Edge Case:  ████░░░░░ 42%│
│                          │
│ ▶ SNAPSHOTS (12)         │
└──────────────────────────┘
```

#### 8.4.2 CodeLens

```
  ┌──────────────────────────────────────────────────────────┐
  │  ▶ Run │ 🐛 Debug │ 📊 Replay │ 📸 Snapshot              │  ← CodeLens
  │                                                          │
  │  test('should welcome the customer', async () => {       │
  │    const result = await supportAgent.run('Hello!')        │
  │    await expect(result)                                   │
  │      .status().toBeCompleted()     ✓ (1.2s)              │  ← Inline result
  │      .output().toContain('help')   ✓                     │
  │      .tokens().toBeLessThan(1000)  ✓ (342 tokens)        │
  │      .run()                                               │
  │  })                                                       │
  └──────────────────────────────────────────────────────────┘
```

#### 8.4.3 Status Bar

```
┌──────────────────────────────────────────────────────────────┐
│  AgentBench: ✓ 24/25  |  ⚡ 5.6s  |  💰 $0.0176             │
└──────────────────────────────────────────────────────────────┘
```

Clicking the status bar item opens a menu:
- Show test output
- View last report
- Run all tests
- Toggle watch mode

#### 8.4.4 Diagnostics

Failed assertions appear as VS Code diagnostics in the Problems panel:

```
Problems (2)
  ⚠️ tests/refund-policy.test.ts:15 — Score below threshold: 6.2 < 7.0
  ❌ tests/escalation.test.ts:8 — Tool "escalate_to_human" was not called
```

#### 8.4.5 Trace Viewer (Webview Panel)

```
┌──────────────────────────────────────────────────────────────┐
│  Trace: run_abc123 — Customer Support › Refund Policy        │
│                                                              │
│  ┌─ Timeline ───────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Step 1: LLM Call (gpt-4o)           342ms      │  │   │
│  │  │ ├─ System prompt (1,024 tokens)                │  │   │
│  │  │ ├─ User message: "What is your refund policy?" │  │   │
│  │  │ └─ Response: tool_call → search_knowledge_base │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │         │                                             │   │
│  │         ▼                                             │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Step 2: Tool Call (search_knowledge_base) 12ms │  │   │
│  │  │ ├─ Query: "refund policy"                       │  │   │
│  │  │ └─ Result: "Customers can return items..."      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │         │                                             │   │
│  │         ▼                                             │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Step 3: LLM Call (gpt-4o)           456ms      │  │   │
│  │  │ ├─ Tool result (156 tokens)                     │  │   │
│  │  │ └─ Response: "Our refund policy allows..."      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Scores ─────────────────────────────────────────────┐   │
│  │  Correctness:  █████████░ 9.2                         │   │
│  │  Faithfulness: ████████░░ 8.5                         │   │
│  │  Safety:       ██████████ 9.8                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Token Usage ─────────────────────────────────────────┐   │
│  │  Prompt: 1,180  │  Completion: 234  │  Total: 1,414    │   │
│  │  Cost: $0.0042                                        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 8.5 Implementation Plan

| Phase | Deliverable | Effort |
|-------|------------|--------|
| **P0** | Extension scaffold + Run/Debug commands + CodeLens + Status Bar | 2 weeks |
| **P1** | Tree View + Diagnostics + Snapshot management | 2 weeks |
| **P2** | Trace Viewer webview + Compare Viewer | 2 weeks |
| **P3** | Coverage visualization + History + Settings | 1 week |

---

## 9. Benchmark Marketplace

### 9.1 Vision

The AgentBench Benchmark Marketplace is to AI agent testing what:

- **Docker Hub** is to containers
- **PyPI / npm** is to packages
- **HuggingFace Hub** is to models and datasets

It is a centralized registry where anyone can publish, discover, download, and run standardized agent benchmarks.

### 9.2 Marketplace Model

```
┌──────────────────────────────────────────────────────────────┐
│                  Benchmark Marketplace                        │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │  Publisher │  │  Consumer  │  │  Platform             │   │
│  │            │  │            │  │                       │   │
│  │  • Upload  │  │  • Browse  │  │  • Host & serve       │   │
│  │  • Version │  │  • Search  │  │  • Validate uploads   │   │
│  │  • License │  │  • Install │  │  • Leaderboard        │   │
│  │  • Monitor │  │  • Run     │  │  • Review & approve   │   │
│  │            │  │  • Compare │  │  • Rate & review      │   │
│  └────────────┘  └────────────┘  └──────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Benchmark Schema

```typescript
interface Benchmark {
  /** Unique identifier */
  id: string

  /** Metadata */
  meta: BenchmarkMeta

  /** Test suites */
  suites: BenchmarkSuite[]

  /** Required providers */
  providers: string[]

  /** Dataset (bundled or referenced) */
  dataset: Dataset | string

  /** Expected results / baseline */
  baseline?: BenchmarkBaseline

  /** Leaderboard entries */
  leaderboard: LeaderboardEntry[]
}

interface BenchmarkMeta {
  name: string
  slug: string                // URL-friendly ID
  description: string
  longDescription?: string    // Markdown
  version: string
  author: {
    name: string
    email?: string
    url?: string
  }
  license: 'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'custom'
  category: BenchmarkCategory
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  readme?: string
  homepage?: string
  repository?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
  downloads: number
  rating: number              // 1-5 stars
  ratingsCount: number
  status: 'draft' | 'pending_review' | 'published' | 'deprecated'
}

type BenchmarkCategory =
  | 'customer-support'
  | 'medical'
  | 'finance'
  | 'coding'
  | 'sql'
  | 'writing'
  | 'research'
  | 'rag'
  | 'mcp'
  | 'tool-calling'
  | 'agent-workflow'
  | 'safety'
  | 'multi-agent'
  | 'general'

interface BenchmarkSuite {
  name: string
  description: string
  testCount: number
  weight: number              // Relative weight in overall score
  assertions: AssertionConfig[]
}

interface LeaderboardEntry {
  rank: number
  agent: string
  author: string
  overallScore: number
  suiteScores: Record<string, number>
  latency: number
  cost: number
  tokens: number
  submittedAt: Date
  version: string
  verified: boolean
}
```

### 9.4 Marketplace CLI

```bash
# Search benchmarks
agentbench benchmark search "customer support"
agentbench benchmark search --category coding --difficulty advanced

# View benchmark details
agentbench benchmark info agentbench/customer-support-v2

# Download a benchmark
agentbench benchmark install agentbench/customer-support-v2

# Run a benchmark against your agent
agentbench benchmark run agentbench/customer-support-v2 --agent ./src/agent.ts

# Submit result to leaderboard
agentbench benchmark submit agentbench/customer-support-v2 --run run_abc123

# Publish your own benchmark
agentbench benchmark publish ./my-benchmark/

# List installed benchmarks
agentbench benchmark list
```

### 9.5 Marketplace API

```
GET    /api/v1/benchmarks                    List/search benchmarks
GET    /api/v1/benchmarks/:slug              Get benchmark details
GET    /api/v1/benchmarks/:slug/versions     List versions
GET    /api/v1/benchmarks/:slug/download     Download benchmark package
POST   /api/v1/benchmarks                    Publish new benchmark
PUT    /api/v1/benchmarks/:slug              Update benchmark
DELETE /api/v1/benchmarks/:slug              Unpublish
POST   /api/v1/benchmarks/:slug/validate      Validate benchmark
GET    /api/v1/benchmarks/:slug/leaderboard   Get leaderboard
POST   /api/v1/benchmarks/:slug/leaderboard   Submit to leaderboard
POST   /api/v1/benchmarks/:slug/reviews       Submit review
GET    /api/v1/benchmarks/:slug/reviews       Get reviews
```

### 9.6 Marketplace Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  Benchmark Marketplace                                       │
│                                                              │
│  🔍 Search benchmarks...                          [Publish]  │
│                                                              │
│  Categories: [All] [Customer Support] [Coding] [RAG] [SQL]  │
│              [Research] [Multi-Agent] [Safety] [More...]    │
│                                                              │
│  Sort by: [Popular] [Newest] [Highest Rated] [Most Downloaded]│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ ⭐ 4.8  │  Customer Support v2                        │    │
│  │         │  by AgentBench · 12,340 downloads           │    │
│  │         │  ▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎▎               │    │
│  │         │  50 test cases · 4 suites · Intermediate    │    │
│  │         │  Tags: customer-support, rag, tool-calling  │    │
│  │         │  [Install]  [View Leaderboard]              │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ ⭐ 4.6  │  Medical QA Benchmark                       │    │
│  │         │  by MedAI Labs · 5,200 downloads            │    │
│  │         │  200 test cases · 8 suites · Expert         │    │
│  │         │  [Install]  [View Leaderboard]              │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │ ⭐ 4.5  │  SQL Agent Challenge                        │    │
│  │         │  by DataBench · 8,900 downloads             │    │
│  │         │  100 test cases · 3 suites · Advanced       │    │
│  │         │  [Install]  [View Leaderboard]              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 9.7 Review & Approval Flow

```
Publisher submits benchmark
        │
        ▼
┌──────────────────┐
│  Automated Check  │
│  • Schema valid?  │
│  • Dataset valid? │
│  • Tests runnable?│
│  • No malicious   │
│    code?          │
└──────┬───────────┘
       │
   ┌───┴────┐
   │  Pass? │
   └───┬────┘
       │
  ┌────┴─────┐
  │ YES      │ NO → Return to publisher with errors
  ▼          │
┌──────────────────┐
│  Human Review     │  (for first-time publishers only)
│  • Quality check  │
│  • License check  │
│  • Content policy │
└──────┬───────────┘
       │
       ▼
   Published! 🎉
```

### 9.8 Monetization Model (Future)

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free | Publish & download community benchmarks, basic leaderboard |
| **Pro** | $29/mo | Private benchmarks, advanced analytics, priority leaderboard verification |
| **Team** | $99/mo | Team collaboration, shared benchmarks, CI integration, SLA |
| **Enterprise** | Custom | Self-hosted marketplace, SSO, audit logs, custom licensing |

---

## 10. Documentation Redesign

### 10.1 Documentation Philosophy

AgentBench documentation should follow the **Diátaxis** framework:

1. **Tutorials** — Learning-oriented: "Let me show you how to..."
2. **How-To Guides** — Task-oriented: "How do I..."
3. **Reference** — Information-oriented: "What does X do?"
4. **Explanation** — Understanding-oriented: "Why does X work this way?"

### 10.2 Documentation Site Architecture

```
agentbench.dev/
│
├── /                                     # Landing page (the story, the why)
│
├── /docs/                                # Documentation root
│   │
│   ├── /docs/quick-start/                # TUTORIAL
│   │   ├── index.md                      "Get your first agent test passing in 5 minutes"
│   │   ├── installation.md               "Install AgentBench globally or per-project"
│   │   └── your-first-test.md            "Write and run your first assertion"
│   │
│   ├── /docs/core-concepts/              # EXPLANATION
│   │   ├── index.md                      Overview
│   │   ├── agent-testing.md              "What does it mean to test an AI agent?"
│   │   ├── replay.md                     "How deterministic replay works"
│   │   ├── assertions.md                 "The assertion model: tool, output, score"
│   │   ├── evaluation.md                 "Rule evaluators, LLM judges, and hybrid judging"
│   │   ├── regression-testing.md         "Catching regressions: the core workflow"
│   │   ├── coverage.md                   "4D coverage: prompt, workflow, tool, edge-case"
│   │   ├── snapshots.md                  "Snapshot-based testing for agents"
│   │   └── non-determinism.md            "Dealing with LLM non-determinism"
│   │
│   ├── /docs/guides/                     # HOW-TO
│   │   ├── index.md
│   │   ├── testing-openai-agents.md
│   │   ├── testing-anthropic-agents.md
│   │   ├── testing-langgraph-agents.md
│   │   ├── testing-crewai-agents.md
│   │   ├── testing-rag-agents.md
│   │   ├── testing-tool-calling-agents.md
│   │   ├── testing-multi-agent-workflows.md
│   │   ├── ci-cd-integration.md
│   │   ├── github-actions.md
│   │   ├── gitlab-ci.md
│   │   ├── custom-judges.md
│   │   ├── custom-assertions.md
│   │   ├── custom-providers.md
│   │   ├── custom-reporters.md
│   │   ├── dataset-management.md
│   │   ├── cost-management.md
│   │   ├── migration-from-langsmith.md
│   │   ├── migration-from-deepeval.md
│   │   └── troubleshooting.md
│   │
│   ├── /docs/reference/                  # REFERENCE
│   │   ├── index.md
│   │   ├── cli.md                        All CLI commands with flags
│   │   ├── config.md                     agentbench.config.ts reference
│   │   ├── api/
│   │   │   ├── index.md                  REST API overview
│   │   │   ├── runs.md
│   │   │   ├── tests.md
│   │   │   ├── datasets.md
│   │   │   ├── benchmarks.md
│   │   │   └── experiments.md
│   │   ├── sdk/
│   │   │   ├── index.md                  SDK overview
│   │   │   ├── core.md                   @agentbench/core
│   │   │   ├── assertion-dsl.md          expect() API
│   │   │   ├── runner.md                 Runner API
│   │   │   ├── tracer.md                 Tracer API
│   │   │   ├── evaluator.md              Evaluator API
│   │   │   └── replay.md                 Replay API
│   │   ├── types.md                      TypeScript type reference
│   │   └── errors.md                     Error codes and meanings
│   │
│   ├── /docs/examples/                   # Full example walkthroughs
│   │   ├── index.md
│   │   ├── customer-support-agent.md
│   │   ├── research-agent.md
│   │   ├── rag-agent.md
│   │   ├── sql-agent.md
│   │   ├── code-review-agent.md
│   │   ├── coding-agent.md
│   │   ├── tool-calling-agent.md
│   │   ├── mcp-agent.md
│   │   ├── langgraph-agent.md
│   │   ├── openai-agent-sdk.md
│   │   ├── crewai-agent.md
│   │   ├── llamaindex-agent.md
│   │   └── multi-agent-workflow.md
│   │
│   ├── /docs/cookbook/                   # Recipes for specific scenarios
│   │   ├── index.md
│   │   ├── catching-prompt-regressions.md
│   │   ├── model-migration-testing.md
│   │   ├── cost-budget-enforcement.md
│   │   ├── safety-testing.md
│   │   ├── multilingual-testing.md
│   │   ├── load-testing-agents.md
│   │   └── agent-ab-testing.md
│   │
│   ├── /docs/architecture/               # System design
│   │   ├── index.md
│   │   ├── data-flow.md
│   │   ├── provider-architecture.md
│   │   └── security-model.md
│   │
│   ├── /docs/contributing/               # For contributors
│   │   ├── index.md
│   │   ├── development-setup.md
│   │   ├── adding-a-provider.md
│   │   ├── adding-an-evaluator.md
│   │   └── release-process.md
│   │
│   ├── /docs/migration/
│   │   ├── index.md
│   │   ├── v0.2-to-v0.3.md
│   │   └── from-other-tools.md
│   │
│   ├── /docs/faq.md
│   ├── /docs/best-practices.md
│   └── /docs/roadmap.md
│
├── /blog/                                # Engineering blog
├── /changelog/                           # Release notes
└── /playground/                          # Interactive demo (future)
```

### 10.3 Page Template

Every documentation page uses this structure:

```markdown
---
title: "Testing Tool-Calling Agents"
description: "How to test AI agents that use tools — verifying correct tool selection, argument passing, and result handling."
targetAudience: "Developers building AI agents with tool-calling capabilities"
readingTime: "8 min"
prerequisites:
  - "Quick Start completed"
  - "Understanding of tool calling in LLMs"
---

# Testing Tool-Calling Agents

## Overview

A 2-3 sentence summary of what this page covers.

## Prerequisites

What you need to know or have installed before reading.

## Step-by-Step

### 1. First concept

Complete, runnable example with code.

```typescript
// This code is tested and runs
import { expect, test } from 'agentbench'

test('should call the right tool', async () => {
  const result = await agent.run('Search for refund policy')
  await expect(result)
    .tool('search_knowledge_base').toBeCalled()
    .run()
})
```

### 2. Next concept...

## Common Pitfalls

Things that go wrong and how to fix them.

## Next Steps

Where to go after this page.

## Related

- [Assertion DSL Reference](/docs/reference/sdk/assertion-dsl)
- [Custom Judges Guide](/docs/guides/custom-judges)
```

### 10.4 Documentation Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | VitePress or Nextra | Markdown-first, great DX, fast, MDX support |
| **Hosting** | Vercel | Free for OSS, fast CDN, preview deployments |
| **Search** | Algolia DocSearch | Free for OSS, excellent search |
| **Analytics** | Plausible | Privacy-friendly, self-hostable |
| **Syntax** | Shiki | Same engine as VS Code, accurate highlighting |
| **Diagrams** | Mermaid | Text-based, version-controllable |

---

## 11. System Architecture

### 11.1 v0.3.0 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentBench v0.3.0                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Developer Surface                         │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │   CLI    │  │ VS Code  │  │  Web UI  │  │    SDK   │    │  │
│  │  │  (11 cmds)│  │ Extension│  │ Dashboard│  │ TS + Py  │    │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │  │
│  │       │             │             │             │           │  │
│  └───────┼─────────────┼─────────────┼─────────────┼───────────┘  │
│          │             │             │             │              │
│  ┌───────┼─────────────┼─────────────┼─────────────┼───────────┐  │
│  │       │         REST API Layer      │             │           │  │
│  │  ┌────┴────────────────────────────┴────────────┴───┐       │  │
│  │  │              AgentBench Engine                    │       │  │
│  │  │                                                  │       │  │
│  │  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │       │  │
│  │  │  │  Runner   │  │  Assertion │  │  Evaluator   │ │       │  │
│  │  │  │           │  │    DSL     │  │  (Rule+Judge) │ │       │  │
│  │  │  └──────────┘  └────────────┘  └──────────────┘ │       │  │
│  │  │                                                  │       │  │
│  │  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │       │  │
│  │  │  │  Replay   │  │  Snapshot  │  │    Diff      │ │       │  │
│  │  │  │  Engine   │  │  Manager   │  │   Engine     │ │       │  │
│  │  │  └──────────┘  └────────────┘  └──────────────┘ │       │  │
│  │  │                                                  │       │  │
│  │  │  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │       │  │
│  │  │  │Experiment │  │  Coverage  │  │  Reporter    │ │       │  │
│  │  │  │  Engine   │  │  Engine    │  │  Generator   │ │       │  │
│  │  │  └──────────┘  └────────────┘  └──────────────┘ │       │  │
│  │  │                                                  │       │  │
│  │  │  ┌────────────────────────────────────────────┐  │       │  │
│  │  │  │           Tracer (Interceptor)              │  │       │  │
│  │  │  │  LLM calls · Tool calls · Streaming · MCP  │  │       │  │
│  │  │  └────────────────────────────────────────────┘  │       │  │
│  │  │                                                  │       │  │
│  │  └──────────────────────────────────────────────────┘       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Plugin Layer                               │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │Providers │  │ Adapters │  │  Judges  │  │Reporters │    │  │
│  │  │          │  │          │  │          │  │          │    │  │
│  │  │ OpenAI   │  │LangGraph │  │Built-in  │  │ Terminal │    │  │
│  │  │Anthropic │  │ CrewAI   │  │   8      │  │  JSON    │    │  │
│  │  │ Gemini   │  │LlamaIndex│  │dimensions│  │ Markdown │    │  │
│  │  │ DeepSeek │  │  Custom  │  │ Custom   │  │  HTML    │    │  │
│  │  │ ...more  │  │  ...     │  │ plugins  │  │  JUnit   │    │  │
│  │  │          │  │          │  │          │  │  Custom  │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Data Layer                                 │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │PostgreSQL│  │  Redis   │  │  Files   │  │  S3/     │    │  │
│  │  │ (primary)│  │ (cache)  │  │ (local)  │  │  MinIO   │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Integration Layer                          │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │
│  │  │ GitHub   │  │ GitLab   │  │ VS Code  │  │ Webhooks │    │  │
│  │  │ Actions  │  │   CI     │  │          │  │          │    │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Monorepo Package Map (v0.3.0)

```
agentbench/
├── apps/
│   ├── cli/                        AgentBench CLI (Commander.js)
│   ├── web/                        Next.js Dashboard + REST API + Marketplace
│   └── docs/                       VitePress documentation site   [NEW]
│
├── packages/
│   ├── core/                       @agentbench/core — Engine
│   │   ├── runner/                 Agent Runner
│   │   ├── tracer/                 Execution Tracer
│   │   ├── evaluator/              Rule + LLM + Hybrid Judge
│   │   ├── assertion/              Chained Assertion DSL
│   │   ├── snapshot/               Snapshot Manager
│   │   ├── replay/                 Replay Engine
│   │   ├── diff/                   Diff Engine
│   │   ├── experiment/             A/B Testing Engine
│   │   ├── coverage/               Coverage Analysis
│   │   ├── reporter/               Report Generator
│   │   ├── dataset/                Dataset management             [ENHANCED]
│   │   ├── provider-interface/     Unified provider interface      [NEW]
│   │   ├── storage/                Storage Abstraction
│   │   ├── types/                  TypeScript Types
│   │   └── utils/                  Token Counter + JSON Validator
│   │
│   ├── openai/                     @agentbench/openai              [ENHANCED]
│   ├── anthropic/                  @agentbench/anthropic           [ENHANCED]
│   ├── gemini/                     @agentbench/gemini              [NEW]
│   ├── deepseek/                   @agentbench/deepseek            [NEW]
│   ├── azure-openai/               @agentbench/azure-openai        [NEW]
│   ├── openrouter/                 @agentbench/openrouter          [NEW]
│   ├── groq/                       @agentbench/groq                [NEW]
│   ├── mistral/                    @agentbench/mistral             [NEW]
│   ├── cohere/                     @agentbench/cohere              [NEW]
│   ├── ollama/                     @agentbench/ollama              [NEW]
│   ├── vllm/                       @agentbench/vllm                [NEW]
│   ├── lm-studio/                  @agentbench/lm-studio           [NEW]
│   ├── provider-utils/             @agentbench/provider-utils      [NEW]
│   │
│   ├── mcp/                        @agentbench/mcp
│   ├── adapter/                    @agentbench/adapter             [ENHANCED]
│   ├── langgraph/                  @agentbench/langgraph
│   │
│   ├── config/                     @agentbench/config              [NEW]
│   │                               Config loading, validation, defaults
│   │
│   └── typescript-config/          Shared TSConfig base
│
├── examples/                       14 official examples            [EXPANDED]
├── sdk-python/                     Python SDK                      [ENHANCED]
├── vscode-extension/               VS Code extension               [NEW]
├── benchmark-registry/             Benchmark registry + DB         [NEW]
│
├── docs/                           Internal docs (architecture, etc.)
├── website/                        agentbench.dev landing page     [NEW]
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### 11.3 Data Flow: Test Execution

```
User runs: agentbench test

     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  1. CLI parses args, loads agentbench.config.ts              │
│     ├── Resolves providers                                   │
│     ├── Resolves test files (tests/**/*.test.ts)             │
│     └── Resolves agent entry point                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Runner creates execution context                         │
│     ├── Initializes tracer                                   │
│     ├── Sets up provider interceptors                        │
│     └── Creates worker pool (concurrency = 4)                │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  3. For each test file:                                      │
│     ├── Run setup hooks                                      │
│     ├── For each test case:                                  │
│     │   ├── Execute agent with input                         │
│     │   │   ├── LLM calls ⟶ Intercepted by tracer            │
│     │   │   ├── Tool calls ⟶ Intercepted by tracer           │
│     │   │   └── Stream chunks ⟶ Captured by StreamCapture    │
│     │   ├── Collect trace (steps, tokens, latency, cost)     │
│     │   ├── Run assertions                                   │
│     │   │   ├── Tool assertions (check trace)                │
│     │   │   ├── Output assertions (check response)           │
│     │   │   ├── Token assertions (check usage)               │
│     │   │   ├── Latency assertions (check timing)            │
│     │   │   └── Score assertions (run judges)                │
│     │   ├── Run evaluators (if configured)                   │
│     │   │   ├── Rule evaluators (exact, contains, regex...)  │
│     │   │   ├── LLM judges (correctness, faithfulness...)    │
│     │   │   └── Hybrid judge (rule + LLM combined)           │
│     │   └── Record result (pass/fail + metadata)             │
│     └── Run teardown hooks                                   │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Reporter generates output                                │
│     ├── Terminal: colored pass/fail summary                  │
│     ├── JSON: machine-readable results                       │
│     ├── HTML: interactive report                             │
│     └── JUnit: CI integration                                │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Storage (optional, if web dashboard is running)          │
│     ├── Save run record to PostgreSQL                        │
│     ├── Save trace to PostgreSQL                             │
│     └── Save snapshot if configured                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Roadmap

### 12.1 Version Map

```
v0.1.0          v0.2.0           v0.3.0           v0.4.0           v0.5.0           v1.0.0
  │               │                │                │                │                │
  └─ Alpha ───────┴─ Production ───┴─ Adoption ─────┴─ Ecosystem ────┴─ Enterprise ───┴─ Standard ─
```

### 12.2 v0.3.0 — "Adoption" (Target: Q3 2026)

**Goal:** Make AgentBench the obvious first choice for AI agent testing by delivering a best-in-class developer experience.

| # | Feature | Priority | Effort | Risk | Impact |
|---|---------|----------|--------|------|--------|
| D1 | Redesigned `agentbench init` with interactive CLI, auto-detection, templates | P0 | 2 weeks | Low | 🔴 Critical |
| D2 | Zero-config `agentbench test` with watch mode, --ui, smart defaults | P0 | 2 weeks | Low | 🔴 Critical |
| D3 | 14 official examples (production quality) | P0 | 3 weeks | Medium | 🔴 Critical |
| D4 | Documentation site (VitePress, 25+ pages, Diátaxis structure) | P0 | 3 weeks | Low | 🔴 Critical |
| D5 | Brand refresh — messaging, website hero, README, competitive positioning | P0 | 1 week | Low | 🟡 High |
| P1 | Provider interface redesign + auto-discovery | P1 | 2 weeks | Medium | 🟡 High |
| P2 | Gemini provider | P1 | 1 week | Low | 🟡 High |
| P3 | DeepSeek provider | P1 | 1 week | Low | 🟡 High |
| P4 | Azure OpenAI provider | P1 | 1 week | Low | 🟢 Medium |
| P5 | OpenRouter provider | P1 | 1 week | Low | 🟢 Medium |
| P6 | Groq provider | P1 | 0.5 week | Low | 🟢 Medium |
| P7 | Ollama + vLLM + LM Studio providers | P2 | 1 week | Low | 🟢 Medium |
| P8 | Mistral + Cohere providers | P2 | 1 week | Low | 🟢 Medium |
| P9 | `@agentbench/provider-utils` shared package | P1 | 1 week | Low | 🟡 High |
| E1 | npm package publication (`npm install -g agentbench`) | P0 | 0.5 week | Low | 🔴 Critical |
| E2 | `npx agentbench` support (zero-install trial) | P0 | 0.5 week | Low | 🔴 Critical |

**Total estimated effort:** ~18 weeks (sequential) / ~8-10 weeks (with 2-3 developers parallel)

**Success criteria:**
- `npm install -g agentbench && agentbench init && agentbench test` works in < 5 minutes
- 500+ npm downloads/week
- 14 official examples, all passing CI
- Documentation site live at agentbench.dev
- 6+ providers supported

### 12.3 v0.4.0 — "Ecosystem" (Target: Q4 2026)

**Goal:** Build the platform around AgentBench — datasets, benchmarks, CI integrations, and editor tooling.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| G1 | GitHub Actions integration (PR comments, check runs, regression detection) | P0 | 3 weeks |
| G2 | GitLab CI integration | P1 | 1 week |
| D1 | Full Dataset system (import/export/validate/split/version/diff) | P0 | 3 weeks |
| D2 | Dataset Dashboard UI | P1 | 1 week |
| V1 | VS Code Extension v1.0 — Run, Debug, CodeLens, Status Bar | P0 | 3 weeks |
| V2 | VS Code Trace Viewer | P1 | 2 weeks |
| B1 | Benchmark Marketplace — upload, download, search, leaderboard | P0 | 4 weeks |
| B2 | Benchmark validation & review pipeline | P1 | 2 weeks |
| B3 | Benchmark Dashboard UI | P1 | 2 weeks |
| P1 | Provider validation test suite (ensure all providers pass same tests) | P1 | 1 week |
| P2 | Custom provider development guide + template | P1 | 1 week |

**Success criteria:**
- GitHub Actions workflow used by 50+ repos
- VS Code extension published with 4+ star rating
- 20+ community benchmarks published
- Dataset system supports all 7 formats

### 12.4 v0.5.0 — "Enterprise" (Target: Q1 2027)

**Goal:** Team collaboration, cloud offering, enterprise features.

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| T1 | Team workspaces — shared projects, runs, datasets | P0 | 3 weeks |
| T2 | Role-based access control (Admin, Editor, Viewer) | P0 | 2 weeks |
| T3 | Team dashboard — aggregate metrics across projects | P1 | 2 weeks |
| C1 | AgentBench Cloud — hosted dashboard, no self-hosting needed | P0 | 4 weeks |
| C2 | Cloud runners — run tests on AgentBench infrastructure | P1 | 3 weeks |
| C3 | Usage-based pricing + billing (Stripe) | P0 | 2 weeks |
| W1 | Webhook system — Slack, Discord, Teams, email notifications | P1 | 2 weeks |
| W2 | Scheduled test runs (cron) | P1 | 1 week |
| A1 | Audit logging | P1 | 1 week |
| A2 | SSO (SAML/OIDC) | P1 | 2 weeks |

### 12.5 v1.0.0 — "Standard" (Target: Q3 2027)

**Goal:** AgentBench is the de facto standard for AI agent testing.

| # | Feature |
|---|---------|
| M1 | Benchmark Hub — curated, verified benchmarks with industry-standard status |
| M2 | Plugin marketplace — third-party judges, reporters, providers |
| M3 | Public REST API with stable v1 contract |
| M4 | Official Python SDK v1.0 (feature parity with TypeScript) |
| M5 | Community recognition program (maintainers, champions, ambassadors) |
| M6 | Conference talks, workshops, university partnerships |
| M7 | AgentBench Certified — professional certification for AI agent testing |
| M8 | SOC 2 compliance, enterprise SLA, dedicated support |

### 12.6 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM API instability breaks tests | Medium | High | Replay mode provides deterministic fallback; snapshots decouple testing from live APIs |
| Adoption slower than expected | Medium | High | Focus on DX; target existing Jest/Playwright users; "try in 5 minutes" onboarding |
| Competing standard emerges | Medium | Critical | Build ecosystem (examples, benchmarks, providers) to create network effects |
| Maintenance burden of 12+ providers | High | Medium | Shared `provider-utils` base class; community-maintained provider model |
| Breaking changes alienate early adopters | Low | High | Strict semver; migration guides; deprecation warnings one version before removal |
| Marketplace quality/spam | Medium | Medium | Automated validation + human review for first-time publishers |
| Scope creep (trying to build everything at once) | High | High | Strict milestone gating; v0.3 = DX only; defer Enterprise to v0.5 |

---

## 13. Adoption Strategy

### 13.1 Target Personas

| Persona | Pain Point | AgentBench Solution | Acquisition Channel |
|---------|-----------|---------------------|---------------------|
| **AI Engineer** at a startup | "My agent was working last week, now it's broken. I don't know why." | Replay + Regression Detection | Twitter/X, Reddit r/LangChain, HN |
| **Backend Engineer** adding AI features | "I know how to test my API. How do I test my LLM calls?" | Familiar Jest-like API (`expect(result).output().toContain(...)`) | Jest/Playwright community, dev blogs |
| **Platform Engineer** building AI infra | "Our team ships agents to production. We need CI gates." | GitHub Actions + PR checks + JUnit export | GitHub Marketplace, DevOps conferences |
| **ML Engineer** evaluating models | "Is Claude better than GPT for my use case? I can't tell without structured testing." | Cross-model replay + A/B experiments | ML/AI newsletters, HuggingFace |
| **Tech Lead / CTO** | "I can't let my team ship untested AI. But existing tools are all observability, not testing." | AgentBench as quality gate — part of CI pipeline | Enterprise sales, case studies |

### 13.2 Growth Flywheel

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│    npm install -g agentbench                                   │
│           │                                                    │
│           ▼                                                    │
│    agentbench init (5 min onboarding)                          │
│           │                                                    │
│           ▼                                                    │
│    agentbench test (first green ✓)                             │
│           │                                                    │
│           ▼                                                    │
│    Adds to CI — blocks broken agents                           │
│           │                                                    │
│           ▼                                                    │
│    Tells team → team adopts                                    │
│           │                                                    │
│           ▼                                                    │
│    Publishes benchmark → community grows                       │
│           │                                                    │
│           ▼                                                    │
│    More benchmarks → more adoption → more benchmarks           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 13.3 Distribution Channels

| Channel | Action | Timeline |
|---------|--------|----------|
| **npm** | Publish `agentbench` CLI as global-installable package | v0.3.0 launch |
| **npx** | Support `npx agentbench` for zero-install trial | v0.3.0 launch |
| **GitHub** | Open source repo with 14 examples, CI badges, clear README | v0.3.0 launch |
| **VS Code Marketplace** | Publish official extension | v0.4.0 |
| **GitHub Marketplace** | Publish GitHub Actions action | v0.4.0 |
| **Docker Hub** | Publish `agentbench/agentbench` Docker image | v0.3.0 |
| **HuggingFace** | Publish example datasets on HuggingFace Hub | v0.3.0 |
| **Homebrew** | `brew install agentbench` | v0.4.0 |

### 13.4 Content & Community Plan

| Activity | Frequency | Goal |
|----------|-----------|------|
| **Engineering Blog** | Bi-weekly | "How we test X with AgentBench" — show real use cases |
| **Example of the Week** | Weekly Twitter thread | Highlight one official example |
| **Office Hours** | Monthly | Live Q&A, onboarding help, feature requests |
| **Changelog** | Per release | Detailed, visual, celebratory |
| **Conference Talks** | Quarterly | AI Engineer Summit, AI DevTools Conf, etc. |
| **Guest Posts** | Monthly | Partner with agent framework teams (LangGraph, CrewAI, etc.) |
| **Comparison Pages** | SEO | "AgentBench vs LangSmith", "AgentBench vs DeepEval", etc. |

### 13.5 Adoption Metrics Dashboard

| Metric | Tool | Target (6 months post v0.3.0) |
|--------|------|-------------------------------|
| npm downloads/week | npm API | 2,000+ |
| GitHub stars | GitHub API | 1,000+ |
| Unique CLI users/week | Telemetry (opt-in) | 500+ |
| VS Code extension installs | VS Code Marketplace | 1,000+ |
| GitHub Actions repos using | GitHub API | 100+ |
| Community benchmarks published | Marketplace DB | 50+ |
| Documentation page views | Plausible | 10,000+/mo |
| Discord/community members | Discord | 500+ |

---

## 14. Ecosystem Strategy

### 14.1 The Four-Sided Network

```
                    ┌──────────────┐
                    │              │
                    │   AgentBench │
                    │     Core     │
                    │              │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │Providers │    │ Examples │    │Benchmarks│
    │          │    │          │    │          │
    │ OpenAI   │    │Customer  │    │ Industry │
    │Anthropic │    │ Support  │    │ Standard │
    │ Gemini   │    │ Research │    │ Benchmarks│
    │   ...    │    │   ...    │    │   ...    │
    └──────────┘    └──────────┘    └──────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Developer   │
                    │   Community   │
                    │              │
                    └──────────────┘
```

### 14.2 Provider Ecosystem Strategy

**Phase 1 (v0.3.0): Core Providers**
- AgentBench team maintains: OpenAI, Anthropic, Gemini, DeepSeek
- These cover 90%+ of developer usage

**Phase 2 (v0.3.0-v0.4.0): Extended Providers**
- AgentBench team maintains: Azure OpenAI, OpenRouter, Groq
- Community-maintained: Ollama, vLLM, LM Studio, Mistral, Cohere

**Phase 3 (v0.5.0+): Community-Led**
- Provider SDK documentation enables anyone to build a provider
- Provider registry on agentbench.dev
- Verified badge for community providers that pass integration tests

### 14.3 Partner Integration Strategy

| Partner | Integration | Value |
|---------|------------|-------|
| **LangChain / LangGraph** | First-class adapter in `@agentbench/langgraph` | LangChain's 100K+ developers discover AgentBench |
| **CrewAI** | Python SDK adapter + example | Multi-agent testing for CrewAI's growing user base |
| **OpenAI** | `@agentbench/openai` as the canonical testing wrapper | OpenAI's developer ecosystem |
| **Anthropic** | `@agentbench/anthropic` with Claude-specific assertions | Claude developer community |
| **HuggingFace** | Dataset import/export, benchmark hosting | HuggingFace's massive ML community |
| **Vercel** | AgentBench Dashboard one-click deploy, docs hosting | Next.js developer ecosystem |
| **GitHub** | Actions, Checks API, PR integration | Every GitHub repository is a potential user |

### 14.4 Open Source Governance

| Level | Role | Responsibility |
|-------|------|---------------|
| **Core Maintainers** | AgentBench team (2-3 people) | Architecture decisions, releases, core packages |
| **Triagers** | Trusted community members | Issue triage, PR review, discussion moderation |
| **Contributors** | Anyone | Bug fixes, docs, examples, providers |
| **Provider Maintainers** | Community + Partner teams | Maintain individual provider packages |

Decision-making: **BDFL-light** — core maintainers have final say, but all technical decisions happen in public RFCs.

### 14.5 Monetization (Sustainable Open Source)

AgentBench follows the **open core** model:

```
┌────────────────────────────────────────┐
│  OPEN SOURCE (MIT / Apache 2.0)        │
│                                        │
│  • CLI                                 │
│  • Core engine                         │
│  • All providers                       │
│  • Assertion DSL                       │
│  • Replay engine                       │
│  • VS Code extension                   │
│  • GitHub Actions                      │
│  • Documentation                       │
│                                        │
├────────────────────────────────────────┤
│  CLOUD (SaaS)                          │
│                                        │
│  • Hosted dashboard                    │
│  • Team collaboration                  │
│  • Managed test runners                │
│  • Benchmark marketplace               │
│  • Analytics & insights                │
│  • SSO / SAML                          │
│  • Audit logs                          │
│  • Priority support                    │
│                                        │
└────────────────────────────────────────┘
```

This is the same model used by GitLab, Sentry, PostHog, and Cal.com — and it works.

---

## 15. Appendix

### 15.1 Competitive Analysis Matrix (Full)

| Feature | AgentBench | LangSmith | DeepEval | OpenAI Evals | Promptfoo | Jest | Playwright |
|---------|-----------|-----------|----------|-------------|-----------|------|------------|
| **Agent Regression Testing** | ✅ Core | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Deterministic Replay** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tool Call Assertions** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **LLM-as-Judge** | ✅ 8 dim | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **A/B Testing** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Coverage Analysis** | ✅ 4D | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Snapshot Testing** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **CI/CD Native** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **GitHub PR Comments** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VS Code Extension** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Multi-Provider** | ✅ 3 built-in | ✅ | ❌ | ❌ | ✅ | N/A | N/A |
| **Python SDK** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **TypeScript SDK** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Open Source** | ✅ Apache 2.0 | ❌ SaaS | ✅ | ✅ | ✅ MIT | ✅ MIT | ✅ Apache 2.0 |
| **Self-Hosted** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pricing** | Free + Cloud | $39+/mo | Free | Free | Free | Free | Free |

### 15.2 Glossary of Key Terms

| Term | Definition |
|------|-----------|
| **Agent** | An AI-powered system that uses an LLM, tools, and prompts to accomplish tasks |
| **Assertion** | A verifiable claim about agent behavior: "The agent called tool X", "The output contains Y" |
| **Baseline** | A recorded run that serves as the reference for regression comparison |
| **Coverage (4D)** | Measures how much of an agent's behavior space is tested: prompt variants, workflow paths, tool combinations, edge cases |
| **Diff** | Structural comparison between two runs: what changed in output, score, tokens, latency |
| **Judge (LLM-as-Judge)** | An LLM used to evaluate another LLM's output on dimensions like correctness, faithfulness, safety |
| **Replay** | Re-executing a test run using recorded LLM responses, enabling deterministic, zero-cost regression testing |
| **Regression** | A degradation in agent quality: lower score, wrong tool calls, higher cost/latency |
| **Rule Evaluator** | Deterministic check: exact match, contains, regex, JSON schema validation |
| **Score** | A numeric quality rating (1-10) assigned by an LLM judge |
| **Snapshot** | A stored representation of agent state/output at a point in time, used for regression testing |
| **Trace** | A complete record of an agent execution: every LLM call, tool call, streaming chunk, timing, and token usage |
| **Provider** | An LLM service (OpenAI, Anthropic, etc.) that implements the AgentBench provider interface |

### 15.3 Technical Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Monorepo with Turborepo | Shared types, coordinated releases, single CI pipeline | v0.1.0 |
| Commander.js for CLI | Lightweight, no UI framework dependency, familiar to Node.js developers | v0.1.0 |
| Next.js for Dashboard | Best React framework, API routes, server components, Vercel deploy | v0.1.0 |
| Prisma for ORM | Type-safe, great migrations, works with PostgreSQL | v0.1.0 |
| pnpm over npm/yarn | Strict dependency resolution, fast, disk-efficient | v0.1.0 |
| Changesets for versioning | Multi-package versioning with changelogs, designed for monorepos | v0.2.0 |
| VitePress for docs | Markdown-first, fast, great DX, Mermaid support | v0.3.0 |
| Custom providers over LangChain | Avoids framework lock-in, smaller bundles, faster | v0.1.0 |

### 15.4 Design Principles

1. **Developer Experience First** — Every feature starts with the CLI and the 5-minute test
2. **Progressive Disclosure** — Simple things simple, complex things possible
3. **Convention over Configuration** — Smart defaults; config only when needed
4. **Familiar Patterns** — Mirror Jest, Vitest, Playwright APIs wherever possible
5. **Test the Tester** — AgentBench itself is tested with AgentBench (dogfooding)
6. **Open by Default** — Core is Apache 2.0; cloud features are additive, not required
7. **Portable** — Works locally, in CI, in Docker; no vendor lock-in
8. **Honest about Non-Determinism** — Don't pretend LLMs are deterministic; build tools that embrace it

---

> **Document Version:** 1.0
> **Last Updated:** 2026-07-10
> **Next Review:** Before v0.3.0 development kickoff
>
> This document is a living plan. It will be updated as we learn from users, ship features, and adapt to the evolving AI agent ecosystem.
