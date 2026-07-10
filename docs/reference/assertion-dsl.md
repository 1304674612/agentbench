---
title: Assertion DSL Reference
description: Complete API reference for the chainable assertion DSL with all 22 matchers, fluent API chain, and run() execution.
targetAudience: Developers writing agent tests with TypeScript
readingTime: 12 min
prerequisites:
  - TypeScript knowledge
  - Familiarity with AgentBench test structure
---

# Assertion DSL Reference

The AgentBench Assertion DSL is a chainable, fluent API for writing expressive assertions against agent run results. It reads like natural language and provides rich, typed feedback on failures.

## Quick Example

```typescript
import { expect } from '@agentbench/core'

const results = await expect(runResult)
  .status().toBeCompleted()
  .tool('search_kb').toBeCalled()
  .tool('search_kb').toBeCalledWith({ query: 'return policy' })
  .tool('delete_record').not.toBeCalled()
  .output().toContain('30-day return policy')
  .output().not.toContain('hallucinated fact')
  .tokens().toBeLessThan(4096)
  .latency().toBeLessThan(5000)
  .latency().firstToken().toBeLessThan(1000)
  .score('correctness').toBeGreaterThan(7)
  .score('safety').toBeGreaterThan(8)
  .run()

if (!results.allPassed) {
  console.error(`${results.failed} assertion(s) failed`)
  for (const a of results.assertions.filter(a => a.status === 'failed')) {
    console.error(`  [${a.type}] ${a.message}`)
  }
}
```

---

## Entry Point: `expect()`

```typescript
function expect(context?: AssertionContext | RunResult): AssertionBuilder
```

Creates a new `AssertionBuilder` with an optional context. If a `RunResult` is passed (from an agent execution), it is automatically converted into an `AssertionContext` via `buildContextFromRun()`. If no context is provided at construction time, you must pass one to `.run()`.

```typescript
// From a RunResult (auto-converted)
const builder = expect(runResult)

// From a plain AssertionContext
const builder = expect(assertionContext)

// Build first, run later
const builder = expect()
builder.tool('search').toBeCalled()
const results = builder.run(runResult)
```

---

## The Fluent API Chain

The `AssertionBuilder` exposes these chain entry points, each returning a specialized builder:

| Method | Returns | Chains to |
|---|---|---|
| `.status()` | `StatusAssertionBuilder` | `.toBe()`, `.toBeCompleted()` |
| `.tool(name)` | `ToolAssertionBuilder` | `.toBeCalled()`, `.toBeCalledWith()`, `.toBeCalledTimes()`, `.not.toBeCalled()` |
| `.output()` | `OutputAssertionBuilder` | `.toContain()`, `.toEqual()`, `.toMatchRegex()`, `.toMatchSchema()`, `.toMatchSnapshot()`, `.not.*` |
| `.tokens()` | `TokenAssertionBuilder` | `.toBeLessThan()`, `.toBeGreaterThan()`, `.toBeBetween()`, `.prompt().toBeLessThan()` |
| `.latency()` | `LatencyAssertionBuilder` | `.toBeLessThan()`, `.toBeGreaterThan()`, `.firstToken().toBeLessThan()` |
| `.score(dimension?)` | `ScoreAssertionBuilder` | `.toBeGreaterThan()`, `.toBeLessThan()`, `.toBeBetween()` |
| `.all(builders)` | `AssertionBuilder` | Nested sub-assertions |
| `.any(builders)` | `AssertionBuilder` | Nested sub-assertions |
| `.run(context?)` | `AssertionRunResult` | Terminal -- executes all assertions |

Every chain method returns `AssertionBuilder`, so you can continue chaining after any assertion:

```typescript
expect(runResult)
  .tool('search').toBeCalled()          // returns AssertionBuilder
  .output().toContain('result')         // returns AssertionBuilder
  .tokens().toBeLessThan(4096)          // returns AssertionBuilder
  .run()                                // executes all
```

---

## All Matchers by Category

### Status Matchers (2 matchers)

Assert on the overall run status.

#### `.status().toBeCompleted()`

**Signature:** `toBeCompleted(): AssertionBuilder`

Passes if the run status is `'passed'` or `'completed'`.

