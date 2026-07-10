---
title: Configuration Reference
description: Complete reference for every option in agentbench.config.ts, with types, defaults, descriptions, and examples.
targetAudience: Developers configuring AgentBench for their project
readingTime: 12 min
prerequisites:
  - AgentBench installed
  - TypeScript project (config file is TypeScript)
---

# Configuration Reference

AgentBench is configured through a single `agentbench.config.ts` file at your project root. The file exports a default config using the `defineConfig` helper, which provides full TypeScript autocompletion and validation.

## Quick Start

```typescript
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.3,
    maxTokens: 4096,
  },
  test: {
    testDir: './tests',
    timeout: 30000,
    retry: 2,
  },
})
```

---

## Top-Level Structure

The configuration is organized into the following sections:

| Section | Description |
|---|---|
| `providers` | LLM provider connection details (API keys, base URLs) |
| `agent` | Agent-under-test settings (model, prompts, tools, sampling) |
| `test` | Test execution settings (discovery, timeout, concurrency) |
| `assertions` | Default assertion thresholds applied to all tests |
| `replay` | Replay recording and playback settings |
| `evaluation` | LLM-as-Judge configuration |
| `coverage` | Coverage analysis dimensions and thresholds |
| `report` | Report output formats and directories |
| `ci` | CI/CD integration settings |

---

## `providers`

Configuration for each LLM provider. Keys are provider IDs, values are `ProviderConfig` objects.

```typescript
providers?: Record<string, ProviderConfig>
```

**TypeScript:**

```typescript
type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom'

interface ProviderConfig {
  provider: ProviderId       // Provider identifier
  apiKey?: string            // API key (prefer process.env)
  apiBase?: string           // Base URL override (proxies / self-hosted)
  organization?: string      // Org ID (OpenAI-specific)
  headers?: Record<string, string>  // Extra HTTP headers
  timeout?: number           // Request timeout (ms)
  maxRetries?: number        // Max retries on transient failures
}
```

**Default:** `{}`

**Example:**

```typescript
providers: {
  openai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    organization: 'org-abc123',
    timeout: 60000,
    maxRetries: 3,
  },
  anthropic: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 2,
  },
  self_hosted: {
    provider: 'custom',
    apiKey: process.env.LLAMA_API_KEY,
    apiBase: 'http://localhost:8080/v1',
    timeout: 120000,
  },
}
```

---

## `agent`

Configuration for the agent under test.

```typescript
agent?: AgentConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `provider` | `string` | `undefined` | Provider ID (must match a key in `providers` or a built-in ID) |
| `model` | `string` | `undefined` | Model name (e.g., `gpt-4o`, `claude-sonnet-4-20250514`) |
| `systemPrompt` | `string` | `undefined` | System prompt injected at the start of every conversation |
| `temperature` | `number` | `0` | Sampling temperature (0-2). Lower = more deterministic. |
| `maxTokens` | `number` | `4096` | Maximum tokens per LLM completion |
| `topP` | `number` | `undefined` | Nucleus sampling parameter (0-1) |
| `frequencyPenalty` | `number` | `undefined` | Frequency penalty (-2.0 to 2.0). Positive reduces repetition. |
| `presencePenalty` | `number` | `undefined` | Presence penalty (-2.0 to 2.0). Positive encourages new topics. |
| `stop` | `string[]` | `undefined` | Stop sequences that halt generation |
| `tools` | `ToolConfig[]` | `undefined` | Tools available to the agent |

### `ToolConfig`

```typescript
interface ToolConfig {
  name: string                           // Unique tool name
  description: string                    // Human-readable description
  parameters: Record<string, unknown>    // JSON Schema for parameters
}
```

**Example:**

```typescript
agent: {
  provider: 'openai',
  model: 'gpt-4o',
  systemPrompt: `You are a customer support agent for an e-commerce platform.
You have access to order lookup, refund processing, and knowledge base search tools.
Always verify the customer's identity before processing refunds.`,
  temperature: 0.3,
  maxTokens: 4096,
  topP: 0.95,
  tools: [
    {
      name: 'search_orders',
      description: 'Search customer orders by email or order ID',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Customer email address' },
          order_id: { type: 'string', description: 'Order ID (optional)' },
        },
        required: ['email'],
      },
    },
    {
      name: 'process_refund',
      description: 'Process a refund for an order',
      parameters: {
        type: 'object',
        properties: {
          order_id: { type: 'string', description: 'Order ID to refund' },
          reason: { type: 'string', description: 'Reason for refund' },
          amount: { type: 'number', description: 'Refund amount in USD' },
        },
        required: ['order_id', 'reason'],
      },
    },
  ],
}
```

---

## `test`

Test execution configuration. Follows Jest/Vitest naming conventions.

```typescript
test?: TestConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `testDir` | `string` | `'./tests'` | Directory containing test files |
| `testMatch` | `string \| string[]` | `undefined` | Glob patterns to match test files within `testDir` |
| `timeout` | `number` | `30000` | Per-test timeout in milliseconds |
| `retry` | `number` | `2` | Number of retries for failed tests |
| `maxConcurrency` | `number` | `4` | Maximum concurrent test executions |
| `bail` | `boolean` | `undefined` | Stop after the first test failure |
| `setupFiles` | `string[]` | `undefined` | Files to run before each test suite |
| `globalSetup` | `string` | `undefined` | Path to a global setup module (runs once before all tests) |
| `globalTeardown` | `string` | `undefined` | Path to a global teardown module (runs once after all tests) |

