---
title: "The Assertion Model"
description: "Complete guide to AgentBench's chainable assertion DSL with 25 matchers across 6 categories."
targetAudience: "Developers writing test cases and evaluation logic for AI agents"
readingTime: "10 min"
prerequisites:
  - "Understanding of Runs and Traces"
  - "Basic TypeScript knowledge"
---

# The Assertion Model

## Overview

AgentBench provides a fluent, chainable assertion DSL that reads like English and composes like functional code. At its heart is the `expect()` function, which builds a pipeline of assertions against a `RunResult` or `AssertionContext`. Each assertion is evaluated against the agent's execution trace -- its output text, tool calls, token usage, latency, evaluation scores, and final status. Assertions come in two fundamental flavors: **rule-based** (deterministic, zero-cost, instant) and **score-based** (LLM-evaluated, requires a judge call).

The assertion DSL is implemented in `@agentbench/core` at `packages/core/src/assertion/assert.ts`.

## The Chainable DSL Philosophy

The DSL is designed around a builder pattern. You start with `expect()`, chain through category selectors, pick a specific matcher, and call `.run()` to execute:

```typescript
import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()                              // Category: status
  .tool('search_docs').toBeCalled()                      // Category: tool
  .tool('search_docs').toBeCalledWith({ query: 'refund' }) // Category: tool
  .output().toContain('30 days')                         // Category: output
  .output().not.toContain('hallucinated fact')           // Category: output (negation)
  .tokens().toBeLessThan(4096)                           // Category: token
  .latency().toBeLessThan(5000)                          // Category: latency
  .score('correctness').toBeGreaterThan(7)               // Category: score
  .run()

console.log(result)
// {
//   assertions: [
//     { type: 'completed_successfully', status: 'passed', expected: 'completed', actual: 'passed' },
//     { type: 'tool_called', status: 'passed', ... },
//     ...
//   ],
//   passed: 8,
//   failed: 0,
//   errored: 0,
//   skipped: 0,
//   allPassed: true,
//   duration: 3   // ms
// }
```

### Key Design Principles

1. **Readable first**: `expect(result).tool("search").toBeCalled()` reads closer to English than `assert(result.toolCalls.includes("search"))`. This matters when non-engineers review test definitions.

2. **Composable**: Assertions can be combined with `.all()` and `.any()` for compound logic without nesting callbacks.

3. **Strongly typed**: The DSL builder returns typed sub-builders at each chain point, so your IDE autocompletes `.tokens().toBeLessThan()` but not `.tokens().toContain()`.

4. **Fast evaluation**: All assertions run synchronously against already-captured context. There is no network I/O during assertion evaluation.

## Matcher Reference: All 25 Matchers

The assertion system exposes 25 matchers organized into 6 categories. Each corresponds to either a declared `AssertionType` (used in JSON/config-based assertions) or a builder method on the DSL.

### 1. Status Matchers (2)

Assert on the run's final status.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.status().toBe(status)` | `completed_successfully` / `completed_with_error` | Assert the run ended with a specific status |
| `.status().toBeCompleted()` | (inline) | Assert the run completed (status is `passed` or `completed`) |

```typescript
// The run must complete without error
expect(runResult).status().toBeCompleted()

// The run must have errored (e.g., testing error handling)
expect(runResult).status().toBe('error')
```

### 2. Tool Matchers (7)

Assert on which tools were called, with what arguments, and how many times.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.tool(name).toBeCalled()` | `tool_called` | Tool was called at least once |
| `.tool(name).not.toBeCalled()` | `tool_not_called` | Tool was never called |
| `.tool(name).toBeCalledWith(args)` | `tool_called_with` | Tool was called with specific arguments |
| `.tool(name).toBeCalledTimes(n)` | `tool_called_times` | Tool was called exactly N times |

The `.toBeCalledWith()` matcher performs deep equality on arguments:

```typescript
// Assert search_docs was called with the right query
expect(runResult)
  .tool('search_docs').toBeCalledWith({
    query: 'refund policy',
    max_results: 5,
  })

// Assert the agent NEVER called a dangerous tool
expect(runResult)
  .tool('delete_customer_data').not.toBeCalled()

// Assert exactly 3 LLM calls were made
expect(runResult)
  .tool('search_docs').toBeCalledTimes(3)
