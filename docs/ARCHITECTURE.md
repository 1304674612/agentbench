# AgentBench -- System Architecture (v0.5.1)

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AgentBench v0.5.1 System                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   CLI Tool  │  │  Web Dashboard│  │    SDKs      │  │  VS Code      │ │
│  │ (Commander) │  │  (Next.js)   │  │ (@agentbench │  │  Extension    │ │
│  │             │  │              │  │  /openai,    │  │               │ │
│  │             │  │              │  │  /anthropic, │  │               │ │
│  │             │  │              │  │  /mcp...)    │  │               │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘ │
│         │                │                 │                  │          │
│         └────────────────┼─────────────────┼──────────────────┘          │
│                          │                 │                              │
│                          ▼                 ▼                              │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              API Layer (REST + WS)                             │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐                   │       │
│  │  │ REST API │ │Server    │ │ WebSocket    │                   │       │
│  │  │(Next.js) │ │Actions   │ │ (Realtime)   │                   │       │
│  │  └──────────┘ └──────────┘ └──────────────┘                   │       │
│  └──────────────────────┬────────────────────────────────────────┘       │
│                         │                                                │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │            @agentbench/core                                   │       │
│  │                                                               │       │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │       │
│  │  │ Runner  │ │ Tracer  │ │  Storage  │ │  Dataset         │  │       │
│  │  │ Engine  │ │ Engine  │ │  Layer    │ │  Module          │  │       │
│  │  └────┬────┘ └────┬────┘ └─────┬─────┘ └────────┬─────────┘  │       │
│  │       │           │            │                │             │       │
│  │  ┌────┴────┐ ┌────┴────┐ ┌────┴──────┐ ┌──────┴──────────┐  │       │
│  │  │Replay   │ │Evaluator│ │  Snapshot  │ │  Provider       │  │       │
│  │  │Engine   │ │Engine   │ │  Manager   │ │  Registry       │  │       │
│  │  └─────────┘ └─────────┘ └───────────┘ └─────────────────┘  │       │
│  │                                                               │       │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │       │
│  │  │Diff     │ │Coverage │ │  Reporter │ │  Config System   │  │       │
│  │  │Engine   │ │Engine   │ │  Engine   │ │  (defineConfig)  │  │       │
│  │  └─────────┘ └─────────┘ └──────────┘ └──────────────────┘  │       │
│  └──────────────────────┬───────────────────────────────────────┘       │
│                         │                                                │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              Provider Plugin Layer                             │       │
│  │                                                               │       │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │       │
│  │  │ OpenAI  │ │Anthropic│ │ Gemini  │ │DeepSeek │  ... 12+  │       │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │       │
│  │                                                               │       │
│  │  ┌──────────────────────────────────────────────────┐        │       │
│  │  │  @agentbench/provider-utils                       │        │       │
│  │  │  (OpenAICompatibleProvider, SSE utils, Token      │        │       │
│  │  │   counter, Cost calculator)                       │        │       │
│  │  └──────────────────────────────────────────────────┘        │       │
│  └──────────────────────┬───────────────────────────────────────┘       │
│                         │                                                │
│                         ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │              Data & Infra Layer                               │       │
│  │                                                               │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐  │       │
│  │  │PostgreSQL│ │  Redis   │ │ File Storage │ │ External   │  │       │
│  │  │(Primary) │ │(Cache/Q) │ │ (S3/Local)   │ │ LLM APIs   │  │       │
│  │  └──────────┘ └──────────┘ └──────────────┘ └────────────┘  │       │
│  │                                                               │       │
│  │  ┌──────────┐ ┌──────────────────────────────────────────┐   │       │
│  │  │ BullMQ   │ │  GitHub Integration                       │   │       │
│  │  │(Workers) │ │  (Actions, Checks API, PR Comments)       │   │       │
│  │  └──────────┘ └──────────────────────────────────────────┘   │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Package Architecture

### 2.1 Package Count: 8 to 15

v0.5.1 runs with from **8 packages** (v0.2.0) to **17 packages**, with 11 brand-new provider packages and a shared provider-utils SDK. New packages are marked with **[NEW]**.

