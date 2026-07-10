---
title: "How Deterministic Replay Works"
description: "Record LLM responses and tool calls once, replay them deterministically with zero LLM cost for regression testing."
targetAudience: "Developers writing tests for AI agents who want to eliminate LLM costs from their CI pipeline"
readingTime: "8 min"
prerequisites:
  - "Understanding of AgentBench Runs and Traces"
  - "Familiarity with agentbench.config.ts"
---

# How Deterministic Replay Works

## Overview

Deterministic Replay is AgentBench's mechanism for recording a complete agent execution trace -- including every LLM response, tool call, and streamed token -- and replaying it exactly, on demand, without calling any external LLM API. This means you pay for LLM calls once during recording, then replay hundreds of times in CI at zero cost. Replay also enables cross-model compatibility testing: record a run with GPT-4o, then replay it against Claude to see if your agent behaves differently.

## The Recording Phase

When you run an agent through AgentBench with the `Tracer` enabled (enabled by default in all test runs), every interaction is intercepted and recorded:

### What Gets Recorded

The `Tracer` class in `@agentbench/core` wraps your LLM SDK calls and captures:

1. **LLM Requests**: The full request payload -- messages, tools, temperature, max tokens, provider, and model
2. **LLM Responses**: The complete response body -- content, tool calls, finish reason, and token usage (prompt, completion, total)
3. **Tool Calls**: Every tool invocation -- name, arguments, result or error
4. **Streaming Data**: For streaming responses, every SSE chunk is assembled into a complete response, with time-to-first-token measured
5. **Timing Information**: Start time, end time, and duration for every step
6. **Cost Information**: Calculated token cost for each LLM call

### How the Tracer Intercepts Calls

The tracer works by wrapping your actual API calls. Here is how the `traceLLMCall` method works internally:

```typescript
// Inside @agentbench/core — simplified illustration
const tracer = new Tracer({ runId: 'run_abc123' })

// The tracer wraps your execute function:
const result = await tracer.traceLLMCall(
  'openai',                    // provider
  'gpt-4o',                    // model
  {                            // request
    messages: [{ role: 'user', content: 'How do refunds work?' }],
    tools: [searchDocsTool],
    temperature: 0.7,
    max_tokens: 4096,
  },
  () => openai.chat.completions.create({ /* actual API call */ }),
  (response) => ({             // extractResponse callback
    content: response.choices[0].message.content,
    toolCalls: response.choices[0].message.tool_calls,
    finishReason: response.choices[0].finish_reason,
    usage: response.usage,
  }),
)
```

The resulting `ExecutionTrace` contains a detailed, ordered list of `TraceStep` objects:

```typescript
{
  id: 'trace_run_abc123',
  runId: 'run_abc123',
  steps: [
    {
      id: 'step_1719000000_1_a3f2b1',
      sequence: 1,
      type: 'llm_call',
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
      llmRequest: { messages: [...], tools: [...], temperature: 0.7, maxTokens: 4096 },
      llmResponse: { content: 'Let me search...', toolCalls: [...], usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 } },
      startedAt: '2026-07-10T10:00:00.000Z',
      endedAt: '2026-07-10T10:00:01.200Z',
      duration: 1200,
      cost: 0.00115,
      status: 'success',
    },
    {
      id: 'step_1719000001_2_b4c3d2',
      sequence: 2,
      type: 'tool_call',
      toolName: 'search_docs',
      toolRequest: { name: 'search_docs', arguments: { query: 'refund policy' } },
      toolResponse: { result: { ... }, error: undefined },
      startedAt: '2026-07-10T10:00:01.200Z',
      endedAt: '2026-07-10T10:00:01.450Z',
      duration: 250,
      status: 'success',
    },
    {
      id: 'step_1719000001_3_c5d4e3',
      sequence: 3,
      type: 'llm_call',
      llmProvider: 'openai',
      llmModel: 'gpt-4o',
      llmResponse: { content: 'You can refund within 30 days...', finishReason: 'stop', usage: { ... } },
      duration: 1800,
      status: 'success',
    },
  ],
  metadata: { agentName: 'customer-support', environment: 'test', os: 'darwin', runtime: 'Node.js v22.0.0' },
  createdAt: '2026-07-10T10:00:03.450Z',
}
```