```

Note: the `tool_called_times` config type also supports comparison operators (`eq`, `gt`, `gte`, `lt`, `lte`):

```json
{ "type": "tool_called_times", "params": { "tool": "search_docs", "times": 3, "operator": "gte" } }
```

### 3. Output Matchers (12)

Assert on the agent's final text output.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.output().toContain(substring)` | `contains` | Output contains the substring |
| `.output().not.toContain(substring)` | `not_contains` | Output does NOT contain the substring |
| `.output().toEqual(expected)` | `exact_match` | Output matches exactly (with optional normalization) |
| `.output().not.toEqual(expected)` | (negation) | Output does NOT equal the expected string |
| `.output().toMatchRegex(pattern, flags?)` | `matches_regex` | Output matches the regex pattern |
| `.output().not.toMatchRegex(pattern, flags?)` | (negation) | Output does NOT match the regex pattern |
| `.output().toMatchSchema(schema)` | `matches_schema` | Output is valid JSON matching a JSON schema |
| `.output().toMatchSnapshot(snapshot)` | `matches_snapshot` | Output matches a snapshot string |

```typescript
// Substring matching (case-insensitive by default)
expect(runResult).output().toContain('30-day')
expect(runResult).output().not.toContain('no refunds')

// Regex matching
expect(runResult).output().toMatchRegex(/refund.*(30|thirty)\s*days/i)

// Exact match with normalization (collapses whitespace, ignores case)
expect(runResult).output().toEqual('refunds are available within 30 days of purchase')

// JSON schema validation — output must be parseable JSON matching this shape
expect(runResult).output().toMatchSchema({
  type: 'object',
  properties: {
    eligible: { type: 'boolean' },
    refund_window_days: { type: 'number', minimum: 0 },
    conditions: { type: 'array', items: { type: 'string' } },
  },
  required: ['eligible', 'refund_window_days'],
})

// Snapshot matching
expect(runResult).output().toMatchSnapshot('baseline-refund-response')
```

### 4. Token Matchers (5)

Assert on token consumption.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.tokens().toBeLessThan(threshold)` | `tokens_lt` | Total tokens under threshold |
| `.tokens().toBeGreaterThan(threshold)` | `tokens_gt` | Total tokens above threshold |
| `.tokens().toBeBetween(min, max)` | `tokens_between` | Total tokens within a range |
| `.tokens().prompt().toBeLessThan(threshold)` | (inline) | Prompt tokens under threshold |

```typescript
// Stay within budget
expect(runResult).tokens().toBeLessThan(4096)

// Ensure the agent didn't give a one-word answer
expect(runResult).tokens().toBeGreaterThan(50)

// Target token range
expect(runResult).tokens().toBeBetween(200, 2000)

// Check prompt tokens specifically
expect(runResult).tokens().prompt().toBeLessThan(2048)
```

### 5. Latency Matchers (4)

Assert on execution timing.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.latency().toBeLessThan(threshold)` | `latency_lt` | Total duration under threshold (ms) |
| `.latency().toBeGreaterThan(threshold)` | `latency_gt` | Total duration above threshold (ms) |
| `.latency().firstToken().toBeLessThan(threshold)` | `first_token_lt` | Time-to-first-token under threshold (ms) |

```typescript
// SLA: respond within 10 seconds
expect(runResult).latency().toBeLessThan(10000)

// User-facing: first token within 500ms for streaming UX
expect(runResult).latency().firstToken().toBeLessThan(500)

// Latency floor (ensure no caching artifact)
expect(runResult).latency().toBeGreaterThan(100)
```

### 6. Score Matchers (4)

Assert on evaluation scores produced by rule evaluators or LLM judges.

| DSL Method | Config `type` | Description |
|---|---|---|
| `.score(dimension).toBeGreaterThan(threshold)` | `score_gt` | Score above threshold |
| `.score(dimension).toBeLessThan(threshold)` | `score_lt` | Score below threshold |
| `.score(dimension).toBeBetween(min, max)` | `score_between` | Score within range |

```typescript
// LLM judge scored correctness at 7 or above
expect(runResult).score('correctness').toBeGreaterThan(7)

// Safety is non-negotiable
expect(runResult).score('safety').toBeGreaterThan(9)

// Overall composite score
expect(runResult).score('overall').toBeBetween(7, 10)
```

When a dimension name is omitted, `.score()` matches against all scores:

```typescript
// Any score dropped below 5?
expect(runResult).score().toBeGreaterThan(5)
```

## Rule-Based vs Score-Based Assertions

A critical distinction in AgentBench's assertion model:

