# AgentBench — System Architecture

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentBench System                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   CLI Tool  │  │  Web Dashboard│ │   SDKs      │                 │
│  │ (Commander) │  │  (Next.js)   │  │ (@agentbench│                 │
│  │             │  │              │  │  /openai,   │                 │
│  │             │  │              │  │  /anthropic,│                 │
│  │             │  │              │  │  /mcp...)   │                 │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘                 │
│         │                │                 │                         │
│         └────────────────┼─────────────────┘                         │
│                          │                                           │
│                          ▼                                           │
│  ┌──────────────────────────────────────────────┐                   │
│  │              API Layer (REST + WS)            │                   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │                   │
│  │  │ REST API │ │Server    │ │ WebSocket    │ │                   │
│  │  │(Next.js) │ │Actions   │ │ (Realtime)   │ │                   │
│  │  └──────────┘ └──────────┘ └──────────────┘ │                   │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────┐                   │
│  │            @agentbench/core                   │                   │
│  │                                               │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐ │                   │
│  │  │ Runner  │ │ Tracer  │ │  Storage       │ │                   │
│  │  │ Engine  │ │ Engine  │ │  Layer         │ │                   │
│  │  └────┬────┘ └────┬────┘ └───────┬────────┘ │                   │
│  │       │           │              │           │                   │
│  │  ┌────┴────┐ ┌────┴────┐ ┌──────┴────────┐ │                   │
│  │  │Replay   │ │Evaluator│ │  Snapshot     │ │                   │
│  │  │Engine   │ │Engine   │ │  Manager      │ │                   │
│  │  └─────────┘ └─────────┘ └───────────────┘ │                   │
│  │                                               │                   │
│  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐ │                   │
│  │  │Diff     │ │Coverage │ │  Reporter      │ │                   │
│  │  │Engine   │ │Engine   │ │  Engine        │ │                   │
│  │  └─────────┘ └─────────┘ └────────────────┘ │                   │
│  └──────────────────────┬───────────────────────┘                   │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────┐                   │
│  │              Data & Infra Layer               │                   │
│  │                                               │                   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │                   │
│  │  │PostgreSQL│ │  Redis   │ │ File Storage │ │                   │
│  │  │(Primary) │ │(Cache/Q) │ │ (S3/Local)   │ │                   │
│  │  └──────────┘ └──────────┘ └──────────────┘ │                   │
│  │                                               │                   │
│  │  ┌──────────┐ ┌──────────┐                   │                   │
│  │  │ BullMQ   │ │ External │                   │                   │
│  │  │(Workers) │ │ LLM APIs │                   │                   │
│  │  └──────────┘ └──────────┘                   │                   │
│  └──────────────────────────────────────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Package Architecture

### 2.1 Dependency Graph

```
                    ┌─────────────┐
                    │  @agentbench│
                    │  /core      │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │@agentbench │  │@agentbench │  │@agentbench │
   │/openai     │  │/anthropic  │  │/mcp        │
   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                  ┌────────────┐
                  │ agentbench │  (CLI)
                  │ CLI        │
                  └─────┬──────┘
                        │
                        ▼
                  ┌────────────┐
                  │ agentbench │  (Web Dashboard)
                  │ web        │
                  └────────────┘
```

### 2.2 Package Responsibilities

| Package | Responsibility | Dependencies |
|---------|---------------|--------------|
| `@agentbench/core` | Core engine: Runner, Tracer, Evaluator, Assertion, Snapshot, Diff, Coverage, Reporter, Storage abstraction | None (except DB driver) |
| `@agentbench/openai` | OpenAI SDK interception/wrapping | `@agentbench/core` |
| `@agentbench/anthropic` | Anthropic SDK interception/wrapping | `@agentbench/core` |
| `@agentbench/mcp` | MCP client wrapping and tracing | `@agentbench/core` |
| `@agentbench/langgraph` | LangGraph adapter | `@agentbench/core` |
| `agentbench-cli` | CLI tool (commander.js + ink) | `@agentbench/core`, `@agentbench/openai`, `@agentbench/anthropic` |
| `agentbench-web` | Next.js Dashboard | `@agentbench/core` |

---

## 3. @agentbench/core — Detailed Design

### 3.1 Module Architecture