```typescript
.status().toBeCompleted()
```

#### `.status().toBe(expectedStatus: string)`

**Signature:** `toBe(expectedStatus: string): AssertionBuilder`

Passes if the run status exactly equals `expectedStatus`.

```typescript
.status().toBe('passed')
.status().toBe('failed')
```

---

### Tool Matchers (4 matchers)

Assert on which tools were called, with what arguments, and how many times.

#### `.tool(name).toBeCalled()`

**Signature:** `toBeCalled(): AssertionBuilder`

Passes if the named tool was called at least once during the run.

```typescript
.tool('search_kb').toBeCalled()
```

#### `.tool(name).toBeCalledWith(args: Record<string, unknown>)`

**Signature:** `toBeCalledWith(args: Record<string, unknown>): AssertionBuilder`

Passes if the named tool was called with arguments that match the provided object (using `JSON.stringify` comparison). Only the specified keys are checked; extra arguments are ignored.

```typescript
.tool('search_kb').toBeCalledWith({ query: 'return policy' })
.tool('process_refund').toBeCalledWith({ order_id: 'ORD-12345', reason: 'defective' })
```

#### `.tool(name).toBeCalledTimes(count: number)`

**Signature:** `toBeCalledTimes(count: number): AssertionBuilder`

Passes if the named tool was called exactly `count` times.

```typescript
.tool('search_kb').toBeCalledTimes(2)
.tool('lookup_order').toBeCalledTimes(1)
```

#### `.tool(name).not.toBeCalled()`

**Signature:** `not.toBeCalled(): AssertionBuilder`

Passes if the named tool was never called. Use this for safety assertions -- ensuring dangerous tools are not invoked.

```typescript
.tool('delete_record').not.toBeCalled()
.tool('execute_sql').not.toBeCalled()
.tool('sudo_command').not.toBeCalled()
```

---

### Output Matchers (6 matchers)

Assert on the text output produced by the agent.

#### `.output().toContain(substring: string)`

**Signature:** `toContain(substring: string): AssertionBuilder`

Passes if the agent output contains the given substring. Case-sensitive by default. Internally accepts a `caseSensitive` parameter (default `true`).

```typescript
.output().toContain('Your refund has been processed')
.output().toContain('Order #ORD-12345')
```

#### `.output().not.toContain(substring: string)`

**Signature:** `not.toContain(substring: string): AssertionBuilder`

Passes if the agent output does **not** contain the substring. Useful for detecting hallucinations or disallowed content.

```typescript
.output().not.toContain('I cannot help with that')
.output().not.toContain('hallucinated_information')
.output().not.toContain('password')
```

#### `.output().toEqual(expected: string)`

**Signature:** `toEqual(expected: string): AssertionBuilder`

Passes if the agent output exactly equals the expected string. Accepts an internal `normalize` parameter (default `false`) that collapses whitespace.

```typescript
.output().toEqual('Your order has been refunded successfully.')
```

#### `.output().not.toEqual(expected: string)`

**Signature:** `not.toEqual(expected: string): AssertionBuilder`

Passes if the output does **not** exactly equal the expected string.

```typescript
.output().not.toEqual('')  // Ensure output is not empty
```

#### `.output().toMatchRegex(pattern: string, flags?: string)`

**Signature:** `toMatchRegex(pattern: string, flags?: string): AssertionBuilder`

Passes if the output matches the given regular expression. If the pattern is invalid, the assertion status is `'error'`.

```typescript
.output().toMatchRegex(/order\s+#?[A-Z]+-\d+/i)
.output().toMatchRegex('\\d{4}-\\d{2}-\\d{2}', 'g')  // Date pattern
.output().toMatchRegex('Refund.*\\$\\d+\\.\\d{2}')     // Refund with dollar amount
```

#### `.output().not.toMatchRegex(pattern: string, flags?: string)`

**Signature:** `not.toMatchRegex(pattern: string, flags?: string): AssertionBuilder`

Passes if the output does **not** match the given regular expression.

```typescript
.output().not.toMatchRegex('\\b(password|secret|token)\\b', 'i')
```

#### `.output().toMatchSchema(schema: Record<string, unknown>)`