## Storage Format

Traces are persisted alongside snapshots. AgentBench stores them in a structured directory under your project:

```
.agentbench/
  snapshots/
    <project-slug>/
      <snapshot-id>/
        snapshot.json          # Full SnapshotData — agent config, prompt, model, tools, context
        trace.json             # ExecutionTrace — all recorded steps
        metrics.json           # RunMetrics — aggregated token/cost/latency stats
```

The `snapshot.json` captures the complete agent state needed for reproduction:

```json
{
  "agent": {
    "name": "customer-support",
    "version": "1.2.0",
    "config": { "provider": "openai", "model": "gpt-4o", "systemPrompt": "You are a customer support agent.", "temperature": 0.7, "maxTokens": 4096 }
  },
  "prompt": {
    "system": "You are a customer support agent.",
    "variables": { "tone": "professional", "language": "en" }
  },
  "model": { "provider": "openai", "name": "gpt-4o", "temperature": 0.7, "maxTokens": 4096 },
  "tools": [
    { "name": "search_docs", "description": "Search the knowledge base", "parameters": { "query": { "type": "string" } } }
  ],
  "execution": { /* Full ExecutionTrace — all LLM and tool call steps */ }
}
```

## Deterministic Replay

Deterministic replay is the simplest mode. You take a recorded trace and replay it with the same seed and configuration. The replay engine returns the **exact same responses and tool call results** from the recording -- no LLM API calls are made.

### How It Works

When you invoke deterministic replay, AgentBench:

1. Loads the `SnapshotData` and `ExecutionTrace` from disk
2. Reconstructs the `RunConfig` from the snapshot via `restoreConfigFromSnapshot()`
3. Sets the `seed` option to ensure any random behavior is reproducible
4. Replays each trace step in order -- when the agent code calls `openai.chat.completions.create()`, the replay engine intercepts the call and returns the recorded response from the trace instead of hitting the real API

### CLI Usage

```bash
# Record a run (creates a snapshot automatically)
agentbench run --project <project-id> --name "GPT-4o Baseline"

# Replay the last run deterministically
agentbench replay <run-id>

# Replay with a specific seed
agentbench replay <run-id> --mode deterministic --seed 42

# Replay and re-evaluate assertions
agentbench replay <run-id> --evaluate
```

### Programmatic API

```typescript
import { buildDeterministicReplay, applyReplayOverrides } from '@agentbench/core'

// Build a deterministic replay configuration from the original run
const replayConfig = buildDeterministicReplay(originalRunConfig, {
  seed: 42, // Ensures reproducible results
})

// Apply overrides to create the replay RunConfig
const newRunConfig = applyReplayOverrides(replayConfig)

// The new run config has the same agent, model, tools, and input,
// but uses the recorded trace for all LLM responses
console.log(newRunConfig.name) // "GPT-4o Baseline (replay)"
console.log(newRunConfig.options.seed) // 42
```

### CI Integration for Zero-Cost Regression Testing

This is the killer use case for deterministic replay. In your CI pipeline, you never want to pay for LLM calls on every commit. With replay, you record once and replay forever:

```yaml
# .github/workflows/agent-regression.yml
name: Agent Regression Tests

on:
  pull_request:
    paths:
      - 'agent/**'
      - 'prompts/**'
      - 'tools/**'

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }

      - run: pnpm install

      # Replay all baseline snapshots — zero LLM cost!
      - name: Run regression tests via replay
        run: |
          agentbench test --project customer-support \
            --mode replay \
            --snapshot baseline-v1.2.0 \
            --assertions "strict" \
            --reporter junit

      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: agent-test-results
          path: agentbench-results.xml
```

The result: every PR triggers a full regression test suite against your agent, checking that all assertions still pass, with **zero LLM API costs**. No API keys needed in CI for the replay. The replay is fast too -- no network latency, just reading from disk and replaying in memory.

## Cross-Model Replay

Cross-model replay lets you record a run with one model and replay it against a different model. This is invaluable for:

- **Migration testing**: moving from GPT-4o to Claude Sonnet? Replay your full test suite and compare behavior
- **Cost optimization**: does GPT-4o-mini produce the same tool calls and decision quality as GPT-4o?
- **Provider evaluation**: compare OpenAI vs Anthropic vs Gemini on your exact use cases
- **Compatibility detection**: find prompts or tool definitions that work on one provider but break on another

### How It Works

Unlike deterministic replay (which returns recorded responses), cross-model replay actually calls the new model with the same input. The replay engine:

1. Loads the original trace and configuration
2. Overrides the model, provider, temperature, and max tokens in the config
3. Optionally overrides the system prompt (to test prompt variations)
4. Optionally overrides tool definitions (to test compatibility)
5. Runs the agent against the new model
6. Compares metrics and scores against the original run
7. Detects regressions automatically

### Code Example

```typescript
import { buildCrossModelReplay, applyReplayOverrides, compareReplayToOriginal } from '@agentbench/core'

// Record a baseline with GPT-4o
const gpt4Run = await agentbench.run({ /* ... */, model: 'gpt-4o' })

// Replay with Claude Sonnet
const crossModelConfig = buildCrossModelReplay(gpt4Run.config, {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 4096,
})

const claudeRunConfig = applyReplayOverrides(crossModelConfig)
const claudeRun = await agentbench.run(claudeRunConfig)

// Compare results
const comparison = compareReplayToOriginal(
  gpt4Run.metrics,
  claudeRun.metrics,
  gpt4Run.scores,
  claudeRun.scores,
)

// comparison.regressions will flag any critical regressions:
// [
//   {
//     metric: 'totalCost',
//     severity: 'warning',
//     direction: 'increased',
//     original: 0.0123,
//     current: 0.0189,
//     threshold: 20,
//     changePercent: 53.7,
//     message: 'Cost increased by 53.7% ($0.0123 -> $0.0189)',
//   },
// ]
```

### CLI Usage

```bash
# Replay with a different model
agentbench replay <run-id> --mode cross-model --model claude-sonnet-4-20250514

# Also try a different prompt
agentbench replay <run-id> --mode cross-model \
  --model gpt-4o-mini \
  --prompt "You are a concise customer support agent. Answer in 2 sentences max."

# Test tool compatibility with a different provider
agentbench replay <run-id> --mode cross-model \
  --provider anthropic \
  --model claude-sonnet-4-20250514 \
  --tools ./tools- anthropic.json
```

## Batch Replay

Batch replay runs the same scenario N times (against the same or different models) and aggregates statistics. This is essential for measuring variance in non-deterministic agents and establishing statistical significance for experiments.

### When to Use Batch Replay

- **Variance analysis**: how much does agent behavior vary across 50 runs of the same input?
- **Statistical significance**: is the 3% improvement from Prompt B real, or just noise?
- **Reliability testing**: does your agent fail 1% of the time on the same input?
- **Warm/cold start analysis**: do the first few runs behave differently?

### Code Example

```typescript
import { buildBatchReplay, aggregateReplayResults } from '@agentbench/core'

const batchConfig = buildBatchReplay(originalRunConfig, 50, {
  parallel: true,   // Run replays concurrently
  seed: 42,         // Base seed (each replay gets seed + index)
})

// Run 50 times and aggregate
const batchResult = await agentbench.replay(batchConfig)

console.log(batchResult.aggregate)
// {
//   count: 50,
//   metrics: {
//     totalTokens:    { mean: 1250.34, stddev: 48.21, min: 1180, max: 1420 },
//     totalCost:      { mean: 0.0123,  stddev: 0.0005, min: 0.0118, max: 0.0142 },
//     totalLatency:   { mean: 3200.50, stddev: 450.12, min: 2100, max: 5100 },
//     stepCount:      { mean: 3.2,     stddev: 0.8,    min: 2,    max: 5 },
//     toolCallCount:  { mean: 4.1,     stddev: 1.2,    min: 2,    max: 7 },
//   },
// }
```

### CLI Usage