```
@agentbench/core/src/
├── index.ts                    # Public API surface
├── types/                      # Core type definitions
│   ├── index.ts
│   ├── trace.ts                # ExecutionTrace, TraceStep
│   ├── run.ts                  # Run, RunConfig, RunResult
│   ├── evaluator.ts            # Evaluator, Score, JudgeConfig
│   ├── assertion.ts            # Assertion, AssertionResult
│   ├── snapshot.ts             # Snapshot
│   ├── test.ts                 # TestCase, TestSuite
│   ├── experiment.ts           # Experiment, Variant
│   ├── coverage.ts             # CoverageReport
│   ├── dataset.ts              # Dataset, DatasetItem
│   └── provider.ts             # Provider, Model configs
│
├── runner/                     # Agent Runner Engine
│   ├── index.ts
│   ├── runner.ts               # Main runner class
│   ├── context.ts              # Execution context builder
│   ├── sandbox.ts              # Execution sandbox
│   ├── timeout.ts              # Timeout management
│   └── concurrency.ts          # Concurrent execution
│
├── tracer/                     # Execution Tracer
│   ├── index.ts
│   ├── tracer.ts               # Main tracer class
│   ├── interceptors/           # LLM SDK interceptors
│   │   ├── base.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── generic.ts
│   ├── stream-capture.ts       # Streaming response capture
│   └── tool-capture.ts         # Tool call capture
│
├── evaluator/                  # Evaluation Engine
│   ├── index.ts
│   ├── rule-evaluator.ts       # Rule-based evaluation
│   ├── llm-judge.ts            # LLM-as-Judge
│   ├── hybrid-judge.ts         # Hybrid evaluation
│   ├── judge-pool.ts           # Judge model pool
│   └── scoring/                # Scoring functions
│       ├── correctness.ts
│       ├── faithfulness.ts
│       ├── safety.ts
│       ├── relevance.ts
│       ├── completeness.ts
│       └── reasoning.ts
│
├── assertion/                  # Assertion Engine
│   ├── index.ts
│   ├── assert.ts               # Main assertion builder
│   ├── matchers/               # Matcher library
│   │   ├── tool-matchers.ts
│   │   ├── token-matchers.ts
│   │   ├── latency-matchers.ts
│   │   ├── output-matchers.ts
│   │   └── score-matchers.ts
│   └── result.ts               # Assertion result types
│
├── snapshot/                   # Snapshot Manager
│   ├── index.ts
│   ├── create.ts               # Snapshot creation
│   ├── restore.ts              # Snapshot restoration
│   ├── compare.ts              # Snapshot comparison
│   └── store.ts                # Snapshot storage
│
├── diff/                       # Diff Engine
│   ├── index.ts
│   ├── text-diff.ts            # Text/prompt diff
│   ├── trace-diff.ts           # Execution trace diff
│   ├── metric-diff.ts          # Numeric metric diff
│   └── renderer.ts             # Diff visualization data
│
├── replay/                     # Replay Engine
│   ├── index.ts
│   ├── replay.ts               # Main replay class
│   ├── deterministic.ts        # Deterministic replay
│   └── cross-model.ts          # Cross-model replay
│
├── coverage/                   # Coverage Engine
│   ├── index.ts
│   ├── prompt-coverage.ts      # Variable combination coverage
│   ├── workflow-coverage.ts    # Execution path coverage
│   ├── tool-coverage.ts        # Tool call coverage
│   └── calculator.ts           # Coverage percentage calculation
│
├── experiment/                 # Experiment Engine
│   ├── index.ts
│   ├── experiment.ts           # Experiment runner
│   ├── variant.ts              # Variant management
│   └── statistics.ts           # Statistical tests
│
├── reporter/                   # Report Generation
│   ├── index.ts
│   ├── json-reporter.ts
│   ├── html-reporter.ts
│   ├── markdown-reporter.ts
│   └── junit-reporter.ts
│
├── storage/                    # Storage Abstraction Layer
│   ├── index.ts
│   ├── adapter.ts              # Storage adapter interface
│   ├── postgres-adapter.ts     # PostgreSQL adapter
│   ├── sqlite-adapter.ts       # SQLite adapter (local dev)
│   ├── memory-adapter.ts       # In-memory (ephemeral)
│   └── file-adapter.ts         # File-based (CLI local mode)
│
├── config/                     # Configuration
│   ├── index.ts
│   ├── loader.ts               # Config file loader
│   └── schema.ts               # Zod schema for config
│
└── utils/                      # Utilities
    ├── token-counter.ts        # Token counting (tiktoken)
    ├── cost-calculator.ts      # Cost calculation
    ├── latency.ts              # Timing utilities
    ├── id-generator.ts         # Run ID generation
    └── logger.ts               # Structured logging
```

