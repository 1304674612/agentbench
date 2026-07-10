---
title: A/B Testing AI Agents
description: Recipe for running statistically valid A/B experiments on AI agents, using the experiment engine, understanding statistical methods, and avoiding common pitfalls.
targetAudience: Teams running formal experiments to compare agent configurations
readingTime: 8 min
prerequisites:
  - AgentBench experiment engine configured
  - Understanding of basic statistics (p-values, confidence intervals)
  - Sufficient test cases for statistical power (30+ recommended)
---

# A/B Testing AI Agents

A/B testing for AI agents is more nuanced than for traditional software. LLM non-determinism means you cannot compare single runs -- you need statistical methods to determine whether differences are real or noise. This recipe covers the full experiment workflow.

## Overview

The workflow:

1. **Define experiment variants** -- different prompts, models, or tool configurations
2. **Run the experiment** -- execute each variant N times across your test suite
3. **Analyze results** -- apply statistical tests (t-test, confidence intervals, effect size)
4. **Interpret findings** -- determine if there is a meaningful winner
5. **Determine sample size** -- know how many runs you need for significance

## Step 1: Define Experiment Variants

Experiments compare two or more variants. Each variant can differ in prompt, model, temperature, tools, or any combination:

```bash
curl -X POST http://localhost:3000/api/v1/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001",
    "name": "Prompt Tone: Casual vs Professional",
    "description": "Testing whether a casual or professional tone leads to better customer satisfaction scores",
    "config": {
      "variants": [
        {
          "name": "A",
          "config": {
            "provider": "openai",
            "model": "gpt-4o",
            "systemPrompt": "You are a friendly, casual customer support agent. Use emojis, keep it light, and be conversational. 😊",
            "temperature": 0.7
          }
        },
        {
          "name": "B",
          "config": {
            "provider": "openai",
            "model": "gpt-4o",
            "systemPrompt": "You are a professional customer support agent. Maintain a formal, courteous tone. Be precise and efficient.",
            "temperature": 0.3
          }
        }
      ],
      "runsPerVariant": 30,
      "testCaseIds": ["case_001", "case_002", "case_003", "case_004", "case_005"]
    }
  }'
```

Key experiment design principles:

| Principle | Recommendation |
|---|---|
| Change one thing | Vary only one dimension (prompt, model, temperature) per experiment |
| Randomize order | AgentBench randomizes variant execution order automatically |
| Sufficient samples | 30+ runs per variant for moderate effects, 100+ for small effects |
| Diverse test cases | Include happy path, edge cases, and adversarial inputs |
| Pre-register criteria | Define success metrics before running the experiment |

## Step 2: Run the Experiment

```bash
# Start the experiment
agentbench experiment run exp_001 --project proj_001

# Check status (can take several minutes for large experiments)
agentbench experiment results exp_001
```

Monitor progress via the API:

```bash
curl "http://localhost:3000/api/v1/experiments/exp_001" | jq '{status: .status, conclusion: .conclusion}'
# {"status": "RUNNING", "conclusion": null}
# ...
# {"status": "COMPLETED", "conclusion": "WINNER_A"}
```

## Step 3: Understanding Statistical Methods

AgentBench applies three statistical methods to determine if a difference is meaningful:

### Student's t-test (Independent Two-Sample)

Compares the means of two groups to determine if they differ significantly.

```
H₀ (null hypothesis): The two variants produce the same average score
H₁ (alternative): The two variants produce different average scores

If p-value < 0.05: Reject H₀ — there is a statistically significant difference
If p-value >= 0.05: Fail to reject H₀ — insufficient evidence of difference
```