**Example:**

```typescript
test: {
  testDir: './tests',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  timeout: 60000,          // 60s per test (for complex agent interactions)
  retry: 1,                // Only retry once to save costs
  maxConcurrency: 2,       // Limit to 2 concurrent (rate limiting)
  bail: true,              // Stop on first failure in CI
  setupFiles: ['./tests/setup.ts'],
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
}
```

---

## `assertions`

Default assertion thresholds applied to every test case. Individual tests can override these.

```typescript
assertions?: AssertionDefaults
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `scoreThreshold` | `number` | `7` | Minimum score on 1-10 scale for a passing test |
| `maxTokens` | `number` | `4096` | Maximum allowed tokens per test run |
| `maxLatency` | `number` | `30000` | Maximum allowed end-to-end latency (ms) |
| `requiredTools` | `string[]` | `undefined` | Tools the agent must call at least once |
| `forbiddenTools` | `string[]` | `[]` | Tools the agent must never call |

**Example:**

```typescript
assertions: {
  scoreThreshold: 8,          // Higher bar for production
  maxTokens: 2048,            // Tight token budget
  maxLatency: 15000,          // 15s max latency
  requiredTools: ['search_docs', 'verify_identity'],
  forbiddenTools: ['delete_record', 'sudo_execute', 'raw_sql_query'],
}
```

---

## `replay`

Replay recording and playback configuration.

```typescript
replay?: ReplayConfig
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Enable replay recording and playback |
| `storageDir` | `string` | `'.agentbench/replays'` | Directory for replay snapshots |
| `maxReplays` | `number` | `undefined` | Maximum replay snapshots to retain |
| `ttl` | `number` | `undefined` | Time-to-live for snapshots in seconds (0 = indefinite) |
| `mode` | `'deterministic' \| 'llm' \| 'mixed'` | `'deterministic'` | Replay strategy |

### Replay Modes

| Mode | Behavior |
|---|---|
| `deterministic` | Play back exact recorded LLM responses. No API calls. Fastest and cheapest. |
| `llm` | Re-send prompts to the LLM with the same parameters. Useful for testing model behavior changes. |
| `mixed` | Deterministic for tools, LLM for text responses. Balances speed with freshness. |

**Example:**

```typescript
replay: {
  enabled: true,
  storageDir: '.agentbench/replays',
  maxReplays: 100,
  ttl: 86400 * 30,    // 30 days
  mode: 'deterministic',
}
```

---

## `evaluation`

LLM-as-Judge evaluation configuration.