### 3.2 Key Interfaces

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
  
  // Timing
  startedAt: Date
  endedAt: Date
  duration: number  // ms
  
  // LLM Call specific
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
  
  // Tool Call specific
  toolRequest?: {
    name: string
    arguments: Record<string, unknown>
  }
  toolResponse?: {
    result: unknown
    error?: string
  }
  
  // Cost
  cost: number
  
  // Status
  status: 'success' | 'error' | 'timeout'
  error?: Error
}

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

```typescript
// @agentbench/core/src/types/run.ts

interface RunConfig {
  name: string
  description?: string
  projectId: string
  testCaseId?: string
  
  // Agent configuration
  agent: {
    provider: 'openai' | 'anthropic' | 'gemini' | 'custom'
    model: string
    temperature: number
    maxTokens: number
    systemPrompt: string
    tools: ToolDefinition[]
  }
  
  // Input
  input: {
    messages: Message[]
    variables?: Record<string, string>
    context?: Record<string, unknown>
  }
  
  // Execution options
  options: {
    timeout: number        // ms
    maxSteps: number
    retries: number
    concurrency: number
    seed?: number          // For deterministic replay
  }
  
  // Tags
  tags: string[]
  metadata: Record<string, unknown>
}

interface RunResult {
  id: string
  config: RunConfig
  status: 'passed' | 'failed' | 'error' | 'timeout'
  
  // Trace
  trace: ExecutionTrace
  
  // Metrics
  metrics: RunMetrics
  
  // Evaluations
  scores: Score[]
  assertionResults: AssertionResult[]
  
  // Timing
  startedAt: Date
  endedAt: Date
  duration: number
  
  // Summary
  summary: string
}

interface RunMetrics {
  totalTokens: number
  promptTokens: number
  completionTokens: number
  totalCost: number
  totalLatency: number
  firstTokenLatency: number
  toolCallCount: number
  toolSuccessCount: number
  toolFailureCount: number
  stepCount: number
  llmCallCount: number
}
```

---

## 4. API Design

### 4.1 REST API Endpoints

```
# Projects
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id

# Test Suites
GET    /api/v1/projects/:projectId/suites
POST   /api/v1/projects/:projectId/suites
GET    /api/v1/suites/:id
PATCH  /api/v1/suites/:id
DELETE /api/v1/suites/:id

# Test Cases
GET    /api/v1/suites/:suiteId/cases
POST   /api/v1/suites/:suiteId/cases
GET    /api/v1/cases/:id
PATCH  /api/v1/cases/:id
DELETE /api/v1/cases/:id

# Runs
POST   /api/v1/runs                    # Execute a run
GET    /api/v1/runs                    # List runs (with filters)
GET    /api/v1/runs/:id                # Run detail
GET    /api/v1/runs/:id/trace          # Execution trace
GET    /api/v1/runs/:id/scores         # Evaluation scores
POST   /api/v1/runs/:id/replay        # Replay this run
POST   /api/v1/runs/:id/evaluate      # Re-evaluate
GET    /api/v1/runs/:id/artifacts     # Run artifacts (streaming)

# Compare / Diff
POST   /api/v1/compare                 # Compare two runs
GET    /api/v1/compare/:id             # Comparison result

# Snapshots
GET    /api/v1/projects/:projectId/snapshots
POST   /api/v1/snapshots
GET    /api/v1/snapshots/:id
POST   /api/v1/snapshots/:id/restore
DELETE /api/v1/snapshots/:id

# Experiments
GET    /api/v1/projects/:projectId/experiments
POST   /api/v1/experiments
GET    /api/v1/experiments/:id
POST   /api/v1/experiments/:id/run
GET    /api/v1/experiments/:id/results

# Coverage
GET    /api/v1/projects/:projectId/coverage
GET    /api/v1/projects/:projectId/coverage/trend

# Datasets
GET    /api/v1/projects/:projectId/datasets
POST   /api/v1/datasets
GET    /api/v1/datasets/:id
POST   /api/v1/datasets/:id/import
GET    /api/v1/datasets/:id/export
DELETE /api/v1/datasets/:id

# API Keys
GET    /api/v1/api-keys
POST   /api/v1/api-keys
DELETE /api/v1/api-keys/:id

# Dashboard
GET    /api/v1/dashboard/stats         # Aggregated statistics
GET    /api/v1/dashboard/trends        # Time-series data
GET    /api/v1/dashboard/models        # Per-model stats

# Auth
POST   /api/v1/auth/sign-up
POST   /api/v1/auth/sign-in
POST   /api/v1/auth/sign-out
POST   /api/v1/auth/refresh

# Webhook
POST   /api/v1/webhooks/github
POST   /api/v1/webhooks/gitlab
POST   /api/v1/webhooks/ci
```

