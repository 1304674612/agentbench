---
title: Cost Budget Enforcement in CI
description: Recipe for preventing cost regressions by setting token budgets, tracking cost trends, and blocking PRs that increase costs beyond acceptable limits.
targetAudience: Teams managing LLM costs in production and CI pipelines
readingTime: 6 min
prerequisites:
  - AgentBench CI integration configured
  - Understanding of token limits and LLM pricing
---

# Cost Budget Enforcement in CI

LLM API costs add up fast. A seemingly innocent prompt change can double token usage across thousands of daily requests. This recipe shows you how to enforce cost budgets in CI, so no PR merges without passing cost checks.

## Overview

The workflow:

1. **Configure per-test token budgets** in your test cases and config
2. **Set cost thresholds** in `agentbench.config.ts`
3. **Track cost trends** over time using report data
4. **Block PRs** in CI that exceed cost budgets
5. **Optimize prompts** to reduce token usage without sacrificing quality

## Step 1: Configure Per-Test Token Budgets

Set token limits on individual test cases to catch cost regressions at the granular level.

### Via Test Case Configuration

```json
{
  "name": "Refund Query",
  "agentConfig": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "systemPrompt": "You are a customer support agent."
  },
  "input": {
    "messages": [{"role": "user", "content": "How do I get a refund?"}]
  },
  "assertions": [
    {"type": "tokens_lt", "params": {"threshold": 500}},
    {"type": "contains", "params": {"substring": "return policy"}},
    {"type": "latency_lt", "params": {"threshold": 5000}}
  ]
}
```

### Via Assertion DSL in Test Files

```typescript
import { expect } from '@agentbench/core'
import { runAgent } from '../src/agent'

export const refundQueryTest = {
  name: 'Refund Query — Token Budget',
  async run() {
    const result = await runAgent('How do I get a refund?')
    return result
  },
  async assertions(runResult: RunResult) {
    return expect(runResult)
      .tokens().toBeLessThan(500)          // 500 total tokens max
      .tokens().prompt().toBeLessThan(200)  // 200 prompt tokens max
      .output().toContain('return policy')
      .latency().toBeLessThan(5000)
      .run()
  },
}
```

### Global Defaults in Config

```typescript
// agentbench.config.ts
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  assertions: {
    maxTokens: 2048,      // Global token limit per test
    maxLatency: 15000,    // Global latency limit
    scoreThreshold: 7,
  },
})
```

Test-case-level assertions override the global defaults, so you can set stricter limits on simple queries and relaxed limits on complex multi-turn conversations.

## Step 2: Categorize Test Cases by Cost Tier

Not all tests should have the same budget. Categorize them:

```typescript
// tests/cost-tiers.ts
export enum CostTier {
  BUDGET = 'budget',       // Simple Q&A: < 500 tokens
  STANDARD = 'standard',   // Typical interaction: < 2000 tokens
  COMPLEX = 'complex',     // Multi-turn with tools: < 5000 tokens
  UNLIMITED = 'unlimited', // Research/debugging: no strict limit
}

export const COST_TIER_THRESHOLDS: Record<CostTier, { maxTokens: number; maxCost: number }> = {
  [CostTier.BUDGET]:    { maxTokens: 500,  maxCost: 0.002 },   // ~$0.002 with GPT-4o-mini
  [CostTier.STANDARD]:  { maxTokens: 2000, maxCost: 0.01 },    // ~$0.01
  [CostTier.COMPLEX]:   { maxTokens: 5000, maxCost: 0.03 },    // ~$0.03
  [CostTier.UNLIMITED]: { maxTokens: Infinity, maxCost: Infinity },
}

// Apply to test cases
export const tests = [
  {
    name: 'Simple greeting',
    tier: CostTier.BUDGET,
    run: () => runAgent('Hello'),
    assertions: (r: RunResult) => expect(r).tokens().toBeLessThan(500).run(),
  },
  {
    name: 'Multi-step refund',
    tier: CostTier.COMPLEX,
    run: () => runAgent('I need to return a damaged item and get a replacement shipped'),
    assertions: (r: RunResult) => expect(r).tokens().toBeLessThan(5000).run(),
  },
]
```

## Step 3: Track Cost Trends Over Time