```typescript
evaluation?: EvaluationConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `judges` | `JudgeDimension[]` | `['correctness', 'faithfulness', 'safety']` | Judge dimensions to evaluate |
| `judgeModel` | `string` | `'openai/gpt-4o-mini'` | Model for LLM-as-Judge (should be cheap and fast) |
| `scoreThreshold` | `number` | `7` | Minimum score (1-10) for a passing test |
| `rubric` | `string` | `undefined` | Custom scoring rubric for the LLM judge |

### Judge Dimensions

| Dimension | Description |
|---|---|
| `correctness` | Is the response factually accurate? |
| `faithfulness` | Does the response stay true to the source material? |
| `safety` | Is the response safe and free of harmful content? |
| `relevance` | Does the response address the user's query? |
| `completeness` | Does the response cover all aspects of the query? |
| `reasoning` | Is the reasoning/logic sound and well-structured? |
| `conciseness` | Is the response appropriately concise? |
| `tool_usage` | Are tools called correctly and appropriately? |

**Example:**

```typescript
evaluation: {
  judges: ['correctness', 'faithfulness', 'safety', 'completeness', 'tool_usage'],
  judgeModel: 'openai/gpt-4o-mini',
  scoreThreshold: 7,
  rubric: `Score from 1-10 where:
1-3: Completely incorrect or harmful
4-6: Partially correct with significant errors
7-8: Mostly correct with minor issues
9-10: Excellent, comprehensive, and helpful`,
}
```

---

## `coverage`

Coverage analysis configuration.

```typescript
coverage?: CoverageConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `dimensions` | `CoverageDimensionName[]` | `['prompt', 'workflow', 'tool', 'edge-case']` | Coverage dimensions to analyze |
| `thresholds` | `Record<string, number>` | `{}` | Per-dimension coverage thresholds (0-100) |
| `exclude` | `string[]` | `undefined` | Patterns to exclude from coverage analysis |

### Coverage Dimensions

| Dimension | Description |
|---|---|
| `prompt` | Coverage of different prompt variable combinations |
| `workflow` | Coverage of execution paths and branches |
| `tool` | Coverage of tool calls across test cases |
| `state` | Coverage of agent state transitions |
| `edge` | Coverage of edges between states |
| `edge-case` | Coverage of edge-case inputs and scenarios |

**Example:**

```typescript
coverage: {
  dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
  thresholds: {
    prompt: 80,
    workflow: 70,
    tool: 90,
    'edge-case': 60,
  },
  exclude: ['**/deprecated/**', '**/experimental/**'],
}
```

---

## `report`

Report generation configuration.

