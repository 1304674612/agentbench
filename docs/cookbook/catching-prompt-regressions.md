---
title: Catching Prompt Regressions
description: Recipe for detecting when a prompt change makes agent quality worse, using snapshots, compare mode, and PR workflow integration.
targetAudience: Developers iterating on agent prompts and system instructions
readingTime: 6 min
prerequisites:
  - AgentBench project with test suites
  - Understanding of snapshot and compare features
---

# Catching Prompt Regressions

Prompt engineering is iterative. You tweak wording, add instructions, adjust the tone -- and sometimes you make things worse. This recipe shows you how to set up automated prompt regression detection so you catch quality drops before they reach production.

## Overview

The workflow has four stages:

1. **Baseline**: Record snapshots of your agent's behavior with the current prompt
2. **Change**: Modify the prompt and run tests
3. **Compare**: Compare new results against the baseline
4. **Gate**: Block the change if quality drops below a threshold

## Step 1: Create a Baseline Snapshot

Run your test suite with the current (known-good) prompt and capture snapshots.

```bash
# Run the full test suite
agentbench test --suite customer-support

# Create a baseline snapshot from the results
agentbench snapshot create \
  --project proj_customer_support \
  --run run_baseline_001 \
  --name "prompt-v1-baseline" \
  --description "Baseline before prompt optimization"
```

Alternatively, create snapshots programmatically via the API after each test run:

```typescript
import { apiClient } from './agentbench-api'

async function createBaseline(projectId: string, runId: string) {
  const run = await apiClient.getRun(runId)

  await apiClient.createSnapshot(projectId, {
    name: `baseline-${new Date().toISOString().split('T')[0]}`,
    type: 'MANUAL',
    runId,
    data: {
      agent: { config: run.config.agent },
      prompt: { system: run.config.agent.systemPrompt },
      model: { provider: run.config.agent.provider, name: run.config.agent.model },
      context: { messages: run.config.input.messages },
    },
    tags: ['baseline', 'prompt-regression'],
  })
}
```

## Step 2: Configure Score Change Thresholds

In your `agentbench.config.ts`, set thresholds that define an acceptable score change. These prevent tiny, insignificant fluctuations from triggering false alarms.

```typescript
import { defineConfig } from '@agentbench/core'

export default defineConfig({
  agent: {
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful customer support agent.',
  },
  evaluation: {
    judges: ['correctness', 'faithfulness', 'safety', 'completeness'],
    judgeModel: 'openai/gpt-4o-mini',
    scoreThreshold: 7,
  },
  assertions: {
    scoreThreshold: 7,
    maxTokens: 4096,
    maxLatency: 30000,
    forbiddenTools: [],
  },
  // CI will fail if scores drop by more than 1.0 point
  ci: {
    provider: 'github-actions',
    failOnThreshold: true,
    commentOnPR: true,
  },
})
```

Set `scoreThreshold` to your minimum acceptable quality. For regression detection, the key is the **difference** between baseline and new scores, not the absolute threshold.

## Step 3: Run Regression Tests with Comparison

After changing your prompt, run the test suite and compare against the baseline snapshot.

```bash
# Run tests with the new prompt
agentbench test --suite customer-support

# Restore the baseline snapshot to create a comparable run
agentbench snapshot restore snap_baseline_001

# Compare the two runs
agentbench compare run_baseline_001 run_new_prompt_001
```

For programmatic comparison, use the API:

```typescript
async function detectRegression(baselineRunId: string, newRunId: string) {
  const [baseline, current] = await Promise.all([
    apiClient.getRun(baselineRunId),
    apiClient.getRun(newRunId),
  ])

  const baselineScores = baseline.scores ?? []
  const currentScores = current.scores ?? []

  const regressions: Array<{ dimension: string; drop: number }> = []

  for (const dim of ['correctness', 'faithfulness', 'safety', 'completeness']) {
    const baselineScore = baselineScores.find(s => s.evaluator === dim)?.score ?? 0
    const currentScore = currentScores.find(s => s.evaluator === dim)?.score ?? 0
    const drop = baselineScore - currentScore

    if (drop > 1.0) {
      regressions.push({ dimension: dim, drop })
    }
  }

  if (regressions.length > 0) {
    console.error('PROMPT REGRESSION DETECTED:')
    for (const r of regressions) {
      console.error(`  ${r.dimension}: dropped by ${r.drop.toFixed(2)} points`)
    }
    return false
  }

  console.log('No prompt regression detected.')
  return true
}
```

## Step 4: Use Replay to Isolate Prompt Effects