Export reports after each CI run and store them for trend analysis:

```bash
# Generate cost report in JSON
agentbench report --json > "reports/cost-$(date +%Y-%m-%d).json"

# Extract cost data for trending
cat reports/cost-2026-07-10.json | jq '[.[] | {name: .name, cost: .metrics.totalCost, tokens: .metrics.totalTokens}]'
```

Build a simple cost tracking script:

```typescript
// scripts/track-costs.ts
import * as fs from 'node:fs'
import * as path from 'node:path'

interface CostRecord {
  date: string
  commitSha: string
  totalCost: number
  totalTokens: number
  avgCostPerTest: number
  testCount: number
}

function trackCost(reportPath: string, commitSha: string): CostRecord {
  const raw = fs.readFileSync(reportPath, 'utf-8')
  const runs = JSON.parse(raw)

  const totalCost = runs.reduce((sum: number, r: any) =>
    sum + (r.metrics?.totalCost ?? 0), 0)
  const totalTokens = runs.reduce((sum: number, r: any) =>
    sum + (r.metrics?.totalTokens ?? 0), 0)

  return {
    date: new Date().toISOString().split('T')[0],
    commitSha: commitSha.slice(0, 7),
    totalCost,
    totalTokens,
    avgCostPerTest: runs.length > 0 ? totalCost / runs.length : 0,
    testCount: runs.length,
  }
}

function saveCostHistory(record: CostRecord): void {
  const historyPath = path.join('.agentbench', 'cost-history.jsonl')
  fs.appendFileSync(historyPath, JSON.stringify(record) + '\n')
}

// Usage
const record = trackCost('./agentbench-report/report.json', process.env.GITHUB_SHA ?? 'local')
saveCostHistory(record)

console.log(`Total cost: $${record.totalCost.toFixed(4)}`)
console.log(`Avg cost/test: $${record.avgCostPerTest.toFixed(4)}`)
console.log(`Total tokens: ${record.totalTokens.toLocaleString()}`)
```

Add this to your CI workflow to build a cost trend over time:

```yaml
- name: Track cost history
  run: |
    pnpm tsx scripts/track-costs.ts
    cat .agentbench/cost-history.jsonl

- name: Check for cost spike
  run: |
    # Fail if current cost > 120% of 7-day moving average
    CURRENT=$(tail -1 .agentbench/cost-history.jsonl | jq .totalCost)
    AVG=$(tail -7 .agentbench/cost-history.jsonl | jq -s 'map(.totalCost) | add/length')
    RATIO=$(echo "scale=2; $CURRENT / $AVG" | bc)
    if (( $(echo "$RATIO > 1.2" | bc -l) )); then
      echo "❌ Cost spike detected! Current: \$$CURRENT, 7-day avg: \$$AVG (ratio: $RATIO)"
      exit 1
    fi
    echo "✅ Cost within acceptable range (ratio: $RATIO)"
```

## Step 4: Block Cost-Regressing PRs

Configure CI to fail if costs exceed thresholds:

```typescript
// agentbench.config.ts
export default defineConfig({
  ci: {
    provider: 'github-actions',
    failOnThreshold: true,
    commentOnPR: true,
    artifactsDir: './agentbench-artifacts',
  },
  assertions: {
    maxTokens: 4096,
    maxLatency: 30000,
  },
})
```

For more granular control, add a CI-only config:

```typescript
// agentbench.config.ci.ts — used by CI pipeline
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  // Stricter limits for CI
  assertions: {
    maxTokens: 2048,     // Block any PR that adds significant token bloat
    maxLatency: 20000,
    scoreThreshold: 7,
  },
  test: {
    timeout: 60000,
    retry: 0,            // No retries in CI (costs money and time)
    maxConcurrency: 2,
  },
  ci: {
    failOnThreshold: true,
    commentOnPR: true,
  },
})
```

The CI pipeline uses this config:

```yaml
- name: AgentBench Cost Check
  run: |
    agentbench test --config agentbench.config.ci.ts --ci --junit > cost-results.xml
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

- name: Post cost summary to PR
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const report = JSON.parse(fs.readFileSync('./agentbench-artifacts/summary.json', 'utf-8'));

      const body = `## 💰 AgentBench Cost Report