```bash
# Replay 100 times in parallel
agentbench replay <run-id> --mode batch --count 100 --parallel

# Replay against multiple models, 10 times each
agentbench replay <run-id> --mode batch --models gpt-4o,claude-sonnet-4,gpt-4o-mini --count 10
```

## Regression Detection

AgentBench automatically detects regressions when comparing replay results to original runs. The detection thresholds are configurable:

| Regression | Default Threshold | Severity Levels |
|---|---|---|
| Token increase | > 20% | warning (20-50%), critical (> 50%) |
| Cost increase | > 20% | warning (20-50%), critical (> 50%) |
| Latency increase | > 30% | warning (30-100%), critical (> 100%) |
| Score decrease | > 1 point | warning |

```typescript
import { detectRegressions, type ReplayRegressionThresholds } from '@agentbench/core'

const customThresholds: ReplayRegressionThresholds = {
  tokenIncreasePercent: 10,     // Stricter: flag at 10% increase
  costIncreasePercent: 10,
  latencyIncreasePercent: 20,
  scoreDecreaseAbsolute: 0.5,
}

const regressions = detectRegressions(comparison.metricDiffs, customThresholds)
```

## When to Use Each Mode

| Mode | Use Case | LLM Cost | Speed | Best For |
|---|---|---|---|---|
| **Deterministic** | Regression testing in CI, verifying assertions don't break | Zero | Instant | Every PR, every commit |
| **Cross-Model** | Model migration, provider comparison, compatibility testing | One run per model | Normal | Before switching models or providers |
| **Batch** | Variance analysis, reliability testing, A/B experiment power analysis | N runs | N times normal | Establishing baselines, measuring variance |

## Best Practices

1. **Record baselines after every significant change.** After you update a prompt, tool definition, or system instruction, record a new snapshot. Old snapshots tied to old prompts will produce misleading comparisons.

2. **Use deterministic replay in CI for every PR.** It is free and fast. There is no reason not to run your full agent test suite on every commit.

3. **Run cross-model replays before model migration.** Do not assume GPT-4o prompts work on Claude or Gemini. Replay your top 50 test cases against the target model and review the diffs before making the switch.

4. **Use batch replay (N >= 30) for performance claims.** A single run is not representative. If you claim "Prompt B reduces latency by 15%", back it with 30+ runs and standard deviations from batch replay.

5. **Store replay data alongside your code.** Commit `.agentbench/snapshots/` to your repository so every developer and CI runner has access to the same baselines.

6. **Set regression thresholds appropriate to your use case.** A chatbot can tolerate 30% latency increase. An autonomous driving agent probably cannot. Tune the thresholds.

## Common Pitfalls

### "My replays fail because the snapshot is stale"

**Problem**: You updated the agent's tool definitions but are replaying against an old snapshot that references removed tools.

**Solution**: Run `agentbench snapshot create` after every tool or prompt change to update baselines. Automate this in your release process.

### "Cross-model replay shows false regressions"

**Problem**: Comparing GPT-4o (openai) to Claude (anthropic) triggers cost regressions because Anthropic's pricing is different.

**Solution**: Focus cross-model comparisons on behavioral metrics -- tool calls made, assertion pass rates, score differences -- rather than raw cost comparisons.

### "Batch replay is too slow in CI"

**Problem**: Running 100 replays sequentially takes too long for CI.

**Solution**: Use `--parallel` flag. Batch replays are embarrassingly parallel. Also, deterministic replay is always fast; use batch replay sparingly for variance analysis, not for every CI run.

### "Replay doesn't capture streaming behavior"

**Problem**: My agent uses streaming, and the replay doesn't replicate the chunk-by-chunk experience.

**Solution**: AgentBench's `Tracer.traceLLMCallStream()` captures the assembled full response from streaming chunks, including time-to-first-token. The replay returns the assembled response deterministically. For exact chunk-by-chunk replay (e.g., testing frontend streaming UX), use the `snapshot` system instead.

## Next Steps

- **[The Assertion Model](./assertions.md)** -- learn how to assert on replayed results
- **[Snapshot Testing for Agents](./snapshots.md)** -- learn how snapshots underpin the replay system
- **[Dealing with LLM Non-Determinism](./non-determinism.md)** -- understand why replay is essential for reliable testing
