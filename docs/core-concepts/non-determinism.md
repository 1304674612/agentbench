---
title: "Dealing with LLM Non-Determinism"
description: "Why testing AI agents is fundamentally harder than testing traditional software, and how AgentBench tackles LLM non-determinism."
targetAudience: "Engineers new to AI agent testing who are frustrated by flaky tests and inconsistent results"
readingTime: "8 min"
prerequisites:
  - "Understanding of Runs, Traces, and Assertions"
  - "Basic understanding of how LLMs generate text (temperature, sampling, token prediction)"
---

# Dealing with LLM Non-Determinism

## Overview

Testing traditional software is straightforward: given input X, the system should produce output Y, every time. Testing AI agents violates this assumption at the most fundamental level. Large Language Models are probabilistic systems -- the same prompt can produce different responses across runs due to temperature, sampling strategies, floating-point non-determinism in GPU operations, and even the same model producing different outputs after a provider updates their serving infrastructure. AgentBench's entire architecture -- replay, assertions, evaluation, snapshots, coverage -- is designed around this central challenge. Understanding how each piece addresses non-determinism is essential to writing effective agent tests.

## Why LLMs Are Non-Deterministic

### Temperature and Sampling

The most well-known source of non-determinism is the `temperature` parameter. At temperature 0, the model always selects the most probable next token (greedy decoding). At temperature > 0, the model samples from the probability distribution, introducing randomness:

```
Prompt: "The capital of France is"
Temperature 0: " Paris." (always)
Temperature 0.7: " Paris." or " Paris, a city known for..." or " the city of Paris."
Temperature 1.5: " undoubtedly the magnificent City of Light, Paris!" or " Paris, home to the Eiffel Tower..."
```

But even `temperature: 0` does not guarantee deterministic output:

### Floating-Point Non-Determinism

GPU operations on floating-point numbers are not always bit-exact across runs. The same model, same prompt, same temperature of 0, on the same hardware, can produce different results due to:

- Non-associative floating-point addition in parallel reductions
- Different CUDA kernel scheduling across runs
- Different hardware (A100 vs H100) producing slightly different floating-point results

### Provider-Side Changes

LLM providers continuously update their models and serving infrastructure:

- **Model updates**: `gpt-4o` today may produce different outputs than `gpt-4o` last month, even if the model name has not changed
- **System prompt injection**: Some providers prepend hidden system instructions that can change without notice
- **Serving optimizations**: Quantization changes, batch scheduling, and speculative decoding can alter output distributions
- **A/B testing**: Providers sometimes route traffic to different model versions without transparency

### Tool Call Non-Determinism

Even when the model produces the same text output, its tool calling behavior can vary:
- The same query might trigger `search_docs` on one run and `lookup_kb` on another
- Tool arguments can vary ("refund policy" vs "return policy" vs "refunds")
- The number of tool calls can differ (single call vs parallel calls)

## AgentBench's Strategy for Handling Non-Determinism

AgentBench does not try to eliminate non-determinism -- that is impossible without controlling the model serving infrastructure. Instead, it provides a layered strategy where each layer handles non-determinism at a different level of abstraction:

```
Layer 1: Replay          → Eliminate non-determinism entirely (record once, replay deterministically)
Layer 2: Tool Assertions → Assert on deterministic facts (tool calls are objective trace data)
Layer 3: Rule Assertions → Fuzzy matching for output (contains, regex, schema — not exact string match)
Layer 4: Score Assertions → Use LLM judges for semantic quality (tolerance bands, not binary pass/fail)
Layer 5: Batch Replay    → Measure variance statistically (run N times, use means and stddev)
```

### Layer 1: Deterministic Replay — Eliminate Non-Determinism

The strongest tool in AgentBench's arsenal. Record an agent run once, capturing every LLM response and tool call in an `ExecutionTrace`. Then replay it deterministically -- the trace provides the exact same responses, no LLM calls are made, and the result is 100% deterministic.

**When to use**: Regression testing in CI. Every PR, every commit. Zero cost, perfectly deterministic.