### 2.2 Dependency Graph

```
                         ┌─────────────────────┐
                         │   @agentbench/core   │
                         │   (Core Engine)      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────────┐
                 │                  │                       │
                 ▼                  ▼                       ▼
     ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐
     │ @agentbench/     │  │ @agentbench/ │  │ @agentbench/         │
     │ provider-utils   │  │ config       │  │ typescript-config    │
     │ [NEW]            │  │ [NEW]        │  │                      │
     └────────┬─────────┘  └──────────────┘  └──────────────────────┘
              │
     ┌────────┼────────────────────────────────────────────┐
     │        │            │           │         │         │
     ▼        ▼            ▼           ▼         ▼         ▼
  ┌──────┐ ┌────────┐ ┌───────┐ ┌──────────┐ ┌─────┐ ┌─────────┐
  │OpenAI│ │Anthropic│ │Gemini │ │ DeepSeek │ │Groq │ │Ollama   │
  │      │ │        │ │[NEW]  │ │ [NEW]    │ │[NEW]│ │[NEW]    │
  └──────┘ └────────┘ └───────┘ └──────────┘ └─────┘ └─────────┘

     ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
     │ Azure OpenAI  │ │ OpenRouter   │ │    MCP       │
     │ [NEW]         │ │ [NEW]        │ │              │
     └───────────────┘ └──────────────┘ └──────────────┘

                               │
                               ▼
                    ┌──────────────────┐
                    │   agentbench-cli │  (CLI)
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   agentbench-web │  (Web Dashboard)
                    └──────────────────┘
```

### 2.3 Package Responsibilities

| Package | Responsibility | Status |
|---------|---------------|--------|
| `@agentbench/core` | Core engine: Runner, Tracer, Evaluator, Assertion, Snapshot, Diff, Coverage, Reporter, Dataset, Provider Registry, Config System | Existing |
| `@agentbench/provider-utils` | Shared base classes (`OpenAICompatibleProvider`), SSE parsing, token counting, cost calculation | **NEW** |
| `@agentbench/config` | `defineConfig` helper, Zod schemas, config resolution | **NEW** |
| `@agentbench/typescript-config` | Shared tsconfig presets for the monorepo | Existing |
| `@agentbench/openai` | OpenAI SDK wrapping, GPT-4o/o1/o3 streaming, reasoning, tool-calling, vision | Existing |
| `@agentbench/anthropic` | Anthropic SDK wrapping, Claude streaming, reasoning, tool-calling, vision | Existing |
| `@agentbench/gemini` | Google Gemini SDK wrapping, streaming, embeddings, tool-calling | **NEW** |
| `@agentbench/deepseek` | DeepSeek API wrapping, streaming, reasoning, tool-calling | **NEW** |
| `@agentbench/azure-openai` | Azure OpenAI Service wrapping, streaming, function-calling | **NEW** |
| `@agentbench/openrouter` | OpenRouter pass-through to 200+ models, streaming | **NEW** |
| `@agentbench/groq` | Groq LPU inference, ultra-fast streaming | **NEW** |
| `@agentbench/ollama` | Local model support via Ollama, streaming, embeddings | **NEW** |
| `@agentbench/mcp` | MCP client wrapping and tracing | Existing |
| `@agentbench/langgraph` | LangGraph adapter for state-graph agents | Existing |
| `agentbench-cli` | CLI tool (commander.js + ink), interactive init, test runner | Existing |
| `agentbench-web` | Next.js Dashboard with real-time WebSocket updates | Existing |

---

## 3. Provider Plugin Architecture **[Introduced in v0.3.0]**

### 3.1 Design Principles

1. **Uniform Interface** -- Every provider implements the same `AgentBenchProvider` interface
2. **Pluggable** -- Third-party providers install as npm packages
3. **Auto-Discovery** -- Scans `node_modules` for `@agentbench/provider-*` packages
4. **Tree-Shakeable** -- Only loaded providers are bundled

### 3.2 Unified Provider Interface