**Signature:** `toMatchSchema(schema: Record<string, unknown>): AssertionBuilder`

Parses the output as JSON and validates it against a JSON Schema-like object. Supports `type`, `required`, `properties`, `items`, `enum`, `minLength`/`maxLength`, `minimum`/`maximum`, `additionalProperties`, `minItems`/`maxItems`. Fails if the output is not valid JSON.

```typescript
.output().toMatchSchema({
  type: 'object',
  required: ['status', 'order_id', 'message'],
  properties: {
    status: { type: 'string', enum: ['refunded', 'pending', 'denied'] },
    order_id: { type: 'string', minLength: 5 },
    message: { type: 'string' },
    refund_amount: { type: 'number', minimum: 0 },
  },
})
```

#### `.output().toMatchSnapshot(snapshot: string)`

**Signature:** `toMatchSnapshot(snapshot: string): AssertionBuilder`

Passes if the output exactly matches a previously stored snapshot string (shallow comparison).

```typescript
.output().toMatchSnapshot(previousRunOutput)
```

---

### Token Matchers (4 matchers)

Assert on token consumption to enforce budgets and detect regressions.

#### `.tokens().toBeLessThan(threshold: number)`

**Signature:** `toBeLessThan(threshold: number): AssertionBuilder`

Passes if `totalTokens < threshold`.

```typescript
.tokens().toBeLessThan(4096)
.tokens().toBeLessThan(2048)   // Tight budget for simple queries
```

#### `.tokens().toBeGreaterThan(threshold: number)`

**Signature:** `toBeGreaterThan(threshold: number): AssertionBuilder`

Passes if `totalTokens > threshold`. Useful for ensuring the agent is actually doing work.

```typescript
.tokens().toBeGreaterThan(50)  // Ensure agent didn't bail out immediately
```

#### `.tokens().toBeBetween(min: number, max: number)`

**Signature:** `toBeBetween(min: number, max: number): AssertionBuilder`

Passes if `min <= totalTokens <= max`.

```typescript
.tokens().toBeBetween(200, 2000)  // Expected range for a standard query
```

#### `.tokens().prompt().toBeLessThan(threshold: number)`

**Signature:** `prompt().toBeLessThan(threshold: number): AssertionBuilder`

Passes if `promptTokens < threshold`. Checks prompt token usage specifically (not completion tokens).

```typescript
.tokens().prompt().toBeLessThan(1024)  // Keep system prompt + context under limit
```

---

### Latency Matchers (3 matchers)

Assert on response time to enforce SLAs.

#### `.latency().toBeLessThan(threshold: number)`

**Signature:** `toBeLessThan(threshold: number): AssertionBuilder`

Passes if end-to-end latency in milliseconds is below `threshold`.

```typescript
.latency().toBeLessThan(5000)   // 5s max for customer-facing agents
.latency().toBeLessThan(15000)  // 15s for complex multi-step agents
```

#### `.latency().toBeGreaterThan(threshold: number)`

**Signature:** `toBeGreaterThan(threshold: number): AssertionBuilder`

Passes if latency exceeds `threshold`. Useful as a sanity check.

```typescript
.latency().toBeGreaterThan(100)  // Ensure agent actually did work
```

#### `.latency().firstToken().toBeLessThan(threshold: number)`

**Signature:** `firstToken().toBeLessThan(threshold: number): AssertionBuilder`

Passes if time-to-first-token is below `threshold`. Returns `status: 'error'` if first-token latency data is unavailable.

```typescript
.latency().firstToken().toBeLessThan(1000)   // 1s TTFT for streaming UX
.latency().firstToken().toBeLessThan(500)    // 500ms for real-time chat
```

---

### Score Matchers (3 matchers)

Assert on evaluation scores from LLM judges to ensure quality standards.

#### `.score(dimension?).toBeGreaterThan(threshold: number)`

**Signature:** `toBeGreaterThan(threshold: number): AssertionBuilder`

Passes if the average score for the given dimension (or all scores if no dimension) is above `threshold`. If no matching scores exist, the assertion is `skipped`.

```typescript
.score('correctness').toBeGreaterThan(7)
.score('safety').toBeGreaterThan(8)
.score('completeness').toBeGreaterThan(6)
.score().toBeGreaterThan(7)        // Average of ALL scores
```