**Limitation**: Only tests that the agent's code (tools, orchestration logic) hasn't broken. Does not test that the LLM still produces good outputs today -- it tests against a frozen snapshot of what the LLM produced at recording time.

```
Record:     Agent + GPT-4o + Prompt → "You can refund within 30 days"
Replay:     Agent + (no LLM call) + Trace → "You can refund within 30 days"
             ↑ Exact same output, every time, forever, zero cost
```

### Layer 2: Tool-Based Assertions — Deterministic Facts

Even in a live (non-replayed) run, tool calls are deterministic facts about the execution trace. Whether the LLM said "refund" or "return", the trace records that it called `search_docs` with arguments `{ query: "refund policy" }`. These facts are objective and can be asserted against deterministically.

```typescript
// These assertions will never be flaky because they check
// objective trace data, not LLM-generated text:
await expect(runResult)
  .tool('search_docs').toBeCalled()
  .tool('search_docs').toBeCalledWith({ query: 'refund policy' })
  .tool('escalate_to_human').not.toBeCalled()
  .tokens().toBeLessThan(4096)
  .latency().toBeLessThan(10000)
  .run()
```

**When to use**: As the primary assertion layer for all test cases. Tool assertions are fast, free, and never flaky.

**Limitation**: Only checks WHAT the agent did, not whether WHAT it did was correct. A tool call with the wrong arguments is still a tool call.

### Layer 3: Fuzzy Output Assertions — Tolerate Variance

When you must assert on LLM-generated text, use fuzzy matchers that tolerate natural variation:

```typescript
// BAD: flaky — LLM might say "return" instead of "refund"
expect(runResult).output().toEqual('You can refund within 30 days')

// GOOD: tolerant of rephrasing
expect(runResult).output().toContain('30')
expect(runResult).output().toMatchRegex(/(refund|return).*(30|thirty)\s*days/i)
```

**When to use**: When specific facts must appear in the output, regardless of phrasing.

**Limitation**: A response containing "30" and "refund" could still be wrong. Fuzzy matching catches presence of facts, not correctness of the full answer.

### Layer 4: Score-Based Assertions — Judge Quality, Not Text

For semantic quality (Is the answer correct? Is it faithful to the source? Is it safe?), use LLM judge scores with tolerance bands:

```typescript
// BAD: expects exact text match from a non-deterministic system
expect(runResult).output().toEqual(expectedAnswer)

// GOOD: asserts on quality, not exact text
await expect(runResult)
  .score('correctness').toBeGreaterThan(7)     // Answer is at least 70% correct
  .score('faithfulness').toBeGreaterThan(8)    // Answer is grounded in the source
  .score('safety').toBeGreaterThan(9)          // Answer is safe
  .run()
```

**When to use**: When you care about the semantic quality of the response, not its exact wording. Use tolerance bands (>= 7, not == 10) to account for judge variance.

**Limitation**: LLM judges are themselves non-deterministic. Running the judge twice may give scores of 7 and 8.5 for the same output. Mitigate this with:
- Set judge `temperature: 0`
- Use score bands, not exact thresholds
- Use judge pools with voting for critical evaluations

### Layer 5: Batch Replay — Measure Variance, Don't Ignore It

When you need to understand how much an agent varies, run it multiple times and use statistics:

```typescript
import { buildBatchReplay, aggregateReplayResults } from '@agentbench/core'

const batchConfig = buildBatchReplay(config, 50, { parallel: true })
const results = await agentbench.replay(batchConfig)

console.log(results.aggregate.metrics.totalLatency)
// { mean: 3200, stddev: 450, min: 2100, max: 5100 }

// "P95 latency is 4100ms" is more useful than "latency is 3200ms"
```

**When to use**: When establishing performance baselines, comparing A/B variants, or measuring reliability.

**Limitation**: Running 50+ times costs 50x the LLM calls. Use sparingly for baselining, not routinely.

## Best Practices

### 1. Test Behavior, Not Output

The single most important principle for testing AI agents:

```
Test THAT the agent called the right tools    ← Deterministic, reliable
Test THAT the agent's response contains facts  ← Fuzzy but reliable
Test THAT the agent's answer is correct        ← LLM judge, tolerance band
Do NOT test THAT the agent said exact words    ← Flaky, unreliable
```

### 2. Use Score Thresholds, Not Exact Matches

```typescript
// GOOD: tolerance band
.score('correctness').toBeGreaterThan(7)

// BAD: exact score
.score('correctness').toEqual(10)  // Will fail when judge gives 9.5

// GOOD: range
.score('correctness').toBeBetween(7, 10)

// BAD: boolean
// There is no such thing as "exactly correct" for open-ended responses
```

### 3. Combine Multiple Judge Dimensions

A single dimension gives a narrow view. A response can be correct but unsafe, safe but irrelevant, relevant but incomplete:

```typescript
// Minimum viable quality check
await expect(runResult)
  .score('correctness').toBeGreaterThan(7)
  .score('safety').toBeGreaterThan(9)
  .score('faithfulness').toBeGreaterThan(8)
  .run()
```

### 4. Use Replay for Regression Testing

Replay is the only way to get truly deterministic agent tests. Every CI pipeline should include a replay-based regression suite:

```yaml
# In CI — zero cost, deterministic
- name: Regression tests (replay)
  run: agentbench test --mode replay --snapshot baseline-v1.2.0

# Nightly — full evaluation with LLM judges
- name: Quality audit (live + judges)
  run: agentbench test --project customer-support --evaluate --dimensions correctness,faithfulness,safety
```

### 5. Accept and Measure Variance

Non-determinism is not a bug -- it is a property of the system you are testing. Embrace it:

```typescript
// Instead of: "The agent must respond in under 3 seconds"
// Use: "P95 latency must be under 5 seconds, and P50 under 3 seconds"

// Instead of: "The agent must call search_docs exactly once"
// Use: "The agent must call search_docs at least once, and no unnecessary tools"

// Instead of: "The answer must exactly match the expected answer"
// Use: "The answer must achieve correctness >= 7 and faithfulness >= 8"
```

## Anti-Patterns

### Don't: Assert Exact Output Strings

```typescript
// ANTI-PATTERN: Will break every few runs
expect(runResult).output().toEqual(
  'Based on our refund policy, you can return items within 30 days of purchase for a full refund. Would you like me to start the return process?'
)

// WHY IT FAILS: The LLM might say "return" instead of "refund",
// add "certain items", change "Would you like me to" to "Shall I",
// or any of a thousand rephrasings that mean the same thing.
```

### Don't: Rely on a Single Judge Dimension for Pass/Fail

```typescript
// ANTI-PATTERN: Too narrow
if (correctnessScore < 8) throw new Error('Test failed')

// WHY IT FAILS: A response can be correct (score 9) but unsafe (score 2).
// A single dimension cannot capture overall quality.
```

### Don't: Ignore Non-Determinism in CI

```typescript
// ANTI-PATTERN: Live LLM calls in CI on every commit
agentbench test --project my-agent  // Makes 50 live LLM calls

// WHY IT FAILS: Every CI run costs money, takes 2-5 minutes,
// and some percentage of runs will fail due to LLM variance alone
// (false positives that erode trust in the test suite).

// FIX: Use replay for CI regression tests (free, fast, deterministic).
// Reserve live LLM testing for nightly quality audits.
```

### Don't: Set Temperature to 0 and Assume Determinism

```typescript
// ANTI-PATTERN: False sense of security
const config = {
  agent: {
    temperature: 0,  // "This makes it deterministic, right?"
    // ...
  },
}
```

Temperature 0 reduces variance but does not eliminate it. Floating-point non-determinism, provider-side changes, and model updates can still cause different outputs. Use replay for true determinism.

### Don't: Over-Assert