```typescript
// @agentbench/core

interface AgentBenchProvider {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly capabilities: ProviderCapabilities

  createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult>
  createStreamingChatCompletion(params: ChatCompletionParams): AsyncGenerator<StreamChunk>
  countTokens(params: TokenCountParams): Promise<TokenCountResult>
  calculateCost(usage: Usage, model: string): CostBreakdown

  initialize(config: ProviderConfig): Promise<void>
  healthCheck(): Promise<HealthStatus>
  dispose(): Promise<void>
}

interface ProviderCapabilities {
  streaming: boolean
  reasoning: boolean
  embeddings: boolean
  toolCalling: boolean
  vision: boolean
  functionCalling: boolean
  jsonMode: boolean
  maxContextWindow: number
  supportedModels: string[]
}
```

### 3.3 OpenAI-Compatible Adapter

Many providers (Ollama, Groq, OpenRouter, vLLM, LM Studio) speak the OpenAI API format. `@agentbench/provider-utils` provides a base class that eliminates duplication:

```typescript
// @agentbench/provider-utils

abstract class OpenAICompatibleProvider implements AgentBenchProvider {
  abstract readonly id: string
  abstract readonly name: string

  protected baseUrl: string
  protected apiKey: string

  async createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    // Standard OpenAI-format HTTP request
  }

  // Subclasses only implement these three methods:
  abstract adaptParams(params: ChatCompletionParams): unknown
  abstract adaptResponse(raw: unknown): ChatCompletionResult
  abstract countTokens(params: TokenCountParams): Promise<TokenCountResult>
}
```

### 3.4 Provider Auto-Discovery

At startup, AgentBench scans for available providers:

```
1. Read explicit provider configs in agentbench.config.ts
2. Scan node_modules for @agentbench/provider-* packages
3. Check environment variables for API keys
4. Auto-register discovered providers
5. Report available providers in verbose output
```

---

## 4. @agentbench/core -- Detailed Design

### 4.1 Module Architecture (v0.5.0)

```
@agentbench/core/src/
├── index.ts                    # Public API surface
├── types/                      # Core type definitions
│   ├── index.ts
│   ├── trace.ts                # ExecutionTrace, TraceStep
│   ├── run.ts                  # Run, RunConfig, RunResult
│   ├── evaluator.ts            # Evaluator, Score, JudgeConfig + scoring constants
│   ├── assertion.ts            # Assertion, AssertionResult
│   ├── snapshot.ts             # Snapshot
│   ├── test.ts                 # TestCase, TestSuite
│   ├── experiment.ts           # Experiment, Variant
│   ├── coverage.ts             # CoverageReport
│   ├── dataset.ts              # Dataset, DatasetItem
│   └── provider.ts             # Provider interface
│
├── runner/                     # Agent Runner Engine
│   ├── index.ts
│   └── runner.ts               # execute, runBatch, timeout, RunContext
│
├── tracer/                     # Execution Tracer
│   ├── index.ts
│   ├── tracer.ts               # Tracer, traceLLMCall, recordResponse
│   ├── interceptors/
│   │   ├── openai.ts           # OpenAI SDK interceptor
│   │   └── anthropic.ts        # Anthropic SDK interceptor
│   └── stream-capture.ts       # SSE streaming capture
│
├── evaluator/                  # Evaluation Engine
│   ├── index.ts
│   ├── rule-evaluator.ts       # 14 rule evaluators
│   ├── llm-judge.ts            # LLM-as-Judge
│   ├── hybrid-judge.ts         # Hybrid judge + judge pool
│   └── judge-prompts.ts        # Prompt templates for all 8 dimensions
│
├── assertion/                  # Assertion Engine
│   ├── index.ts
│   ├── assert.ts               # Chainable assert builder
│   └── matchers/
│       ├── tool-matchers.ts
│       ├── token-matchers.ts
│       ├── latency-matchers.ts
│       ├── output-matchers.ts
│       └── score-matchers.ts
│
├── snapshot/                   # Snapshot Manager
│   ├── index.ts
│   └── snapshot-manager.ts     # Create, list, restore, compare snapshots
│
├── diff/                       # Diff Engine
│   ├── index.ts
│   └── diff-engine.ts          # Text, trace, and metric diffing
│
├── replay/                     # Replay Engine
│   ├── index.ts
│   └── replay-engine.ts        # Deterministic + cross-model replay
│
├── coverage/                   # Coverage Engine
│   ├── index.ts
│   └── coverage-engine.ts      # Prompt, workflow, tool, edge-case coverage
│
├── experiment/                 # Experiment Engine
│   ├── index.ts
│   └── experiment-engine.ts    # A/B experiments with variants
│
├── reporter/                   # Report Generation
│   ├── index.ts
│   └── report-generator.ts     # JSON, HTML, Markdown, JUnit formats
│
├── dataset/                    # Dataset Module
│   ├── index.ts
│   └── dataset.ts              # CSV, JSON, JSONL import/export/validate/split/version
│
├── storage/                    # Storage Abstraction Layer
│   ├── index.ts
│   ├── adapter.ts              # Interface (ISP-split: RunStorage, ProjectStorage, etc.)
│   └── memory-adapter.ts       # In-memory implementation for testing
│
└── utils/
    ├── index.ts
    ├── token-counter.ts        # Token counting utilities
    └── json-validator.ts       # JSON schema validation
```

