---
title: Model Migration Testing
description: Recipe for safely migrating between LLM models, using cross-model replay, statistical significance testing, and acceptance criteria.
targetAudience: Teams migrating agent workloads between LLM providers or model versions
readingTime: 8 min
prerequisites:
  - AgentBench project with test suites
  - Access to both old and new model APIs
---

# Model Migration Testing

Switching LLM models -- whether upgrading (GPT-4o to GPT-5), cross-grading (GPT-4o to Claude), or cost-optimizing (GPT-4o to GPT-4o-mini) -- carries risk. The new model may interpret prompts differently, miss tool calls, or produce different-quality outputs. This recipe provides a systematic, measurable approach to model migration testing.

## Overview

The workflow has five stages:

1. **Record baseline** runs with the current model
2. **Cross-model replay** to compare behavior on identical inputs
3. **Identify failure patterns** specific to the new model
4. **A/B experiment** with statistical significance testing
5. **Gradual rollout** with monitoring

## Step 1: Record Baseline Runs

Run your full test suite against the current (production) model and save the results as your migration baseline.

```bash
# Tag runs with the current model for easy filtering
agentbench test --suite all --verbose

# Create a snapshot tagged with the current model
agentbench snapshot create \
  --project proj_001 \
  --run run_gpt4o_baseline_001 \
  --name "gpt-4o-production-baseline" \
  --description "Production baseline before Claude migration"
```

Record key metrics for each test case:

```typescript
interface MigrationBaseline {
  model: string
  provider: string
  metrics: {
    avgScore: number          // Average judge score across all dimensions
    avgLatency: number        // Average end-to-end latency (ms)
    avgTokens: number         // Average total tokens per run
    avgCost: number           // Average cost per run (USD)
    passRate: number          // Percentage of tests passing
    toolSuccessRate: number   // Percentage of tool calls that succeeded
  }
  perDimensionScores: Record<string, number>  // correctness, safety, etc.
  perTestCaseResults: Array<{
    testName: string
    passed: boolean
    scores: Record<string, number>
    latency: number
    tokens: number
    cost: number
  }>
}
```

## Step 2: Cross-Model Replay

Replay the exact same inputs on the new model to create a fair comparison -- same prompts, same context, different model.

```bash
# Single cross-model replay
agentbench replay run_gpt4o_baseline_001 \
  --model claude-sonnet-4-20250514 \
  --provider anthropic \
  --mode cross_model

# Batch replay for statistical significance (10 runs)
agentbench replay run_gpt4o_baseline_001 \
  --model claude-sonnet-4-20250514 \
  --provider anthropic \
  --mode batch \
  --batch-count 10 \
  --seed 42
```

After replay, compare the results:

```bash
agentbench compare run_gpt4o_baseline_001 run_claude_replay_001 --json > comparison.json
```

## Step 3: Identify Model-Specific Failure Patterns

Different models have different failure modes. Catalog the patterns systematically:

```typescript
import { expect } from '@agentbench/core'

async function analyzeModelFailures(
  baselineRuns: RunResult[],
  newModelRuns: RunResult[],
) {
  const failures = {
    toolCallErrors: [] as string[],       // New model misses tool calls
    outputQualityDrops: [] as string[],   // New model produces worse output
    safetyIssues: [] as string[],         // New model produces unsafe content
    latencyRegressions: [] as string[],   // New model is slower
    tokenExplosions: [] as string[],      // New model uses far more tokens
    hallucinationIncreases: [] as string[], // New model hallucinates more
  }

  for (let i = 0; i < baselineRuns.length; i++) {
    const baseline = baselineRuns[i]
    const newRun = newModelRuns[i]

    // Check tool call coverage
    const baselineTools = new Set(baseline.trace?.steps
      .filter(s => s.type === 'tool_call')
      .map(s => s.toolName))
    const newTools = new Set(newRun.trace?.steps
      .filter(s => s.type === 'tool_call')
      .map(s => s.toolName))

    for (const tool of baselineTools) {
      if (!newTools.has(tool)) {
        failures.toolCallErrors.push(
          `${baseline.name}: Tool "${tool}" called by baseline but not new model`
        )
      }
    }

    // Check token explosion (>50% increase)
    const tokenIncrease = (newRun.metrics.totalTokens - baseline.metrics.totalTokens)
      / baseline.metrics.totalTokens
    if (tokenIncrease > 0.5) {
      failures.tokenExplosions.push(
        `${baseline.name}: Tokens increased by ${(tokenIncrease * 100).toFixed(0)}%`
      )
    }

    // Check latency regression (>100% increase)
    const latencyIncrease = (newRun.metrics.totalLatency - baseline.metrics.totalLatency)
      / baseline.metrics.totalLatency
    if (latencyIncrease > 1.0) {
      failures.latencyRegressions.push(
        `${baseline.name}: Latency increased by ${(latencyIncrease * 100).toFixed(0)}%`
      )
    }
  }

  return failures
}
```