The t-test assumes:
- Scores are approximately normally distributed
- Variants have similar variance (Welch's correction applied if not)
- Observations are independent

### Bootstrap Confidence Intervals

Resamples the observed data with replacement to estimate the distribution of the score difference. A 95% confidence interval that does not contain zero indicates a significant difference.

```
95% CI for (mean_B - mean_A) = [0.2, 1.8]
→ Variant B is between 0.2 and 1.8 points better than A (95% confidence)
```

Bootstrap is more robust than t-test when the normality assumption is violated, but requires more computation.

### Cohen's d (Effect Size)

Measures the magnitude of the difference independent of sample size:

```
d = (mean_A - mean_B) / pooled_standard_deviation

|d| < 0.2: Negligible effect
0.2 ≤ |d| < 0.5: Small effect
0.5 ≤ |d| < 0.8: Medium effect
|d| ≥ 0.8: Large effect
```

A statistically significant result (p < 0.05) with a negligible effect size (d < 0.2) means the difference is real but too small to matter practically.

## Step 4: Interpreting Experiment Results

Example experiment output:

```json
{
  "id": "exp_001",
  "name": "Prompt Tone: Casual vs Professional",
  "status": "COMPLETED",
  "conclusion": "WINNER_A",
  "results": {
    "statisticalTest": "Welch's t-test",
    "pValue": 0.008,
    "effectSize": 0.62,
    "confidenceInterval": [0.5, 2.1],
    "perDimension": {
      "correctness": {
        "variantA": { "mean": 8.4, "stdDev": 1.2 },
        "variantB": { "mean": 7.8, "stdDev": 1.5 },
        "pValue": 0.04,
        "effectSize": 0.44
      },
      "safety": {
        "variantA": { "mean": 9.1, "stdDev": 0.8 },
        "variantB": { "mean": 9.2, "stdDev": 0.7 },
        "pValue": 0.52,
        "effectSize": -0.12
      },
      "completeness": {
        "variantA": { "mean": 7.9, "stdDev": 1.4 },
        "variantB": { "mean": 7.1, "stdDev": 1.6 },
        "pValue": 0.02,
        "effectSize": 0.53
      }
    }
  },
  "summary": {
    "A": { "runCount": 30, "passedCount": 27, "avgScore": 8.47, "avgLatency": 2340, "avgTokens": 1250 },
    "B": { "runCount": 30, "passedCount": 24, "avgScore": 7.70, "avgLatency": 2210, "avgTokens": 1180 }
  }
}
```

### How to Read This

1. **Conclusion**: `WINNER_A` means Variant A (casual tone) performed significantly better overall
2. **p-value = 0.008**: Very strong evidence that the difference is real, not random chance (< 1% probability of observing this difference if variants were truly equal)
3. **Effect size = 0.62**: Medium-to-large effect -- the casual tone meaningfully improves quality
4. **Confidence interval [0.5, 2.1]**: We are 95% confident the true improvement is between 0.5 and 2.1 points
5. **Per-dimension breakdown**: Casual tone improved correctness and completeness significantly, with no meaningful change in safety

### Decision Framework

| p-value | Effect Size | Conclusion | Action |
|---|---|---|---|
| < 0.05 | Large (d > 0.8) | Clear winner | Confidently adopt the winning variant |
| < 0.05 | Medium (d > 0.5) | Meaningful improvement | Adopt, but monitor in production |
| < 0.05 | Small (d < 0.5) | Real but minor improvement | Consider cost/latency trade-offs |
| >= 0.05 | Any | No significant difference | Either variant is acceptable; choose by cost/latency |
| N/A | N/A | Inconclusive | Increase sample size and re-run |

## Step 5: Determining Required Sample Size

Use a power analysis to determine how many runs you need:

```typescript
/**
 * Calculate required sample size per variant for a two-sample t-test.
 *
 * @param expectedEffectSize  Minimum effect size you want to detect (Cohen's d)
 * @param significanceLevel   Alpha (typically 0.05)
 * @param power               Desired statistical power (typically 0.80)
 * @returns                   Required sample size per variant
 */
function requiredSampleSize(
  expectedEffectSize: number,
  significanceLevel: number = 0.05,
  power: number = 0.80,
): number {
  // Approximate using the formula for two-sample t-test
  // n ≈ 2 * (z_α/2 + z_β)^2 / d^2
  // where z_α/2 ≈ 1.96 for α=0.05, z_β ≈ 0.84 for power=0.80

  const zAlpha = 1.96   // Two-tailed 95% confidence
  const zBeta = 0.84    // 80% power

  const n = Math.ceil(2 * Math.pow(zAlpha + zBeta, 2) / Math.pow(expectedEffectSize, 2))
  return n
}

// Examples:
console.log(requiredSampleSize(0.2))  // 393 — detecting small effects needs many samples
console.log(requiredSampleSize(0.5))  //  64 — moderate effects
console.log(requiredSampleSize(0.8))  //  26 — large effects
console.log(requiredSampleSize(1.0))  //  16 — very large effects
```

| Expected Effect | Samples per Variant | Total Runs | Approximate Cost (GPT-4o-mini) |
|---|---|---|---|
| Large (d = 0.8) | 26 | 52 | ~$0.20 |
| Medium (d = 0.5) | 64 | 128 | ~$0.50 |
| Small (d = 0.2) | 393 | 786 | ~$3.00 |

## Step 6: Analyzing Experiment Results Programmatically

```typescript
interface ExperimentAnalysis {
  winner: string | null
  isSignificant: boolean
  pValue: number
  effectSize: number
  confidenceInterval: [number, number]
  recommendation: string
}

function analyzeExperiment(experiment: ExperimentResult): ExperimentAnalysis {
  const { results, summary } = experiment

  const isSignificant = results.pValue < 0.05
  const winner = results.conclusion === 'WINNER_A' ? 'A'
    : results.conclusion === 'WINNER_B' ? 'B'
    : null

  let recommendation: string

  if (!isSignificant) {
    // Check if we might need more samples
    const perVariant = Object.values(summary)[0]?.runCount ?? 0
    if (perVariant < 30) {
      recommendation = `Insufficient samples (${perVariant} per variant). Collect at least 30 per variant and re-run.`
    } else if (results.effectSize < 0.2) {
      recommendation = 'Variants are effectively equivalent. Choose based on cost, latency, or other non-quality factors.'
    } else {
      recommendation = `Effect size (d=${results.effectSize.toFixed(2)}) is non-trivial but not statistically significant. Increase sample size to ${requiredSampleSize(results.effectSize)} per variant.`
    }
  } else if (winner) {
    const effectLabel = results.effectSize >= 0.8 ? 'large'
      : results.effectSize >= 0.5 ? 'medium'
      : 'small'

    recommendation = `Variant ${winner} wins with a ${effectLabel} effect (d=${results.effectSize.toFixed(2)}, p=${results.pValue.toFixed(3)}). Adopt with confidence.`
  } else {
    recommendation = 'Statistical significance detected but no clear winner. Check per-dimension breakdown.'
  }

  return {
    winner,
    isSignificant,
    pValue: results.pValue,
    effectSize: results.effectSize,
    confidenceInterval: results.confidenceInterval,
    recommendation,
  }
}
```

## Common Statistical Pitfalls

### P-hacking (Data Dredging)

Running multiple statistical tests and reporting only the one that shows significance. If you check 20 dimensions, expect 1 false positive at p < 0.05 by random chance.

**Fix:** Pre-register your primary metric. Apply Bonferroni correction for multiple comparisons: divide your significance threshold by the number of tests (`0.05 / k`).

```typescript
// Bonferroni correction
const numDimensions = 8
const correctedAlpha = 0.05 / numDimensions  // 0.00625
const isSignificant = pValue < correctedAlpha
```

### Multiple Comparisons

If your experiment has 3 variants (A, B, C), you need 3 pairwise comparisons (A vs B, A vs C, B vs C). Each comparison inflates the chance of a false positive.

**Fix:** Use ANOVA first to test if any variant differs, then use post-hoc tests (Tukey's HSD) for pairwise comparisons with adjusted p-values.

### Stopping Early (Peeking)

Checking results mid-experiment and stopping when significance is reached inflates false positive rates dramatically.

**Fix:** Pre-determine sample size. Do not check results until the full sample is collected. Use sequential testing methods (e.g., always-valid p-values) if you must monitor continuously.

### Ignoring Practical Significance

A statistically significant difference of 0.1 points on a 10-point scale may not justify the cost of switching models.

**Fix:** Combine statistical significance with effect size and cost-benefit analysis:

```typescript
interface MigrationDecision {
  qualityChange: number        // Score difference
  isStatisticallySignificant: boolean
  qualityEffectSize: number    // Cohen's d
  costChange: number           // % change in cost
  latencyChange: number        // % change in latency
  should_migrate: boolean
}

function shouldMigrate(analysis: MigrationDecision): boolean {
  // Quality must improve or stay the same
  if (analysis.qualityChange < -0.5) return false

  // If quality is statistically significantly better, migrate
  if (analysis.isStatisticallySignificant && analysis.qualityEffectSize > 0.5) {
    // But check cost
    if (analysis.costChange > 1.5) {
      console.warn('Quality improvement but cost increased >50%. Evaluate ROI.')
    }
    return true
  }

  // If quality is equivalent, migrate only if cheaper or faster
  if (!analysis.isStatisticallySignificant || analysis.qualityEffectSize < 0.2) {
    return analysis.costChange < 0.9 || analysis.latencyChange < 0.8
  }

  return false
}
```

### Confusing Correlation with Causation

If Variant A scores higher on correctness AND uses fewer tokens, it's tempting to conclude that fewer tokens cause higher correctness. These may be coincidental.

**Fix:** Design experiments to isolate variables. Test "brevity" as a deliberate variant, not as a side effect.

## Running Experiments via API

```bash
# Create experiment
EXPERIMENT_ID=$(curl -s -X POST http://localhost:3000/api/v1/experiments \
  -H "Content-Type: application/json" \
  -d '{"projectId":"proj_001","name":"Temperature: 0 vs 0.7","config":{"variants":[{"name":"A","config":{"temperature":0}},{"name":"B","config":{"temperature":0.7}}],"runsPerVariant":30,"testCaseIds":["case_001"]}}' \
  | jq -r '.id')

# Run it
curl -X POST "http://localhost:3000/api/v1/experiments/$EXPERIMENT_ID/run"

# Poll until complete
while true; do
  STATUS=$(curl -s "http://localhost:3000/api/v1/experiments/$EXPERIMENT_ID" | jq -r '.status')
  if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  echo "Status: $STATUS — waiting..."
  sleep 10
done

# Get results
curl -s "http://localhost:3000/api/v1/experiments/$EXPERIMENT_ID/results" | jq .
```

## Next Steps

- [Model Migration Testing](./model-migration-testing.md) -- Apply A/B methodology to model migrations
- [Catching Prompt Regressions](./catching-prompt-regressions.md) -- Quick regression detection for prompt changes
- [Configuration Reference](../reference/config.md) -- Experiment and evaluation configuration
- [REST API Reference](../reference/api.md#experiments) -- Experiment API endpoints