```typescript
report?: ReportConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `formats` | `ReportFormat[]` | `['terminal', 'json', 'html']` | Output formats |
| `outputDir` | `string` | `'./agentbench-report'` | Report output directory |
| `includeTrace` | `boolean` | `undefined` | Include full execution traces in reports |
| `includeMetrics` | `boolean` | `undefined` | Include detailed metrics breakdowns |

**`ReportFormat`:** `'terminal' | 'json' | 'html' | 'markdown' | 'junit'`

**Example:**

```typescript
report: {
  formats: ['terminal', 'json', 'html', 'markdown', 'junit'],
  outputDir: './agentbench-report',
  includeTrace: true,
  includeMetrics: true,
}
```

---

## `ci`

CI/CD integration configuration.

```typescript
ci?: CIConfig
```

### All Options

| Option | Type | Default | Description |
|---|---|---|---|
| `provider` | `CIProvider` | `'github-actions'` | CI platform |
| `failOnThreshold` | `boolean` | `true` | Fail the CI run if any threshold is breached |
| `commentOnPR` | `boolean` | `true` | Post a PR comment with test results |
| `artifactsDir` | `string` | `'./agentbench-artifacts'` | Directory for CI artifacts |

**`CIProvider`:** `'github-actions' | 'gitlab-ci' | 'circleci' | 'jenkins' | 'none'`

**Example:**

```typescript
ci: {
  provider: 'github-actions',
  failOnThreshold: true,
  commentOnPR: true,
  artifactsDir: './agentbench-artifacts',
}
```

---

## Complete Examples

### Minimal Configuration

```typescript
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  agent: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
  },
})
```

### Production Configuration

```typescript
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  providers: {
    openai: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      maxRetries: 3,
    },
    anthropic: {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 2,
    },
  },

  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: `You are a customer support agent.
Always greet the customer, verify their identity, and provide accurate information.
Never share personal data or make promises you cannot keep.`,
    temperature: 0.3,
    maxTokens: 4096,
    topP: 0.95,
    frequencyPenalty: 0.1,
    tools: [
      {
        name: 'search_kb',
        description: 'Search the knowledge base',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      {
        name: 'lookup_order',
        description: 'Look up an order by ID',
        parameters: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Order ID' },
          },
          required: ['order_id'],
        },
      },
    ],
  },

  test: {
    testDir: './tests',
    testMatch: ['**/*.test.ts'],
    timeout: 45000,
    retry: 2,
    maxConcurrency: 2,
    bail: true,
    globalSetup: './tests/global-setup.ts',
  },

  assertions: {
    scoreThreshold: 7,
    maxTokens: 4096,
    maxLatency: 30000,
    requiredTools: ['search_kb'],
    forbiddenTools: ['delete_record', 'execute_sql'],
  },

  replay: {
    enabled: true,
    storageDir: '.agentbench/replays',
    maxReplays: 50,
    ttl: 86400 * 14,
    mode: 'deterministic',
  },

  evaluation: {
    judges: ['correctness', 'faithfulness', 'safety', 'completeness', 'tool_usage'],
    judgeModel: 'openai/gpt-4o-mini',
    scoreThreshold: 7,
    rubric: `Evaluate on a 1-10 scale considering accuracy, helpfulness, and professionalism.`,
  },

  coverage: {
    dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
    thresholds: {
      prompt: 80,
      workflow: 70,
      tool: 85,
      'edge-case': 50,
    },
  },

  report: {
    formats: ['terminal', 'json', 'html', 'junit'],
    outputDir: './agentbench-report',
    includeTrace: false,
    includeMetrics: true,
  },

  ci: {
    provider: 'github-actions',
    failOnThreshold: true,
    commentOnPR: true,
    artifactsDir: './agentbench-artifacts',
  },
})
```

---

## Common Pitfalls

### API keys in config

Never hardcode API keys in `agentbench.config.ts`. Always use `process.env`:

```typescript
// CORRECT
apiKey: process.env.OPENAI_API_KEY,

// WRONG -- will be committed to git
apiKey: 'sk-abc123def456',
```

Store secrets in `.env.agentbench` (gitignored) or your system's environment.

### Provider ID mismatch

The `agent.provider` value must match a key in the `providers` map or be a built-in provider ID. Mismatches cause runtime errors.

```typescript
// WRONG: 'openai' is lowercase in providers but 'OpenAI' in agent
providers: { openai: { ... } },
agent: { provider: 'OpenAI', ... }

// CORRECT
providers: { openai: { ... } },
agent: { provider: 'openai', ... }
```

### Timeout vs maxLatency

`test.timeout` is the Jest-style test execution timeout (cancels the test if exceeded). `assertions.maxLatency` is an assertion threshold (marks the test as failed but does not cancel it). Set `test.timeout` higher than `assertions.maxLatency` to get meaningful failure messages.

```typescript
// CORRECT: timeout > maxLatency
test: { timeout: 60000 },
assertions: { maxLatency: 30000 },
```

### Judge model cost

LLM-as-Judge evaluation calls the judge model for each dimension on each test case. Using an expensive model (e.g., `gpt-4o`) as the judge can quickly multiply costs.

**Recommendation:** Always use a cheap model for judging: `openai/gpt-4o-mini`, `openai/gpt-4.1-nano`, or `anthropic/claude-haiku-4-5`.

### Coverage thresholds too strict

Setting coverage thresholds too high (e.g., 100%) will cause CI failures for any untested edge case. Start with reasonable thresholds (70-80%) and increase gradually.

---

## Next Steps

- [CLI Reference](./cli.md) -- Full CLI command reference
- [Assertion DSL Reference](./assertion-dsl.md) -- Chainable assertion API
- [REST API Reference](./api.md) -- Programmatic API
- [Cost Budget Enforcement in CI](../cookbook/cost-budget-enforcement.md) -- Prevent cost regressions
- [Safety Testing for AI Agents](../cookbook/safety-testing.md) -- Configure safety assertions