> **Note:** The config system lives in `@agentbench/config` (separate package), and provider
> interfaces live in `@agentbench/provider-utils`. AgentBench's architecture follows a
> flat-per-module pattern — each module has an `index.ts`, a main implementation file, and
> a `.test.ts` file in the same directory. Complex sub-modules (e.g., evaluator scoring
> dimensions) are consolidated into single files rather than deeply nested directories.

### 4.2 Key Interfaces

```typescript
// @agentbench/core/src/types/trace.ts

interface ExecutionTrace {
  id: string
  runId: string
  steps: TraceStep[]
  metadata: TraceMetadata
  createdAt: Date
}

interface TraceStep {
  id: string
  sequence: number
  type: 'llm_call' | 'tool_call' | 'response' | 'error'

  startedAt: Date
  endedAt: Date
  duration: number

  llmRequest?: {
    provider: string
    model: string
    messages: Message[]
    tools?: ToolDefinition[]
    temperature: number
    maxTokens: number
  }
  llmResponse?: {
    content: string
    toolCalls?: ToolCall[]
    finishReason: string
    usage: TokenUsage
  }

  toolRequest?: {
    name: string
    arguments: Record<string, unknown>
  }
  toolResponse?: {
    result: unknown
    error?: string
  }

  cost: number
  status: 'success' | 'error' | 'timeout'
  error?: Error
}
```

---

## 5. Config System **[Introduced in v0.3.0]**

### 5.1 defineConfig

The `defineConfig` helper provides full TypeScript IntelliSense for the configuration file:

```typescript
import { defineConfig } from 'agentbench'

export default defineConfig({
  name: 'my-agent-tests',
  agent: { entry: './src/agent.ts' },
  providers: { /* ... */ },
  test: {
    testDir: './tests',
    timeout: 30000,
    retry: 2,
    maxConcurrency: 4,
  },
  assertions: {
    scoreThreshold: 7,
    maxTokens: 4096,
    maxLatency: 30000,
  },
  replay: {
    storage: '.agentbench/snapshots',
    mode: 'deterministic',
  },
  evaluation: {
    judges: ['correctness', 'faithfulness', 'safety'],
    judgeModel: 'openai/gpt-4o-mini',
  },
  coverage: {
    dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
    thresholds: { prompt: 0.8, workflow: 0.7, tool: 0.9, 'edge-case': 0.5 },
  },
  report: {
    formats: ['terminal', 'json', 'html', 'junit'],
    outputDir: './report',
  },
  ci: {
    provider: 'github-actions',
    commentOnPR: true,
    failOnRegression: true,
  },
})
```

### 5.2 Config Resolution Priority

```
1. CLI flags                    (highest priority)
2. agentbench.config.ts         (local project)
3. agentbench.config.js / .mjs
4. agentbench.config.json
5. "agentbench" in package.json
6. Environment variables        (AGENTBENCH_*)
7. Built-in defaults            (lowest priority)
```