### 4.2 WebSocket Events

```
# Real-time Run Updates
ws://localhost:3000/ws/runs/:runId

Events:
  - run.started        { runId, timestamp }
  - run.step           { runId, step: TraceStep }
  - run.completed      { runId, result: RunResult }
  - run.error          { runId, error }
  
# Dashboard Live Updates
ws://localhost:3000/ws/dashboard

Events:
  - stats.updated      { stats: DashboardStats }
  - run.created        { run: RunSummary }
  - run.completed      { run: RunSummary }
```

---

## 5. Route Design (Next.js App Router)

```
app/
├── (auth)/
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── forgot-password/page.tsx
│   └── layout.tsx                    # Auth layout (centered card)
│
├── (dashboard)/
│   ├── layout.tsx                    # Dashboard layout (sidebar + header)
│   │
│   ├── dashboard/
│   │   └── page.tsx                  # Main dashboard
│   │
│   ├── projects/
│   │   ├── page.tsx                  # Project list
│   │   └── [projectId]/
│   │       ├── page.tsx              # Project overview
│   │       ├── tests/
│   │       │   ├── page.tsx          # Test suites & cases
│   │       │   └── [testId]/
│   │       │       └── page.tsx      # Test case detail
│   │       ├── runs/
│   │       │   ├── page.tsx          # Run history
│   │       │   └── [runId]/
│   │       │       ├── page.tsx      # Run detail (timeline)
│   │       │       └── trace/
│   │       │           └── page.tsx  # Full trace view
│   │       ├── experiments/
│   │       │   ├── page.tsx          # Experiment list
│   │       │   └── [experimentId]/
│   │       │       └── page.tsx      # Experiment detail
│   │       ├── coverage/
│   │       │   └── page.tsx          # Coverage dashboard
│   │       ├── datasets/
│   │       │   ├── page.tsx          # Dataset list
│   │       │   └── [datasetId]/
│   │       │       └── page.tsx      # Dataset detail
│   │       └── settings/
│   │           └── page.tsx          # Project settings
│   │
│   ├── snapshots/
│   │   ├── page.tsx                  # Snapshot list
│   │   └── [snapshotId]/
│   │       └── page.tsx              # Snapshot detail
│   │
│   ├── compare/
│   │   └── page.tsx                  # Compare runs
│   │
│   ├── settings/
│   │   ├── page.tsx                  # Account settings
│   │   ├── api-keys/
│   │   │   └── page.tsx              # API keys management
│   │   ├── team/
│   │   │   └── page.tsx              # Team management (Pro)
│   │   └── billing/
│   │       └── page.tsx              # Billing (Pro)
│   │
│   └── docs/
│       └── page.tsx                  # In-app documentation
│
├── api/
│   └── v1/
│       ├── projects/...
│       ├── runs/...
│       ├── snapshots/...
│       ├── experiments/...
│       ├── datasets/...
│       ├── compare/...
│       └── ...
│
├── layout.tsx                        # Root layout
├── page.tsx                          # Landing page
├── error.tsx                         # Global error boundary
├── not-found.tsx                     # 404 page
└── loading.tsx                       # Global loading
```

---

## 6. CLI Architecture

```
agentbench-cli/src/
├── index.ts                    # Entry point
├── cli.ts                      # CLI bootstrap
│
├── commands/
│   ├── init.ts                 # agentbench init
│   ├── run.ts                  # agentbench run
│   ├── test.ts                 # agentbench test
│   ├── replay.ts               # agentbench replay
│   ├── compare.ts              # agentbench compare
│   ├── snapshot.ts             # agentbench snapshot
│   ├── experiment.ts           # agentbench experiment
│   ├── report.ts               # agentbench report
│   ├── config.ts               # agentbench config
│   └── serve.ts                # agentbench serve (launch dashboard)
│
├── ui/                         # CLI UI (Ink/React)
│   ├── run-progress.tsx        # Live run progress
│   ├── results-table.tsx       # Results table
│   ├── trace-view.tsx          # Trace viewer
│   └── report-view.tsx         # Report viewer
│
├── config/
│   ├── loader.ts               # agentbench.config.ts loader
│   └── default-config.ts       # Default configuration
│
└── utils/
    ├── output.ts               # Formatted output
    ├── spinner.ts              # Loading spinner
    └── errors.ts               # Error formatting
```