Common model-specific failure patterns:

| Model Family | Common Failures | Mitigation |
|---|---|---|
| Claude | Overly cautious refusals, verbose tool descriptions | Add "be concise" to system prompt, test safety threshold settings |
| GPT-4o | Missing tool calls with complex schemas | Simplify tool descriptions, add explicit tool-use instructions |
| GPT-4o-mini | Hallucinations on factual queries, weaker reasoning | Add explicit "if uncertain, say so" instructions |
| Gemini | Different formatting conventions | Normalize output before comparison |
| DeepSeek | Different tokenization affects prompt length limits | Reduce maxTokens and test with edge-case lengths |

## Step 4: A/B Experiment with Statistical Testing

For high-stakes migrations, run a formal A/B experiment with enough samples for statistical significance.

```bash
# Create experiment via API
curl -X POST http://localhost:3000/api/v1/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001",
    "name": "GPT-4o vs Claude Sonnet Migration",
    "config": {
      "variants": [
        {
          "name": "A",
          "config": {
            "provider": "openai",
            "model": "gpt-4o",
            "systemPrompt": "You are a helpful customer support agent."
          }
        },
        {
          "name": "B",
          "config": {
            "provider": "anthropic",
            "model": "claude-sonnet-4-20250514",
            "systemPrompt": "You are a helpful customer support agent."
          }
        }
      ],
      "runsPerVariant": 30,
      "testCaseIds": ["case_001", "case_002", "case_003"]
    }
  }'

# Run the experiment
agentbench experiment run exp_001

# Check results
agentbench experiment results exp_001
```

Interpret the statistical output from experiment results:

| Metric | What It Tells You |
|---|---|
| `pValue < 0.05` | The difference between models is statistically significant |
| `pValue >= 0.05` | Cannot conclude there is a real difference (insufficient data or no effect) |
| `effectSize` (Cohen's d) | Magnitude of the difference: 0.2 = small, 0.5 = medium, 0.8 = large |
| `confidenceInterval` | Range that likely contains the true difference (95% CI) |

A non-significant result (p > 0.05) with a small effect size means the models are effectively equivalent for your use case -- the migration is safe from a quality perspective.

## Step 5: Set Migration Acceptance Criteria

Define objective criteria that must be met before the migration is approved:

```typescript
interface MigrationAcceptanceCriteria {
  maxScoreDrop: number          // Maximum allowed drop in any judge dimension
  maxCostIncrease: number       // Maximum allowed cost increase (ratio, e.g., 1.2 = 20%)
  maxLatencyIncrease: number    // Maximum allowed latency increase (ratio)
  maxTokenIncrease: number      // Maximum allowed token increase (ratio)
  minPassRate: number           // Minimum pass rate (0-1)
  requireStatisticalSignificance: boolean  // Require p < 0.05 from A/B test
  blockedCategories: string[]   // Test categories that must never degrade
}

const migrationCriteria: MigrationAcceptanceCriteria = {
  maxScoreDrop: 0.5,             // Allow at most 0.5 point drop on any dimension
  maxCostIncrease: 0.8,          // New model must cost at most 80% of old model (cost savings)
  maxLatencyIncrease: 1.5,       // Allow up to 50% more latency
  maxTokenIncrease: 1.2,         // Allow up to 20% more tokens
  minPassRate: 0.95,             // Must pass at least 95% of tests
  requireStatisticalSignificance: true,
  blockedCategories: ['safety', 'P0-critical'],
}

async function validateMigration(
  baseline: MigrationBaseline,
  newModel: MigrationBaseline,
  criteria: MigrationAcceptanceCriteria,
): Promise<{ approved: boolean; violations: string[] }> {
  const violations: string[] = []

  // Check score drops per dimension
  for (const [dim, baselineScore] of Object.entries(baseline.perDimensionScores)) {
    const newScore = newModel.perDimensionScores[dim] ?? 0
    const drop = baselineScore - newScore
    if (drop > criteria.maxScoreDrop) {
      violations.push(`${dim}: dropped by ${drop.toFixed(2)} (max allowed: ${criteria.maxScoreDrop})`)
    }
  }

  // Check cost
  if (newModel.metrics.avgCost > baseline.metrics.avgCost * criteria.maxCostIncrease) {
    violations.push(
      `Cost: $${newModel.metrics.avgCost.toFixed(4)} vs $${baseline.metrics.avgCost.toFixed(4)} (limit: ${criteria.maxCostIncrease}x)`
    )
  }

  // Check latency
  if (newModel.metrics.avgLatency > baseline.metrics.avgLatency * criteria.maxLatencyIncrease) {
    violations.push(
      `Latency: ${newModel.metrics.avgLatency}ms vs ${baseline.metrics.avgLatency}ms (limit: ${criteria.maxLatencyIncrease}x)`
    )
  }

  // Check pass rate
  if (newModel.metrics.passRate < criteria.minPassRate) {
    violations.push(
      `Pass rate: ${(newModel.metrics.passRate * 100).toFixed(1)}% (minimum: ${(criteria.minPassRate * 100).toFixed(1)}%)`
    )
  }

  return {
    approved: violations.length === 0,
    violations,
  }
}
```

## Step 6: Gradual Rollout Strategy

Even after passing acceptance criteria, roll out the new model gradually:

1. **Shadow mode (0% traffic)**: Run new model in parallel, log results, no user impact
2. **Canary (5% traffic)**: Route a small percentage of real traffic to the new model
3. **Ramp (25% -> 50% -> 75%)**: Increase traffic while monitoring metrics
4. **Full cutover (100%)**: Complete the migration
5. **Rollback plan**: Keep the old model configuration ready for instant rollback

For each stage, use AgentBench to continuously run regression tests:

```yaml
# Scheduled regression test during migration
name: Migration Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours during migration

jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run migration regression suite
        run: |
          agentbench test --suite migration-critical --ci --junit > migration-report.xml
      - name: Alert on regression
        if: failure()
        run: |
          # Send alert to Slack/Teams/PagerDuty
          curl -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d '{"text":"🚨 Model migration regression detected! Check CI logs."}'
```

## Common Pitfalls

### Comparing different prompts

If you change the prompt to optimize for the new model, you're no longer comparing models -- you're comparing model+prompt combos. Test with the **same prompt** first, then optimize separately.

### Small sample sizes

Running 3-5 replays and concluding "no difference" is unreliable. LLM outputs have high variance. For production migrations, use at least 30 runs per variant for statistical power.

### Ignoring edge cases

Standard test suites often cover the happy path. The new model may fail on edge cases that the old model handled fine. Expand your test suite to include:
- Very long inputs
- Ambiguous queries
- Multi-turn conversations with context switching
- Tool calls with large argument payloads

### Cost comparison at different price points

Comparing absolute costs between models with different pricing is misleading. Compare **token usage** separately from **cost per token**. A model that uses 50% more tokens but costs 70% less per token is still cheaper overall.

### Overlooking rate limits

New models may have different rate limits. Test with `maxConcurrency` settings that match the new model's limits to avoid throttling in production.

## Next Steps

- [Catching Prompt Regressions](./catching-prompt-regressions.md) -- Apply similar techniques to prompt changes
- [A/B Testing AI Agents](./agent-ab-testing.md) -- Formal experiment methodology
- [Cost Budget Enforcement in CI](./cost-budget-enforcement.md) -- Prevent cost regressions
- [Replay API Reference](../reference/api.md#runs) -- Cross-model replay endpoint details