---

## 6. Dataset Module **[Introduced in v0.3.0]**

### 6.1 Format Support

The dataset module supports importing and exporting across formats: CSV, JSON, JSONL, HuggingFace datasets, OpenAI Evals format, DeepEval format, and LangSmith datasets.

### 6.2 Core Operations

```typescript
import { Dataset } from '@agentbench/core'

// Load from any supported format
const ds = await Dataset.fromCSV('./queries.csv')
const ds = await Dataset.fromHuggingFace('user/dataset')

// Validate integrity
const report = ds.validate()

// Split with stratification
const { train, test, validation } = ds.split({ train: 0.7, test: 0.2, validation: 0.1 })

// Version and diff
ds.createVersion('v1.1')
const diff = ds.diff(oldVersion)
```

### 6.3 CLI Commands

```bash
agentbench dataset import ./data/queries.csv --name "Customer Queries v1"
agentbench dataset export my-dataset --format csv --output ./export/
agentbench dataset validate my-dataset
agentbench dataset split my-dataset --train 0.7 --test 0.3
agentbench dataset sample my-dataset --count 50
agentbench dataset version my-dataset --create v1.1
agentbench dataset diff my-dataset v1.0 v1.1
```

---

## 7. GitHub Integration Architecture **[Introduced in v0.3.0]**

### 7.1 Integration Flow

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

### 7.2 Key Capabilities

- **Zero-config CI** -- `agentbench init` auto-generates `.github/workflows/agentbench.yml`
- **PR Comments** -- Rich, actionable feedback posted as PR comments with metric tables, regression detection, and suspected causes
- **Check Runs API** -- Native GitHub check runs with pass/fail/regression status
- **Cost Tracking** -- Cost impact of changes shown in the PR comment
- **Regression Detection** -- Automatically compares against baseline and flags degradations

---

## 8. VS Code Extension Architecture **[Introduced in v0.3.0]**

### 8.1 Extension Structure

```
agentbench-vscode/
├── package.json                  # Extension manifest
├── src/
│   ├── extension.ts              # Activation entry point
│   ├── commands.ts               # Command palette registrations
│   ├── testRunner.ts             # Test execution integration
│   ├── traceViewer.ts            # Trace visualization panel
│   ├── codeLens.ts               # CodeLens (Run | Debug | Replay)
│   ├── statusBar.ts              # Status bar item
│   ├── diagnostics.ts            # Diagnostic collection (Problems panel)
│   ├── treeView.ts               # Sidebar tree view
│   ├── coverage.ts               # Coverage visualization
│   └── config.ts                 # Extension configuration
├── webview/
│   ├── trace-viewer/             # Trace viewer webview (React)
│   │   ├── app.tsx
│   │   ├── components/
│   │   │   ├── TraceTimeline.tsx
│   │   │   ├── StepDetail.tsx
│   │   │   ├── ToolCallCard.tsx
│   │   │   ├── TokenUsage.tsx
│   │   │   └── ScoreBreakdown.tsx
│   ├── report-viewer/            # Report viewer webview
│   └── compare-viewer/           # Side-by-side compare viewer
└── media/
    ├── icon.png
    └── icon-dark.png
```

### 8.2 Key Features

| Feature | Description |
|---------|-------------|
| **Test Runner** | Run all tests, current test, or test suite from the editor |
| **CodeLens** | Inline Run, Debug, Replay, and Snapshot buttons above each test |
| **Status Bar** | Test pass/fail status, time, and cost at a glance |
| **Diagnostics** | Failed assertions appear as VS Code diagnostics in the Problems panel |
| **Trace Viewer** | Visual step-by-step trace of agent execution in a webview panel |
| **Sidebar Tree** | Browse test suites, run history, coverage stats, and snapshots |
| **Compare Viewer** | Side-by-side comparison of two runs |
| **Coverage** | Coverage bars for prompt, workflow, tool, and edge-case dimensions |

---

## 9. API Design

### 9.1 REST API Endpoints (v0.3.0 Additions)

