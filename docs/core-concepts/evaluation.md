---
title: "Evaluation: Rules, Judges, and Hybrids"
description: "Deep dive into AgentBench's three evaluation approaches — rule evaluators, LLM-as-Judge, and hybrid judges with voting strategies."
targetAudience: "Engineers designing evaluation strategies for AI agent quality and correctness"
readingTime: "10 min"
prerequisites:
  - "Understanding of Runs, Traces, and Assertions"
  - "Familiarity with LLM providers (OpenAI, Anthropic)"
---

# Evaluation: Rules, Judges, and Hybrids

## Overview

AgentBench provides three distinct evaluation strategies that can be used individually or combined. **Rule Evaluators** are fast, deterministic, and free -- they check objective facts about the trace (tool calls, token counts, latency, output patterns). **LLM-as-Judge** uses a separate LLM to score subjective qualities (correctness, faithfulness, safety) on a 0-10 scale. **Hybrid Judges** blend both approaches with configurable strategies (`rule_first`, `llm_first`, `parallel`) and voting mechanisms to reduce the weaknesses of each individual approach.

The evaluation engine lives in `@agentbench/core` at `packages/core/src/evaluator/`:
- `rule-evaluator.ts` -- 14 deterministic evaluators
- `llm-judge.ts` -- LLM judge runner
- `judge-prompts.ts` -- 8 dimension-specific prompt templates with scoring rubrics
- `hybrid-judge.ts` -- combination strategies and judge pool with voting

## 1. Rule Evaluators

Rule evaluators are deterministic functions that inspect the agent's execution trace and return a binary pass/fail with a score of 0 or 1. They are instant, cost nothing, and never produce a different result for the same input.

### The 14 Rule Evaluators

| Evaluator | Config `type` | What It Checks | Key Parameters |
|---|---|---|---|
| Exact Match | `exact_match` | Output equals expected string exactly | `expected`, `normalize`, `caseSensitive` |
| Contains | `contains` | Output contains a substring | `substring`, `caseSensitive`, `minOccurrences` |
| Regex Match | `regex_match` | Output matches a regex pattern | `pattern`, `flags` |
| JSON Schema | `json_schema` | Output is valid JSON matching a schema | `schema` |
| Tool Called | `tool_called` | A specific tool was called at least once | `tool` (name) |
| Tool Not Called | `tool_not_called` | A specific tool was never called | `tool` (name) |
| Tool Called With | `tool_called_with` | A tool was called with specific arguments | `tool`, `arguments` |
| Tool Called Times | `tool_called_times` | A tool was called exactly (or comparison) N times | `tool`, `times`, `operator` |
| Status Code | `status_code` | Run status matches expected code | `code` |
| Latency LT | `latency_lt` | Total duration is under threshold (ms) | `threshold` |
| Tokens LT | `tokens_lt` | Total token usage is under threshold | `threshold` |
| Tokens GT | `tokens_gt` | Total token usage is above threshold | `threshold` |
| Cost LT | `cost_lt` | Total cost is under threshold (USD) | `threshold` |
| Cost GT | `cost_gt` | Total cost is above threshold (USD) | `threshold` |

### How Rule Evaluators Work Internally

Each evaluator receives a `RuleEvalContext` -- a structured snapshot of the run:

```typescript
interface RuleEvalContext {
  output: string                              // Final agent output text
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
    error?: string
  }>
  metrics?: {
    totalTokens?: number
    totalCost?: number
    totalLatency?: number
    stepCount?: number
    llmCallCount?: number
  }
  statusCode?: number
  status?: string
}
```

And returns a `RuleEvalResult`:

```typescript
interface RuleEvalResult {
  passed: boolean
  score: number      // 1 if passed, 0 if not
  maxScore: number   // Always 1 for rule evaluators
  reason: string     // Human-readable explanation
  details?: Record<string, unknown>  // Additional diagnostic data
}
```

When multiple rules are evaluated together, `evaluateRules()` aggregates them:

```typescript
import { evaluateRules } from '@agentbench/core'

const configs = [
  { type: 'contains', params: { substring: 'refund' }, weight: 1 },
  { type: 'tokens_lt', params: { threshold: 4096 }, weight: 1 },
  { type: 'latency_lt', params: { threshold: 10000 }, weight: 1 },
]

const { results, totalScore, maxScore, allPassed } = evaluateRules(configs, context)

// results: [
//   { passed: true,  score: 1, maxScore: 1, reason: 'Output contains "refund" (2x)' },
//   { passed: true,  score: 1, maxScore: 1, reason: 'Tokens 1200 < 4096' },
//   { passed: false, score: 0, maxScore: 1, reason: 'Latency 12300ms exceeds threshold 10000ms' },
// ]
// totalScore: 2, maxScore: 3, allPassed: false
```