#### `.score(dimension?).toBeLessThan(threshold: number)`

**Signature:** `toBeLessThan(threshold: number): AssertionBuilder`

Passes if the average score is below `threshold`.

```typescript
.score('conciseness').toBeLessThan(3)   // Ensure agent is not too verbose
```

#### `.score(dimension?).toBeBetween(min: number, max: number)`

**Signature:** `toBeBetween(min: number, max: number): AssertionBuilder`

Passes if the average score is within `[min, max]`.

```typescript
.score('correctness').toBeBetween(6, 9)  // Expected range for baseline
```

---

### Compound Matchers (2 matchers)

Combine multiple assertions with logical operators.

#### `.all(builders: ((builder: AssertionBuilder) => void)[])`

**Signature:** `all(builders: Array<(builder: AssertionBuilder) => void>): AssertionBuilder`

All sub-assertions must pass. Equivalent to logical AND. Each function receives a fresh `AssertionBuilder`.

```typescript
.all([
  (b) => {
    b.output().toContain('refund')
    b.tool('process_refund').toBeCalled()
  },
  (b) => {
    b.status().toBeCompleted()
    b.score('correctness').toBeGreaterThan(7)
  },
])
```

#### `.any(builders: ((builder: AssertionBuilder) => void)[])`

**Signature:** `any(builders: Array<(builder: AssertionBuilder) => void>): AssertionBuilder`

At least one sub-assertion must pass. Equivalent to logical OR.

```typescript
.any([
  (b) => b.output().toContain('full refund'),
  (b) => b.output().toContain('partial refund'),
  (b) => b.output().toContain('store credit'),
])
```

---

## `run()` -- Executing Assertions

```typescript
run(context?: AssertionContext | RunResult): AssertionRunResult
```

Executes all queued assertions and returns results. The `context` parameter is optional if you passed one to `expect()`, but required otherwise.

### Return Type: `AssertionRunResult`

```typescript
interface AssertionRunResult {
  assertions: AssertionResult[]   // Individual assertion results
  passed: number                  // Count of passed assertions
  failed: number                  // Count of failed assertions
  errored: number                 // Count of assertions that threw errors
  skipped: number                 // Count of skipped assertions
  allPassed: boolean              // True if failed === 0 && errored === 0
  duration: number                // Time since builder creation (ms)
}

interface AssertionResult {
  type: string                    // e.g., 'tool_called', 'contains', 'latency_lt'
  status: 'passed' | 'failed' | 'error' | 'skipped'
  expected?: unknown
  actual?: unknown
  message?: string
  duration?: number
}
```

### Usage Patterns

**Pattern 1: Exit on failure**
```typescript
const results = await expect(runResult)
  .tool('search').toBeCalled()
  .output().toContain('success')
  .run()

if (!results.allPassed) {
  process.exit(1)
}
```

**Pattern 2: Detailed error reporting**
```typescript
const results = await expect(runResult)
  .tool('search_kb').toBeCalledWith({ query: 'return policy' })
  .status().toBeCompleted()
  .output().toContain('30 days')
  .tokens().toBeLessThan(4096)
  .score('correctness').toBeGreaterThan(7)
  .run()

console.log(`${results.passed}/${results.assertions.length} passed`)

for (const a of results.assertions) {
  if (a.status === 'failed') {
    console.error(`FAIL [${a.type}]: ${a.message}`)
    console.error(`  Expected: ${JSON.stringify(a.expected)}`)
    console.error(`  Actual:   ${JSON.stringify(a.actual)}`)
  }
}
```

**Pattern 3: Fluent test function**
```typescript
async function assertCustomerSupportQuality(runResult: RunResult) {
  return expect(runResult)
    .status().toBeCompleted()
    .tool('verify_identity').toBeCalled()
    .tool('search_kb').toBeCalled()
    .tool('delete_record').not.toBeCalled()
    .output().toContain('return policy')
    .output().not.toContain('I don\'t know')
    .tokens().toBeBetween(100, 3000)
    .latency().toBeLessThan(10000)
    .latency().firstToken().toBeLessThan(2000)
    .score('correctness').toBeGreaterThan(7)
    .score('safety').toBeGreaterThan(8)
    .run()
}
```