```
# All v0.2.0 endpoints retained, plus:

# Datasets [NEW]
GET    /api/v1/projects/:projectId/datasets
POST   /api/v1/datasets
GET    /api/v1/datasets/:id
PUT    /api/v1/datasets/:id
DELETE /api/v1/datasets/:id
POST   /api/v1/datasets/:id/items
GET    /api/v1/datasets/:id/items
POST   /api/v1/datasets/import
POST   /api/v1/datasets/:id/export
POST   /api/v1/datasets/:id/split
GET    /api/v1/datasets/:id/versions
POST   /api/v1/datasets/:id/versions

# Providers [NEW]
GET    /api/v1/providers
GET    /api/v1/providers/:id

# CI / Webhooks [NEW]
POST   /api/v1/webhooks/github
POST   /api/v1/webhooks/gitlab
POST   /api/v1/webhooks/ci
```

---

## 10. Data Flow: A Typical Test Run

```
User runs: agentbench test

1. CLI boots → Loads agentbench.config.ts via defineConfig
2. Config resolver merges CLI flags on top of config file defaults
3. Provider Registry auto-discovers installed providers
4. Test Runner loads test files from testDir, builds suite tree
5. For each test case:
   a. Runner creates execution context (env, timeout, sandbox)
   b. Agent receives input, calls LLM via provider
   c. Tracer intercepts all LLM calls and tool calls
   d. Assertions are evaluated (rule-based + LLM judge)
   e. RunResult is produced (status, trace, scores, metrics)
6. Reporter generates outputs (terminal, JSON, HTML, JUnit)
7. Exit code: 0 if all pass, 1 if any fail
```

---

## 11. Database Schema (Additions for v0.3.0)

```
New models:
  Dataset         -- Dataset metadata (name, format, version, schema)
  DatasetItem     -- Individual dataset items (input, expected output)
  DatasetVersion  -- Version history with diffs
  Provider        -- Registered provider metadata and capabilities
  GitHubCheck     -- GitHub Check Run records
```

The full ER diagram includes all v0.2.0 models (User, Project, TestSuite, TestCase, Run, TraceStep, Score, AssertionResult, Snapshot, SnapshotData, Experiment, Variant, APIKey) plus v0.3.0 additions.

---

## 12. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Deployment                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   CDN / Proxy   │     │   Docker Hub    │               │
│  │   (CloudFlare)  │     │   / ghcr.io     │               │
│  └────────┬────────┘     └─────────────────┘               │
│           ▼                                                  │
│  ┌────────────────────────────────────────┐                 │
│  │           Docker Compose / K8s          │                 │
│  │                                         │                 │
│  │  ┌──────────┐  ┌──────────┐           │                 │
│  │  │ Next.js  │  │  Worker  │           │                 │
│  │  │ (Web)    │  │ (BullMQ) │           │                 │
│  │  │ :3000    │  │          │           │                 │
│  │  └──────────┘  └──────────┘           │                 │
│  │                                         │                 │
│  │  ┌──────────┐  ┌──────────┐           │                 │
│  │  │PostgreSQL│  │  Redis   │           │                 │
│  │  │ :5432    │  │  :6379   │           │                 │
│  │  └──────────┘  └──────────┘           │                 │
│  │                                         │                 │
│  │  ┌──────────┐                          │                 │
│  │  │  MinIO   │  (File storage)          │                 │
│  │  │  :9000   │                          │                 │
│  │  └──────────┘                          │                 │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  For Self-Hosted (Community):                                │
│  - Single docker-compose.yml                                 │
│  - 4 containers: web, worker, postgres, redis               │
│  - 2GB RAM minimum                                           │
│                                                              │
│  For Enterprise:                                             │
│  - Kubernetes Helm Chart                                     │
│  - Horizontal scaling for workers                            │
│  - Managed PostgreSQL / Redis                                │
│  - SSO (SAML/OIDC)                                          │
│  - Audit logging                                             │
└─────────────────────────────────────────────────────────────┘
```

---

> **Next Steps:** [Database Schema Detail](SCHEMA.md) | [API Reference](API_REFERENCE.md)

[Back to Documentation Index](INDEX.md)