### When to Use Rule Evaluators

Rule evaluators are ideal for:

- **Operational checks**: Is latency acceptable? Are tokens within budget? Did the run complete?
- **Tool contract verification**: Did the agent call the correct tools with the correct arguments?
- **Output format validation**: Is the output valid JSON? Does it match a schema? Does it contain required fields?
- **Safety gate checks**: Did the agent call any forbidden tools?

Rule evaluators are NOT suitable for:

- **Semantic quality**: Is the answer factually accurate? Is the reasoning sound? Use LLM judges.
- **Tone and style**: Is the response appropriate for the audience? Use LLM judges.
- **Open-ended correctness**: Did the agent solve the problem correctly when many solutions are valid? Use LLM judges.

### Configuration in agentbench.config.ts

```typescript
// agentbench.config.ts
import { defineConfig } from '@agentbench/config'

export default defineConfig({
  projects: {
    'customer-support': {
      evaluators: {
        rules: [
          // Every run must complete
          { type: 'tool_not_called', params: { tool: 'delete_customer' }, weight: 2 },
          // Budget enforcement
          { type: 'tokens_lt', params: { threshold: 4096 }, weight: 1 },
          { type: 'cost_lt', params: { threshold: 0.05 }, weight: 1 },
          // SLA
          { type: 'latency_lt', params: { threshold: 15000 }, weight: 1 },
        ],
      },
    },
  },
})
```

## 2. LLM-as-Judge

LLM-as-Judge uses a separate LLM (the "judge model") to evaluate the agent's output against quality criteria. The judge model receives a structured scoring prompt and returns a score from 0 to 10 with reasoning.

### The 8 Quality Dimensions

Each dimension has a dedicated system prompt and user prompt template with a detailed scoring rubric. These are defined in `judge-prompts.ts`.

#### Correctness

Measures factual accuracy -- does the answer match the expected reference?

**Scoring rubric (abbreviated)**:
- **10**: Completely correct, all facts accurate, matches expected answer perfectly
- **8-9**: Mostly correct, minor imprecisions
- **6-7**: Partially correct, some errors or missing information
- **4-5**: Significant errors present
- **0-1**: Completely wrong

```typescript
const scores = await agentbench.evaluate(runId, {
  judge: {
    provider: 'openai',
    model: 'gpt-4o-mini',        // Use a cheaper model for judging
    dimensions: ['correctness'],
  },
  expected: 'Customers can return items within 30 days of purchase for a full refund.',
})
```

#### Faithfulness

Measures grounding -- does the output stick to the provided context without hallucinating?

**Best for**: RAG agents, summarization, any agent that works with retrieved documents.

```typescript
dimensions: ['faithfulness']
// Judge prompt emphasizes: every claim must be grounded in the input/context
```

#### Safety

Measures harm avoidance -- does the output avoid dangerous, unethical, or harmful content?

**Best for**: Customer-facing agents, healthcare, finance, any agent in a regulated domain.

```typescript
dimensions: ['safety']
// Scores refusal to assist with harmful requests as high (10)
// Scores dangerous advice as low (0-1)
```

#### Relevance

Measures focus -- does the output address the user's query directly without wandering off-topic?

```typescript
dimensions: ['relevance']
```

#### Completeness

Measures coverage -- does the output address ALL aspects of the query?

**Best for**: Information retrieval, multi-part questions, instruction-following.

```typescript
dimensions: ['completeness']
// Requires `expected` to define what full coverage looks like
```

#### Reasoning

Measures logical quality -- is the chain of thought clear, coherent, and valid?

**Best for**: Agents that solve problems step-by-step (math, debugging, planning).

```typescript
dimensions: ['reasoning']
```

#### Conciseness

Measures brevity -- is the output appropriately concise without being incomplete?

```typescript
dimensions: ['conciseness']
// Note: conciseness should not come at the expense of completeness
```

#### Tool Usage

Measures tool selection and usage quality.

**Best for**: Agents that choose from a set of tools.

```typescript
dimensions: ['tool_usage']
// Judge receives: input, output, available tools list, and actual tool calls made
```

### Judge Prompt Anatomy

Every dimension prompt follows the same structure. Here is the correctness prompt:

```
System: You are an expert evaluator assessing the CORRECTNESS of an AI agent's output.
[Detailed scoring rubric for 0-10 scale]

User:
## Input/Context
{input}

## Agent Output (to evaluate)
{output}

## Expected Answer (reference)
{expected}

Please evaluate the correctness of the agent's output against the expected answer.

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<brief explanation>"
}
```

The judge's response is parsed as JSON and validated against a schema requiring `score` (number 0-10) and `reasoning` (string).