---

## 7. Database Schema (Logical)

```
┌─────────────────────────────────────────────────────────────┐
│                      Database ER Diagram                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐       ┌──────────────┐       ┌──────────┐    │
│  │   User   │1────N│  Project     │1────N│ TestSuite│    │
│  └──────────┘       └──────┬───────┘       └────┬─────┘    │
│                            │                     │           │
│                            │                    1│           │
│                            │                     │           │
│              ┌─────────────┼─────────┐          N│           │
│              │             │         │          │           │
│              ▼             ▼         ▼          ▼           │
│        ┌─────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│        │ Dataset │  │Experiment│ │  Run     │ │TestCase  ││
│        └────┬────┘  └────┬─────┘ └────┬─────┘ └────┬─────┘│
│             │            │            │              │       │
│            1│           1│           1│             1│       │
│             │            │            │              │       │
│            N│           N│           N│             N│       │
│        ┌────┴────┐ ┌────┴─────┐      │       ┌──────┴─────┐│
│        │Dataset  │ │Variant   │      │       │ Assertion  ││
│        │Item     │ └──────────┘      │       │ Evaluator  ││
│        └─────────┘                   │       └────────────┘│
│                                      │                      │
│              ┌───────────────────────┼───────────────┐      │
│              │                       │               │      │
│              ▼                       ▼               ▼      │
│        ┌──────────┐          ┌──────────┐    ┌──────────┐  │
│        │TraceStep │          │  Score   │    │Assertion │  │
│        │          │          │          │    │Result    │  │
│        └──────────┘          └──────────┘    └──────────┘  │
│                                                              │
│        ┌──────────┐          ┌──────────┐    ┌──────────┐  │
│        │ Snapshot │          │RunMetrics│    │ APIKey   │  │
│        └────┬─────┘          └──────────┘    └──────────┘  │
│             │                                                │
│            1│                                                │
│             │                                                │
│            1│                                                │
│        ┌────┴─────────┐                                      │
│        │SnapshotData  │ (JSONB - full snapshot payload)     │
│        └──────────────┘                                      │
│                                                              │
│  ┌──────────┐       ┌──────────────┐                         │
│  │Team/Org  │1────N│  TeamMember  │    (Pro/Enterprise)     │
│  └──────────┘       └──────────────┘                         │
│                                                              │
│  ┌──────────┐                                                │
│  │AuditLog  │   (Enterprise)                                │
│  └──────────┘                                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Deployment                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │   CDN / Proxy   │     │   Docker Hub    │               │
│  │   (CloudFlare)  │     │   / ghcr.io     │               │
│  └────────┬────────┘     └─────────────────┘               │
│           │                                                  │
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
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Transport                                          │
│  - HTTPS everywhere                                          │
│  - HSTS headers                                              │
│  - TLS 1.3 minimum                                          │
│                                                              │
│  Layer 2: Authentication                                     │
│  - NextAuth.js v5 (JWT + Database sessions)                  │
│  - OAuth 2.0 (Google, GitHub)                               │
│  - API Key auth for programmatic access                      │
│  - MFA/2FA (Pro/Enterprise)                                 │
│                                                              │
│  Layer 3: Authorization                                      │
│  - RBAC: Owner > Admin > Editor > Viewer                    │
│  - Project-level permissions                                 │
│  - API Key scopes: read, write, admin                       │
│                                                              │
│  Layer 4: Data Protection                                    │
│  - API Key hashing (SHA-256)                                 │
│  - Sensitive data encryption at rest                         │
│  - LLM API keys encrypted (AES-256-GCM)                     │
│  - PII masking in traces (configurable)                     │
│                                                              │
│  Layer 5: Rate Limiting                                      │
│  - Per-user rate limiting                                    │
│  - Per-API-Key rate limiting                                 │
│  - Per-IP rate limiting                                      │
│  - LLM Judge rate limiting (cost control)                   │
│                                                              │
│  Layer 6: Audit                                              │
│  - All mutations logged                                      │
│  - Sensitive operations logged                               │
│  - Audit log retention policy                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

> **Next Step**: Database Detailed Design (Prisma Schema)