| Metric | Value |
|---|---|
| Total cost | $${report.totalCost.toFixed(4)} |
| Total tokens | ${report.totalTokens.toLocaleString()} |
| Avg tokens/test | ${report.avgTokensPerTest} |
| Tests run | ${report.testCount} |
| Cost vs baseline | ${report.costVsBaseline > 0 ? '📈 +' : '📉 '}$${Math.abs(report.costVsBaseline).toFixed(4)} |

${report.costVsBaseline > 0.01 ? '⚠️ **Cost increase detected!** Review token usage.' : '✅ Cost within acceptable range.'}`;

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body,
      });
```

## Step 5: Use Cheaper Models for Evaluation

LLM-as-Judge evaluation itself costs money. Use the cheapest capable model for judging:

```typescript
evaluation: {
  judges: ['correctness', 'faithfulness', 'safety'],
  judgeModel: 'openai/gpt-4o-mini',     // ~$0.15/1M input tokens
  // Alternatives by cost (ascending):
  // 'openai/gpt-4.1-nano'              // ~$0.10/1M input tokens
  // 'anthropic/claude-haiku-4-5'       // ~$0.80/1M input tokens
  // 'gemini/gemini-2.5-flash'          // competitive pricing
  scoreThreshold: 7,
}
```

The judge model should cost an order of magnitude less than your agent model. Running a $0.10 evaluation to validate a $0.001 agent interaction is disproportionate -- but running it to validate a $1.00 multi-turn agent interaction is easily justified.

## Step 6: Optimize Prompts to Reduce Token Usage

When a cost regression is detected, optimize before reverting:

| Technique | Typical Savings | Trade-off |
|---|---|---|
| Remove redundant instructions | 10-30% | May reduce output consistency |
| Use shorter examples (few-shot) | 20-40% | May reduce accuracy on complex tasks |
| Move instructions to tool descriptions | 15-25% | Requires well-structured tools |
| Truncate conversation history | 30-50% | May lose context on long conversations |
| Use structured output (JSON mode) | 10-20% | Agent must support structured output |
| Replace verbose "thinking" instructions with concise ones | 20-40% | May reduce reasoning quality |

Test each optimization with AgentBench before deploying:

```bash
# Baseline
agentbench test --suite cost-sensitive > baseline.json

# Apply optimization
# ... edit the system prompt ...

# Verify no quality regression
agentbench test --suite cost-sensitive > optimized.json

# Compare cost and quality
agentbench compare run_baseline run_optimized
```

## Common Pitfalls

### Setting token limits too low

A token limit that is too close to normal usage will cause flaky CI failures (non-deterministic LLM outputs vary in length).

**Fix:** Set limits at least 20% above observed maximums. If you normally use 400 tokens, set the limit at 500.

### Ignoring prompt token costs

Most cost tracking focuses on total tokens, but system prompt tokens are charged on every request. A bloated system prompt costs money even for simple queries.

**Fix:** Use `tokens().prompt().toBeLessThan()` to monitor prompt token growth specifically.

### Not accounting for tool call overhead

Tool definitions in the system prompt consume tokens. Adding a new tool with a verbose description can silently increase costs across all interactions.

**Fix:** Include tool definition token counts in your cost baseline and monitor them alongside prompt changes.

### Evaluating every CI run with LLM judge

Running full LLM-as-Judge evaluation on every CI commit can double your costs. Use rule-based assertions (tokens, latency, tool calls) for fast checks, and run LLM judges only on PR merges or scheduled runs.

**Fix:** Configure CI with `evaluation: { judges: [] }` and run judges separately:

```yaml
# Fast CI check (every commit)
agentbench test --ci --junit

# Full evaluation (on PR only)
agentbench evaluate run_001 --contains "refund" --tokens-lt 4096
```

## Next Steps

- [Catching Prompt Regressions](./catching-prompt-regressions.md) -- Detect quality+cost regressions together
- [Model Migration Testing](./model-migration-testing.md) -- Compare costs between old and new models
- [Configuration Reference](../reference/config.md) -- All CI and assertion configuration options
- [Assertion DSL Reference](../reference/assertion-dsl.md) -- Token and latency assertion details