```typescript
// ANTI-PATTERN: 20 assertions on a single run
await expect(runResult)
  .tool('a').toBeCalled()
  .tool('a').toBeCalledWith({ ... })
  .tool('b').not.toBeCalled()
  .output().toContain('...')
  .output().not.toContain('...')
  .output().toMatchRegex(/.../)
  .output().toMatchRegex(/.../)
  .tokens().toBeLessThan(N)
  .tokens().toBeGreaterThan(N)
  .latency().toBeLessThan(N)
  .score('a').toBeGreaterThan(N)
  .score('b').toBeGreaterThan(N)
  .score('c').toBeGreaterThan(N)
  // ... 8 more
  .run()

// WHY IT FAILS: With 20 flaky-prone assertions (even at 95% reliability each),
// the probability of all passing is 0.95^20 = 36%. You have built a test
// that fails 64% of the time due to assertion over-specification, not agent bugs.

// FIX: 5-8 well-chosen assertions covering tool behavior, one fuzzy output check,
// and 2-3 score dimensions. Quality over quantity.
```

## Practical Workflow: From Flaky to Reliable

Here is a pattern for converting a flaky agent test into a reliable one:

```typescript
// === FLAKY VERSION ===
test('agent handles refund requests', async () => {
  const result = await agentbench.run({
    agent: { model: 'gpt-4o', systemPrompt: 'You are customer support.', temperature: 0.7 },
    input: { messages: [{ role: 'user', content: 'How do I get a refund?' }] },
  })

  // FLAKY: LLM rephrases break this every few runs
  expect(result.trace.steps[result.trace.steps.length - 1].llmResponse.content)
    .toBe('You can get a refund within 30 days by visiting our returns portal.')
})
```

```typescript
// === RELIABLE VERSION ===
test('agent handles refund requests', async () => {
  // Step 1: Record a baseline once
  // (Done manually or in a setup script, not in this test)

  // Step 2: Replay deterministically in CI
  const result = await agentbench.replay({
    mode: 'deterministic',
    snapshotId: 'refund-baseline',
  })

  // Step 3: Assert on deterministic facts
  const assertionResult = await expect(result)
    .status().toBeCompleted()
    .tool('search_knowledge_base').toBeCalled()          // Right tool?
    .tool('lookup_refund_policy').toBeCalledWith({        // Right arguments?
      product_category: 'general',
    })
    .output().toContain('30')                             // Key fact present?
    .output().toMatchRegex(/refund|return/i)              // Relevant topic?
    .tokens().toBeLessThan(2048)                          // In budget?
    .latency().toBeLessThan(10000)                        // In SLA?
    .run()

  expect(assertionResult.allPassed).toBe(true)

  // Step 4: (Nightly only) Check quality with LLM judge
  // const scores = await agentbench.evaluate(result.id, {
  //   judge: { provider: 'openai', model: 'gpt-4o-mini', dimensions: ['correctness', 'faithfulness'] },
  //   expected: 'Customers can get a refund within 30 days.',
  // })
  // expect(scores.find(s => s.dimension === 'correctness').score).toBeGreaterThan(7)
})
```

## Summary: The Layered Defense

| Layer | Mechanism | Determinism | Cost | Use In |
|---|---|---|---|---|
| Replay | Recorded trace playback | 100% | Zero | Every CI run |
| Tool Assertions | Check trace data | 100% | Zero | Every test |
| Fuzzy Output | contains, regex, schema | Tolerant of variance | Zero | Every test |
| LLM Judge Scores | Semantic quality with bands | Some variance | Per-judge call | Nightly / periodic |
| Batch Replay | Statistical measurement | Measures variance | N x LLM cost | Baselining |

The secret to reliable AI agent testing is not eliminating non-determinism -- it is using the right layer for the right question at the right time, and accepting that some questions can only be answered probabilistically.

## Next Steps

- **[How Deterministic Replay Works](./replay.md)** -- implement Layer 1 of your defense
- **[The Assertion Model](./assertions.md)** -- master the DSL for all testing layers
- **[Evaluation: Rules, Judges, and Hybrids](./evaluation.md)** -- understand how scores are produced
- **[4D Coverage Analysis](./coverage.md)** -- ensure your test suite covers the dimensions that matter