---

## Assertion Types Reference

Each assertion result has a `type` field for programmatic filtering:

| `type` Value | Matcher |
|---|---|
| `'completed_successfully'` | `.status().toBeCompleted()` / `.status().toBe()` |
| `'tool_called'` | `.tool(name).toBeCalled()` |
| `'tool_not_called'` | `.tool(name).not.toBeCalled()` |
| `'tool_called_with'` | `.tool(name).toBeCalledWith(args)` |
| `'tool_called_times'` | `.tool(name).toBeCalledTimes(count)` |
| `'contains'` | `.output().toContain(substring)` |
| `'not_contains'` | `.output().not.toContain(substring)` |
| `'exact_match'` | `.output().toEqual(expected)` |
| `'matches_regex'` | `.output().toMatchRegex(pattern)` |
| `'matches_schema'` | `.output().toMatchSchema(schema)` |
| `'matches_snapshot'` | `.output().toMatchSnapshot(snapshot)` |
| `'tokens_lt'` | `.tokens().toBeLessThan(n)` / `.tokens().prompt().toBeLessThan(n)` |
| `'tokens_gt'` | `.tokens().toBeGreaterThan(n)` |
| `'tokens_between'` | `.tokens().toBeBetween(min, max)` |
| `'latency_lt'` | `.latency().toBeLessThan(ms)` |
| `'latency_gt'` | `.latency().toBeGreaterThan(ms)` |
| `'first_token_lt'` | `.latency().firstToken().toBeLessThan(ms)` |
| `'score_gt'` | `.score(dim).toBeGreaterThan(n)` |
| `'score_lt'` | `.score(dim).toBeLessThan(n)` |
| `'score_between'` | `.score(dim).toBeBetween(min, max)` |
| `'all'` | `.all([...])` |
| `'any'` | `.any([...])` |

---

## Common Pitfalls

### Forgetting `.run()`

Assertions are lazy -- nothing executes until you call `.run()`. If you forget it, no assertions are evaluated.

```typescript
// WRONG: assertions are queued but never executed
expect(runResult)
  .tool('search').toBeCalled()
  .output().toContain('result')

// CORRECT
const results = await expect(runResult)
  .tool('search').toBeCalled()
  .output().toContain('result')
  .run()
```

### Passing RunResult to `.run()` when already passed to `expect()`

If you pass a `RunResult` to `expect()`, you don't need to pass it again to `.run()`. The context is already resolved.

```typescript
// Both work, but the first is cleaner
const results = expect(runResult).tool('search').toBeCalled().run()
const results = expect().tool('search').toBeCalled().run(runResult)
```

### `toBeCalledWith` only checks specified keys

`toBeCalledWith` only validates the keys you provide. Extra arguments in the tool call are ignored. If you need exact argument matching, assert each key individually or use `toEqual` on the arguments.

```typescript
// Passes even if the tool was called with extra args like { query: "test", limit: 10 }
.tool('search').toBeCalledWith({ query: 'test' })
```

### `toMatchSchema` requires valid JSON output

If the agent output is not valid JSON, `toMatchSchema` will fail with the message "Output is not valid JSON". For agents that produce natural language alongside JSON, you may need to extract the JSON portion first or relax the matcher.

### Score assertions skip when no scores exist

If no evaluation has been run on the `RunResult`, all score assertions will have `status: 'skipped'` (not `failed`). Ensure you have run evaluation before asserting scores:

```typescript
const evaluated = await evaluateRun(runResult)  // Run LLM judge first
const results = await expect(evaluated)
  .score('correctness').toBeGreaterThan(7)
  .run()
```

---

## Next Steps

- [Configuration Reference](./config.md) -- Set default assertion thresholds in `agentbench.config.ts`
- [CLI Reference](./cli.md) -- Use `agentbench evaluate` for CLI-based assertions
- [REST API Reference](./api.md) -- Evaluate runs via the API
- [Catching Prompt Regressions](../cookbook/catching-prompt-regressions.md) -- Use assertions to detect quality drops
- [Safety Testing for AI Agents](../cookbook/safety-testing.md) -- Assert on forbidden tools and safety scores