**Rule-based assertions** are deterministic and evaluated locally by AgentBench against the captured trace data. They check objective, measurable facts: "did the agent call tool X?", "is the latency under 5 seconds?", "does the output contain the word 'refund'?". These are instant, free, and never flaky.

```typescript
// Rule-based: deterministic facts about the trace
expect(runResult)
  .tool('search_docs').toBeCalled()        // Yes/no question about the trace
  .tokens().toBeLessThan(4096)             // Objective measurement
  .latency().toBeLessThan(10000)           // Objective measurement
  .output().toContain('30 days')           // Substring check
```

**Score-based assertions** depend on evaluation scores produced by LLM judges. These measure subjective qualities: "is the answer factually correct?", "is the reasoning sound?", "is the response safe?". These require an LLM call to produce the score, which must happen before assertion evaluation.

```typescript
// Score-based: depends on LLM judge evaluation
// The scores array on RunResult must already be populated
expect(runResult)
  .score('correctness').toBeGreaterThan(7) // LLM-judged quality
  .score('faithfulness').toBeGreaterThan(8) // LLM-judged quality
```

**Key rule**: always pair score-based assertions with rule-based assertions. A high correctness score is meaningless if the agent crashed before responding. Check the basics first:

```typescript
expect(runResult)
  .status().toBeCompleted()                   // Did it even finish?
  .tool('search_docs').toBeCalled()           // Did it use the right tool?
  .tokens().toBeLessThan(4096)                // Did it stay in budget?
  .score('correctness').toBeGreaterThan(7)    // Was the answer good?
```

## Compound Assertions

AgentBench supports logical composition with `.all()` (AND) and `.any()` (OR):

```typescript
// All conditions must pass (AND)
expect(runResult).all([
  (b) => b.output().toContain('refund'),
  (b) => b.output().toContain('30'),
  (b) => b.tokens().toBeLessThan(4096),
])

// At least one condition must pass (OR) — useful for checking multiple valid responses
expect(runResult).any([
  (b) => b.output().toContain('30 days'),
  (b) => b.output().toContain('thirty days'),
  (b) => b.output().toContain('one month'),
])
```

Compound assertions produce their own assertion results in the output:

```typescript
const result = await expect(runResult)
  .all([
    (b) => b.output().toContain('refund'),
    (b) => b.output().toContain('nonexistent'),  // This will fail
  ])
  .run()

// result.assertions includes a synthetic assertion:
// {
//   type: 'all',
//   status: 'failed',
//   expected: 'All conditions to pass',
//   actual: '1/2 passed',
//   message: '1 condition(s) failed',
// }
```

## How Assertion Failures Are Reported

Every assertion result includes `expected`, `actual`, and a human-readable `message`:

```typescript
// Successful assertion:
{
  type: 'tool_called',
  status: 'passed',
  expected: true,
  actual: true,
  message: 'Tool "search_docs" was called',
}

// Failed assertion:
{
  type: 'contains',
  status: 'failed',
  expected: 'Expected output to contain "30 days"',
  actual: 'Full agent output text...',
  message: 'Expected output to contain "30 days" at least 1 time(s), found 0',
}

// Errored assertion (e.g., invalid regex pattern):
{
  type: 'matches_regex',
  status: 'error',
  expected: null,
  actual: null,
  message: 'Invalid regex pattern: Unterminated group',
}
```

The `AssertionRunResult` aggregates everything:

```typescript
interface AssertionRunResult {
  assertions: AssertionResult[]  // One result per matcher
  passed: number                 // Count of passed
  failed: number                 // Count of failed
  errored: number                // Count of errors
  skipped: number                // Count of skipped
  allPassed: boolean             // Convenience: true if failed == 0 && errored == 0
  duration: number               // Total evaluation time in ms
}
```

In test reports, failures are displayed with inline diffs showing expected vs actual.

## Using Assertions in Configuration

Assertions can be defined declaratively in JSON (API, config files) or programmatically (TypeScript DSL). The JSON format uses the `AssertionConfig` type:

```json
{
  "assertions": [
    { "type": "tool_called", "params": { "tool": "search_docs" } },
    { "type": "contains", "params": { "substring": "30天" } },
    { "type": "tokens_lt", "params": { "threshold": 4096 } },
    { "type": "latency_lt", "params": { "threshold": 10000 } },
    { "type": "score_gt", "params": { "dimension": "correctness", "threshold": 7 } }
  ]
}
```

The TypeScript DSL is more expressive and type-safe:

```typescript
import { expect } from '@agentbench/core'

// Equivalent to the JSON above, but with IDE autocomplete and type checking
await expect(runResult)
  .tool('search_docs').toBeCalled()
  .output().toContain('30天')
  .tokens().toBeLessThan(4096)
  .latency().toBeLessThan(10000)
  .score('correctness').toBeGreaterThan(7)
  .run()
```

## Assertion Timeouts and Retries

Assertions evaluate instantly against captured data -- there are no timeouts or retries at the assertion level. However, the **run that produces the data** can time out, and that failure surfaces through status assertions:

```typescript
await expect(runResult)
  .status().toBeCompleted()  // Will fail if the run timed out
  .latency().toBeLessThan(30000) // Ensure timeout threshold is reasonable
```

If you need to retry a flaky agent run, configure retries at the `RunConfig` level, not the assertion level:

```typescript
const config: RunConfig = {
  // ...
  options: {
    timeout: 30000,
    maxSteps: 10,
    retries: 3,       // Retry the run up to 3 times on failure
    concurrency: 1,
    seed: 42,
  },
}
```

## Complete Example: A Real-World Assertion Suite

```typescript
import { expect } from '@agentbench/core'

async function validateCustomerSupportAgent(runResult: RunResult) {
  const results = await expect(runResult)
    // 1. Operational checks
    .status().toBeCompleted()
    .tokens().toBeLessThan(4096)
    .latency().toBeLessThan(10000)
    .latency().firstToken().toBeLessThan(1000)

    // 2. Tool usage checks
    .tool('search_knowledge_base').toBeCalled()
    .tool('escalate_to_human').not.toBeCalled()   // Should handle without escalation
    .tool('lookup_order').toBeCalledWith({ order_id: 'ORD-12345' })

    // 3. Output content checks
    .output().toContain('refund')
    .output().toContain('30 days')
    .output().not.toContain('I don\'t know')       // Should always find an answer
    .output().toMatchRegex(/\$\d+\.\d{2}/)         // Must mention a dollar amount

    // 4. Quality checks (requires prior LLM judge evaluation)
    .score('correctness').toBeGreaterThan(7)
    .score('faithfulness').toBeGreaterThan(8)
    .score('safety').toBeGreaterThan(9)

    // 5. Execute
    .run()

  if (!results.allPassed) {
    console.error(`${results.failed} assertion(s) failed:`)
    for (const a of results.assertions) {
      if (a.status === 'failed') {
        console.error(`  - [${a.type}] ${a.message}`)
      }
    }
  }

  return results
}
```

## Common Pitfalls

### "My score assertion always fails with 'score not found'"

**Problem**: You assert `score('correctness').toBeGreaterThan(7)` but the run was never evaluated by an LLM judge.

**Solution**: Ensure you have an LLM judge configured in your test case's evaluators and that you called `evaluate` on the run before asserting scores:

```bash
agentbench run --project my-project --name "test-run"
agentbench evaluate <run-id> --dimensions correctness,faithfulness
# Now score assertions will work
```

### "My output assertions are flaky because the LLM rephrases slightly"

**Problem**: You use `.toEqual()` but the LLM produces slightly different wording each time.

**Solution**: Use `.toContain()` for key facts, `.toMatchRegex()` for patterns, or `.score('correctness').toBeGreaterThan(N)` for semantic quality. Never use exact string matching for LLM outputs.

### "My compound assertion with .all() is too strict"

**Problem**: Using `.all()` for 10+ conditions, and one minor deviation fails the entire test.

**Solution**: Use `.all()` sparingly (3-5 conditions max). Split into separate test cases for different concerns. Or use `.score()` thresholds instead of boolean conditions for qualitative checks.

### "Tool argument assertions fail because of floating point precision"

**Problem**: `toBeCalledWith({ budget: 100.00 })` fails when the LLM passes `100` or `100.0`.

**Solution**: The `.toBeCalledWith()` matcher uses deep equality. If the LLM's JSON serialization differs from your expectation (string vs number, extra whitespace), the assertion will fail. Use `tool_called_with` with partial matching or consider validating tool arguments through output assertions instead.

## Next Steps

- **[Evaluation: Rules, Judges, and Hybrids](./evaluation.md)** -- learn how scores that power `.score()` assertions are produced
- **[Snapshot Testing for Agents](./snapshots.md)** -- learn about `.toMatchSnapshot()` for regression testing
- **[Dealing with LLM Non-Determinism](./non-determinism.md)** -- understand when to use rule-based vs score-based assertions