LLM outputs are non-deterministic. A score drop might be random variance, not a prompt regression. Use replay to isolate the prompt's effect:

```bash
# Cross-model replay: run the same inputs with the OLD prompt on the same model
agentbench replay run_baseline_001 \
  --mode cross_model \
  --model gpt-4o \
  --provider openai

# Batch replay for statistical confidence
agentbench replay run_new_prompt_001 \
  --mode batch \
  --batch-count 10 \
  --seed 42
```

Run batch replay on both the old and new prompt, then compare the **distributions** of scores rather than single runs. A t-test can tell you whether the difference is statistically significant:

```typescript
function tTest(sampleA: number[], sampleB: number[]): { pValue: number; significant: boolean } {
  const meanA = sampleA.reduce((a, b) => a + b, 0) / sampleA.length
  const meanB = sampleB.reduce((a, b) => a + b, 0) / sampleB.length

  const varA = sampleA.reduce((s, x) => s + (x - meanA) ** 2, 0) / (sampleA.length - 1)
  const varB = sampleB.reduce((s, x) => s + (x - meanB) ** 2, 0) / (sampleB.length - 1)

  const se = Math.sqrt(varA / sampleA.length + varB / sampleB.length)
  const t = (meanA - meanB) / se

  // Welch-Satterthwaite degrees of freedom (simplified)
  const df = sampleA.length + sampleB.length - 2

  // Approximate p-value from t-distribution (two-tailed)
  // In production, use a proper statistics library like jstat or simple-statistics
  const pValue = 2 * (1 - tcdf(Math.abs(t), df))

  return { pValue, significant: pValue < 0.05 }
}
```

## Step 5: Integrate Into PR Review Workflow

Add prompt regression detection to your CI pipeline:

```yaml
# .github/workflows/agentbench.yml
name: AgentBench Prompt Regression Check

on:
  pull_request:
    paths:
      - 'src/agent.ts'
      - 'agentbench.config.ts'
      - 'tests/**'

jobs:
  regression-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup
        run: |
          pnpm install
          pnpm db:generate

      - name: Restore baseline snapshot
        run: |
          agentbench snapshot restore snap_production_baseline --model gpt-4o
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Run tests with new prompt
        run: |
          agentbench test --ci --junit > test-results.xml
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Compare against baseline
        run: |
          agentbench compare run_baseline_prod run_new_pr --json > comparison.json
          # Parse comparison and fail if regression > threshold

      - name: Comment PR
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ **Prompt regression detected!** Scores dropped below the acceptable threshold. Check the AgentBench CI logs for details.'
            })
```

## Interpreting Regression Reports

When comparing baseline vs. new runs, look for these patterns:

| Pattern | Interpretation | Action |
|---|---|---|
| All scores drop by > 1.0 | The new prompt is uniformly worse | Revert the prompt change |
| One dimension drops (e.g., safety) | The prompt introduced a specific flaw | Inspect the prompt wording around that dimension |
| Scores drop but tokens decrease | The prompt is shorter but sacrifices quality | Add back critical instructions |
| Scores fluctuate within +/- 0.5 | Normal non-deterministic variance | Increase batch count for statistical confidence |
| Latency increases significantly | The prompt is causing longer reasoning chains | Check for overly complex instructions |

## Common Pitfalls

### Comparing single runs

A single run comparison is not reliable due to LLM non-determinism. Always use batch replay (N >= 5) and statistical testing.

**Fix:** Increase `--batch-count` to at least 10 for high-stakes prompts.

### Ignoring cost regressions

A prompt that improves quality but doubles token usage is still a regression for production systems. Always monitor token counts alongside scores.

**Fix:** Add token assertions: `.tokens().toBeLessThan(baselineTokens * 1.1)` (allow 10% increase).

### Baseline drift

Your baseline snapshot can become stale as your test suite evolves. Update baselines after major test suite changes.

**Fix:** Automate baseline updates after each production deployment using the API.

### False positives from LLM judge variance

LLM judges are themselves non-deterministic. The judge model's scores can vary between runs on the same output.

**Fix:** Use a low-temperature judge model (`temperature: 0`) and, for critical checks, run the judge multiple times and average the results.

## Next Steps

- [Model Migration Testing](./model-migration-testing.md) -- Apply similar techniques when changing models
- [A/B Testing AI Agents](./agent-ab-testing.md) -- Run formal experiments with statistical rigor
- [Configuration Reference](../reference/config.md) -- Set up CI and score thresholds
- [Snapshot API Reference](../reference/api.md#snapshots) -- Programmatic snapshot management