### Multi-Dimension Evaluation

You can evaluate against multiple dimensions in a single call:

```typescript
const scores: JudgeScore[] = await agentbench.evaluate(runId, {
  judge: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    dimensions: ['correctness', 'faithfulness', 'safety', 'completeness'],
  },
  expected: 'Customers can return items within 30 days for a full refund.',
})

// scores: [
//   { dimension: 'correctness',  score: 8.0, maxScore: 10, reasoning: '...', confidence: 0.9 },
//   { dimension: 'faithfulness', score: 9.5, maxScore: 10, reasoning: '...', confidence: 0.95 },
//   { dimension: 'safety',       score: 10,  maxScore: 10, reasoning: '...', confidence: 1.0 },
//   { dimension: 'completeness', score: 7.0, maxScore: 10, reasoning: '...', confidence: 0.8 },
// ]
```

Each dimension makes a separate LLM call. For cost efficiency, use `gpt-4o-mini` as the judge model.

### Cost Considerations

| Judge Model | Cost per 1K tokens (approx) | Cost per evaluation (approx) |
|---|---|---|
| GPT-4o-mini | $0.00015 / $0.00060 | $0.001 - $0.003 |
| GPT-4o | $0.00250 / $0.01000 | $0.01 - $0.05 |
| Claude Haiku | $0.00025 / $0.00125 | $0.001 - $0.005 |

With 4 dimensions at ~500 tokens each, GPT-4o-mini costs roughly $0.008 per evaluation. For a test suite of 100 cases run nightly, that is $0.80/day.

### When to Use LLM Judges

- **When correctness is nuanced**: The answer can be right in many ways; rule evaluators cannot enumerate them all
- **When you need semantic understanding**: "Is the tone professional?" is a judgment call
- **When expected output is a description, not a value**: Rule evaluators work for structured outputs; judges work for prose
- **For safety auditing**: Rules cannot catch novel harmful outputs

### When NOT to Use LLM Judges

- **For operational metrics**: Use rule evaluators for latency, tokens, cost
- **For tool call verification**: Use rule evaluators -- they are free and perfectly accurate
- **When you have an exact expected answer**: Exact match is cheaper and more reliable
- **When you are budget-constrained in CI**: Use rule evaluators in CI, judges in periodic quality audits

## 3. Hybrid Judge

The hybrid judge combines rule evaluators and LLM judges with configurable strategies. It is implemented in `hybrid-judge.ts`.

### Three Combination Strategies

#### `rule_first` (Default)

Rules run first. If all rules pass, the LLM judge is **skipped entirely** -- saving cost. If any rule fails, the LLM judge runs and the final score is blended: 40% rules, 60% LLM.

```typescript
const result = await runHybridJudge({
  strategy: 'rule_first',
  rules: [
    { type: 'contains', params: { substring: 'refund' } },
    { type: 'tokens_lt', params: { threshold: 4096 } },
  ],
  llmJudge: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    dimensions: ['correctness'],
  },
}, context, callLLM)

// If rules pass → result.passed = true, result.reasoning = "All 2 rule(s) passed. LLM judge skipped."
// If rules fail → blended score = 0.4 * ruleScore + 0.6 * llmScore
```

**Best for**: Most common case. Fast and cheap when the agent does the right thing. Falls back to LLM judgment only when needed.

#### `llm_first`

LLM judge runs first. If the judge is confident (score >= 7 or <= 3), rules are skipped. If the judge is uncertain (score 4-6), rules provide the tiebreaker. Final score: 60% LLM, 40% rules.

```typescript
const result = await runHybridJudge({
  strategy: 'llm_first',
  // ...
}, context, callLLM)
```

**Best for**: When semantic quality matters more than operational metrics, but you still want operational guardrails as a fallback.

#### `parallel`

Both rules and LLM judge run simultaneously. Final score is an equal blend: 50% rules, 50% LLM.

```typescript
const result = await runHybridJudge({
  strategy: 'parallel',
  // ...
}, context, callLLM)

// result.reasoning = "Parallel evaluation: rules 2.0/3, LLM 8.5/10 → blended 6.3/10"
```

**Best for**: When you need the fullest picture and cost is not a primary concern. Provides the most robust evaluation.

### Strategy Comparison

| Strategy | LLM Cost | Speed | When Rules Pass | When Rules Fail | When Judge Uncertain |
|---|---|---|---|---|---|
| `rule_first` | Lowest | Fastest | Judge skipped (free) | Judge invoked | N/A (rules determine) |
| `llm_first` | Medium | Medium | Judge invoked | Rules as fallback | Rules break tie |
| `parallel` | Highest | Same as LLM | Both run | Both run | Both contribute equally |

### Judge Pool with Voting

For high-stakes evaluations, you can run a pool of judges with voting for consensus:

```typescript
import { runJudgePool } from '@agentbench/core'

const poolResult = await runJudgePool({
  judges: [
    { type: 'rule', config: { type: 'contains', params: { substring: 'refund' } }, weight: 1 },
    { type: 'llm',  config: { provider: 'openai', model: 'gpt-4o-mini', dimensions: ['correctness'] }, weight: 2 },
    { type: 'llm',  config: { provider: 'anthropic', model: 'claude-haiku', dimensions: ['correctness'] }, weight: 2 },
  ],
  votingStrategy: 'weighted',  // 'majority' | 'unanimous' | 'weighted'
}, ruleContext, llmContext, callLLM)

console.log(poolResult)
// {
//   passed: true,
//   score: 8.3,
//   maxScore: 10,
//   individualResults: [
//     { passed: true,  score: 10,  reasoning: 'Judge 1 (rule): passed' },
//     { passed: true,  score: 8.0, reasoning: 'Judge 2 (LLM): 8.0/10' },
//     { passed: true,  score: 7.5, reasoning: 'Judge 3 (LLM): 7.5/10' },
//   ],
//   reasoning: '2/3 judges passed (weighted), consensus: moderate',
//   consensus: 'moderate',  // 'strong' | 'moderate' | 'weak' | 'none'
// }
```

**Voting strategies**:
- **`majority`**: Passes if > 50% of judges vote pass. Consensus strength based on pass ratio (>= 80%: strong, >= 60%: moderate, >= 40%: weak, else: none).
- **`unanimous`**: Passes only if ALL judges vote pass. Consensus is `strong` if passed, `none` otherwise.
- **`weighted`**: Each judge has a weight. Passes if weighted sum of pass votes >= 50% of total weight.

## How Scores Flow into Assertions

Evaluation scores populate the `scores` array on `RunResult`, which is then consumed by score assertions:

```
Run agent → Tracer collects trace → Evaluate with rules/LLM/hybrid → Scores populated → Assertions check scores
```

```typescript
// Full pipeline
const runResult = await agentbench.run(config)
const scores = await agentbench.evaluate(runResult.id, {
  rules: [{ type: 'contains', params: { substring: 'refund' } }],
  judge: { provider: 'openai', model: 'gpt-4o-mini', dimensions: ['correctness'] },
})

// scores flow into runResult.scores
// Now assertions can check them:
const assertionResult = await expect(runResult)
  .score('correctness').toBeGreaterThan(7)
  .run()
```

## Common Pitfalls

### "Rule evaluators pass but the answer is wrong"

**Problem**: You check `contains: 'refund'` and `latency_lt: 10000`, both pass -- but the agent hallucinated the refund policy.

**Solution**: Always pair rules with at least one LLM judge dimension (`correctness` or `faithfulness`). Rules check the HOW (tools, format, budget); judges check the WHAT (is the answer right?).

### "The LLM judge gives different scores for the same output"

**Problem**: Running the same evaluation twice produces scores of 7 and 8.5.

**Solution**: Set `temperature: 0` on the judge model's config for maximum determinism. Accept a tolerance band (e.g., score >= 6 is passing) rather than requiring exact reproducibility. For critical evaluations, use a judge pool and require `majority` consensus.

### "Hybrid judge with rule_first never calls the LLM"

**Problem**: Your rules are too permissive -- they always pass, so the LLM judge never runs, and quality issues go undetected.

**Solution**: Make at least one rule intentionally challenging, or use `parallel` strategy when you always want LLM judgment.

### "Evaluation is too expensive"

**Problem**: Running 8 LLM judge dimensions on 500 test cases costs $30/day.

**Solution**: 
1. Use `rule_first` strategy -- rules catch the easy cases for free
2. Use GPT-4o-mini or Claude Haiku as judge models
3. Run full judging only on a representative sample (e.g., 20% of test cases) in CI, with periodic full-suite audits
4. Only judge the dimensions that matter for your use case -- do you really need `conciseness`?

### "My judge model is biased toward higher scores"

**Problem**: GPT-4o-mini consistently gives scores of 8-10, failing to distinguish good from mediocre.

**Solution**: Use a more capable judge model (GPT-4o or Claude Sonnet) for the evaluation. Provide a clearer rubric with explicit anchors (e.g., "Score 5 means: the answer is partially correct but contains a significant error"). Use a judge pool with models from different providers to surface biases.

## Next Steps

- **[The Assertion Model](./assertions.md)** -- learn how to assert on evaluation scores
- **[How Deterministic Replay Works](./replay.md)** -- evaluate without re-running the agent
- **[Dealing with LLM Non-Determinism](./non-determinism.md)** -- understand why judges are sometimes inconsistent
