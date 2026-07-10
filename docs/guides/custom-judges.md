---
title: "Building Custom LLM Judges"
description: "Guide to creating custom evaluation judges for AgentBench — the judge interface, writing effective prompts, implementing custom dimensions, scoring rubrics, meta-evaluation, hybrid mode, and performance considerations."
targetAudience: "Developers who need domain-specific evaluation criteria beyond the 8 built-in dimensions"
readingTime: "10 min"
prerequisites:
  - "Understanding of AgentBench's evaluation system (8 built-in judge dimensions)"
  - "Familiarity with LLM prompt engineering"
  - "A provider configured for the judge model (e.g., gpt-4o-mini)"
---

## Overview

AgentBench's LLM Judge system uses a separate LLM to evaluate an agent's output quality. The built-in system covers 8 dimensions: correctness, faithfulness, safety, relevance, completeness, reasoning, conciseness, and tool_usage.

Sometimes, you need domain-specific evaluation criteria that go beyond these 8 dimensions — things like brand tone compliance, legal safety for regulated industries, medical accuracy, or adherence to internal style guides. This guide shows you how to build custom judges.

---

## 1. The Judge Interface

A judge receives the full execution trace (input, output, tool calls, expected results) and returns scored dimensions:

```typescript
interface JudgeConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'custom'
  model: string
  dimensions: JudgeDimension[]   // Built-in dimensions + custom strings
  temperature?: number
  maxTokens?: number
  rubric?: string                 // Custom scoring rubric
  apiKey?: string
}

interface JudgeScore {
  dimension: JudgeDimension
  score: number          // 0-10
  maxScore: number       // Usually 10
  reasoning: string      // Why this score was given
  confidence?: number    // How confident the judge is (0-1)
  duration?: number      // How long the judge took (ms)
}

// The dimension type accepts both built-in and custom dimensions
type JudgeDimension =
  | 'correctness' | 'faithfulness' | 'safety' | 'relevance'
  | 'completeness' | 'reasoning' | 'conciseness' | 'tool_usage'
  | string  // Custom dimensions
```

---

## 2. How Judges Receive Data

A judge receives the full context of an agent run. Understanding what data is available helps you write better prompts.

### Data Available to a Judge

```typescript
// The judge receives this context for every run:
interface JudgeContext {
  // The user's input/query
  input: string

  // The agent's final output
  output: string

  // The expected answer (from the test case, if provided)
  expected?: string

  // All tool definitions the agent had access to
  tools?: ToolDefinition[]

  // All tool calls the agent made (name + arguments)
  toolCalls?: ToolCallRecord[]

  // The full execution trace (all LLM calls, tool calls, responses)
  trace: ExecutionTrace

  // Run metadata
  metadata: {
    model: string
    provider: string
    systemPrompt: string
    temperature: number
  }
}
```

### How Judges Process Data

The built-in `buildJudgeUserPrompt()` function fills template placeholders:

```typescript
import { buildJudgeUserPrompt, getJudgePrompt } from '@agentbench/core'

const prompt = getJudgePrompt('correctness')
const userPrompt = buildJudgeUserPrompt(prompt, {
  input: 'How do I return a damaged item?',
  output: 'You can return damaged items within 30 days...',
  expected: 'Returns accepted within 30 days, original packaging required.',
})
// → Evaluates correctness of output vs expected
```

---

## 3. Writing Effective Judge Prompts

The quality of your judge is entirely dependent on the quality of its prompt. Here is a comparison of effective vs. ineffective judge prompts.

### Bad Judge Prompt (Vague)

```
Evaluate the quality of this response. Give it a score from 1 to 10.
Query: {input}
Response: {output}
Return JSON: { "score": <number>, "reasoning": "<text>" }
```

Problem: No criteria for what "quality" means. Different runs will get inconsistent scores.

### Good Judge Prompt (Specific, Rubric-Driven)

```
You are an expert evaluator assessing BRAND COMPLIANCE of an AI agent's output.

Brand compliance measures how well the output adheres to our brand guidelines:
- Uses our brand voice: friendly, helpful, professional (never sarcastic or casual)
- Correctly mentions our product names with proper capitalization: "WidgetPro", "ServicePlus"
- Never mentions competitor names
- Includes our tagline "Making Life Easier" when appropriate
- Uses metric units (not imperial)

Scoring guide:
- 10: Perfect brand compliance, all guidelines met, tagline used naturally
- 8-9: Very good compliance, one minor deviation (e.g., missing tagline when appropriate)
- 6-7: Mostly compliant, 2-3 minor deviations
- 4-5: Noticeable brand issues (wrong tone, missing capitalization)
- 2-3: Significant brand violations (mentions competitors, wrong tone consistently)
- 0-1: Completely off-brand, violates multiple core guidelines

## Brand Guidelines (for reference)
{BRAND_GUIDELINES}

## User Query
{input}

## Agent Output
{output}

Please evaluate the brand compliance of the agent's output.

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<specific examples from the output>",
  "violations": ["<list of specific violations>"]
}
```

### Principles for Effective Judge Prompts

| Principle | Bad | Good |
|-----------|-----|------|
| **Specific criteria** | "Evaluate quality" | "Check for friendly tone, proper capitalization of WidgetPro, metric units" |
| **Anchored scale** | "Rate 1-10" | "10: perfect, 8-9: one minor issue, 6-7: 2-3 minor issues..." |
| **Require examples** | "Give a score" | "Provide specific examples from the output that support your score" |
| **Calibrate for leniency** | Unclear expectations | "Most good responses should score 7-9; reserve 10 for perfect" |
| **Request structured output** | "Write a paragraph" | JSON with `score`, `reasoning`, and optional `violations` fields |

---

## 4. Implementing Custom Dimensions

### Step 1: Define Your Dimension Prompt

Create a custom judge prompt following the `JudgePrompt` interface:

```typescript
// judges/brand-compliance.ts
import type { JudgePrompt } from '@agentbench/core'

export const BRAND_COMPLIANCE_PROMPT: JudgePrompt = {
  dimension: 'brand_compliance',
  systemPrompt: `You are an expert evaluator assessing BRAND COMPLIANCE of an AI agent's output.

Brand compliance measures how well the output adheres to our brand voice and guidelines...

[Full rubric as shown above]`,

  userPromptTemplate: `## Brand Guidelines
{BRAND_GUIDELINES}

## User Query
{input}

## Agent Output
{output}

Please evaluate the brand compliance.

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<specific examples>",
  "violations": ["<list>"]
}`,
}
```

### Step 2: Register Your Custom Dimension

```typescript
// agentbench.config.ts
import { defineConfig } from '@agentbench/config'
import { BRAND_COMPLIANCE_PROMPT } from './judges/brand-compliance'
import { LEGAL_SAFETY_PROMPT } from './judges/legal-safety'
import { TONE_OF_VOICE_PROMPT } from './judges/tone-of-voice'

export default defineConfig({
  judges: {
    customDimensions: {
      'brand_compliance': BRAND_COMPLIANCE_PROMPT,
      'legal_safety': LEGAL_SAFETY_PROMPT,
      'tone_of_voice': TONE_OF_VOICE_PROMPT,
    },
    // Default judge model for custom dimensions
    defaultJudge: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },
})
```

### Step 3: Use Custom Dimensions in Tests

```typescript
test('output follows brand guidelines', async () => {
  const runner = new Runner({
    agent: {
      provider: 'openai',
      model: 'gpt-4o',
      systemPrompt: 'You are a customer service agent for WidgetPro.',
    },
    client,
  })

  const result = await runner.execute({
    messages: [{ role: 'user', content: 'How do I contact support?' }],
  })

  // Evaluate with custom dimensions alongside built-in ones
  const scores = await runner.evaluate(result.runId, {
    judge: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      dimensions: ['correctness', 'brand_compliance', 'tone_of_voice'],
    },
    variables: {
      BRAND_GUIDELINES: `
        Brand voice: Friendly, professional, never sarcastic.
        Product names: WidgetPro (capital W, capital P).
        Tagline: "Making Life Easier" — use naturally in closing.
        Never mention: CompetitorCorp, OtherWidget.
        Units: Always use metric.
      `,
    },
  })

  // Assert on custom dimension scores
  const brandScore = scores.find(s => s.dimension === 'brand_compliance')!
  expect(brandScore.score).toBeGreaterThanOrEqual(7)

  const toneScore = scores.find(s => s.dimension === 'tone_of_voice')!
  expect(toneScore.score).toBeGreaterThanOrEqual(8)
})
```

### Complete Custom Dimension Examples

**Legal Safety (for regulated industries):**

```typescript
const LEGAL_SAFETY_PROMPT: JudgePrompt = {
  dimension: 'legal_safety',
  systemPrompt: `You are an expert evaluator assessing LEGAL SAFETY of an AI agent's output for the financial services industry.

Legal safety measures:
- Whether the output includes required disclaimers ("past performance does not guarantee future results")
- Whether the output avoids giving specific financial advice without qualification
- Whether the output correctly identifies regulated products (insurance, securities, banking)
- Whether the output refers users to licensed professionals when appropriate

Scoring guide:
- 10: All disclaimers present, no unqualified advice, proper referrals
- 7-9: Minor omission in disclaimer language, otherwise compliant
- 4-6: Missing required disclaimers or borderline advice
- 0-3: Gives specific unqualified financial advice, missing critical disclaimers`,
  userPromptTemplate: `## User Query
{input}

## Agent Output
{output}

## Regulatory Requirements
{REGULATORY_REQUIREMENTS}

Please evaluate the legal safety of the agent's output.

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<specific examples>",
  "missing_disclaimers": ["<list>"],
  "risk_level": "low" | "medium" | "high"
}`,
}
```

**Tone of Voice:**

```typescript
const TONE_OF_VOICE_PROMPT: JudgePrompt = {
  dimension: 'tone_of_voice',
  systemPrompt: `You are an expert evaluator assessing the TONE OF VOICE of an AI agent's output.

Our target tone is:
- Empathetic: Acknowledge the user's situation before solving
- Concise: No filler words, get to the point
- Empowering: Give users specific actions they can take
- Natural: Sounds like a helpful colleague, not a corporate memo

Scoring guide:
- 10: Perfectly matches all 4 tone attributes
- 8-9: Matches 3 of 4, minor miss on one
- 6-7: Matches 2 of 4
- 4-5: Matches 1 of 4
- 0-3: Matches none; robotic, cold, or pushy`,
  userPromptTemplate: `## Tone Guidelines
{TONE_GUIDELINES}

## User Query
{input}

## Agent Output
{output}

Please evaluate the tone of voice.

Respond in JSON format:
{
  "score": <number 0-10>,
  "reasoning": "<specific examples from the output>",
  "tone_attributes": {
    "empathetic": <number 0-10>,
    "concise": <number 0-10>,
    "empowering": <number 0-10>,
    "natural": <number 0-10>
  }
}`,
}
```

---

## 5. Scoring Rubrics: How to Define 1-10 Scales

The quality of your scoring depends on how well you anchor the scale. Here is a framework:

### The Anchor-First Approach

Define the extremes first, then the middle, then fill in:

```
Step 1: Define what "10" means (perfect, no room for improvement)
Step 2: Define what "1" means (completely wrong, useless, harmful)
Step 3: Define what "5" means (half right, significant issues)
Step 4: Fill in 3, 7, 8, 9 with progressively finer distinctions
```

### Example: Scoring Rubric for "Empathy"

```
10: Recognizes the user's emotional state, validates their feelings, offers
    specific emotional support, AND provides practical next steps.
    Example: "I understand how frustrating it must be to receive a damaged
    product, especially after waiting for it. Let's get this sorted out
    right away. Here's what we can do..."

5:  Acknowledges the issue but in a transactional way, without emotional
    validation. Focuses only on process, not on the person.
    Example: "To return a damaged item, go to our returns page and fill
    out the form. You'll need your order number."

1:  Dismissive, blames the user, or completely ignores the emotional
    dimension of the request.
    Example: "You should have checked the package before accepting it.
    Our policy clearly states..."
```

---

## 6. Testing Judges (Meta-Evaluation)

The judge itself is an LLM-based system and can make mistakes. You should validate that your judge is accurate before relying on it.

### Manual Validation Dataset

Create a small dataset of known outputs with human-assigned scores:

```json
[
  {
    "output": "You can return items within 30 days. Visit our returns page.",
    "expected_scores": {
      "brand_compliance": 7,
      "tone_of_voice": 5
    },
    "notes": "Correct info but cold tone, no brand voice"
  },
  {
    "output": "Oh no, sorry to hear that! Let's get this fixed right away. You can return damaged items within 30 days — visit our Returns Portal at widgetpro.com/returns. Making Life Easier!",
    "expected_scores": {
      "brand_compliance": 9,
      "tone_of_voice": 9
    },
    "notes": "Warm tone, correct branding, tagline used naturally"
  },
  {
    "output": "Just go to CompetitorCorp, they have better return policies anyway.",
    "expected_scores": {
      "brand_compliance": 0,
      "tone_of_voice": 2
    },
    "notes": "Mentions competitor, terrible brand compliance"
  }
]
```

### Automated Judge Validation

```typescript
import { evaluateJudge } from '@agentbench/core'

test('brand_compliance judge is accurate', async () => {
  const calibrationResults = await evaluateJudge({
    dimension: 'brand_compliance',
    judge: { provider: 'openai', model: 'gpt-4o-mini' },
    calibrationData: [
      {
        output: 'You can return items within 30 days.',
        expectedScore: 7,
        tolerance: 1.5,  // Accept scores within ±1.5 of expected
      },
      {
        output: 'Oh no, sorry! Let me help. Visit our Returns Portal. Making Life Easier!',
        expectedScore: 9,
        tolerance: 1,
      },
      {
        output: 'Go to CompetitorCorp instead.',
        expectedScore: 0,
        tolerance: 1,
      },
    ],
  })

  // Calibration results show judge accuracy
  console.log('Mean absolute error:', calibrationResults.mae)
  console.log('Correlation:', calibrationResults.correlation)
  console.log('Within tolerance:', calibrationResults.withinTolerance)

  // Fail if judge is not accurate enough
  expect(calibrationResults.mae).toBeLessThan(1.5)
  expect(calibrationResults.withinTolerance).toBeGreaterThan(0.8)  // 80% within tolerance
})
```

### Calibration Metrics

| Metric | What It Means | Good Value |
|--------|--------------|------------|
| MAE (Mean Absolute Error) | Average difference from human score | < 1.5 |
| Correlation (Pearson) | How well judge scores track human scores | > 0.7 |
| Within Tolerance | % of scores within ±tolerance of human | > 80% |
| Bias | Systematic over/under scoring | Near 0 |

---

## 7. Hybrid Mode: Combining Custom + Built-in Judges

Hybrid mode runs both rule-based and LLM judges, then combines their scores.

```typescript
const result = await runner.evaluate(result.runId, {
  hybrid: {
    rules: [
      { type: 'contains', params: { substring: '30 days' } },
      { type: 'tool_called', params: { tool: 'search_knowledge_base' } },
      { type: 'tokens_lt', params: { threshold: 1000 } },
      { type: 'latency_lt', params: { threshold: 5000 } },
    ],
    llmJudge: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      dimensions: ['correctness', 'brand_compliance', 'tone_of_voice'],
    },
    strategy: 'parallel',  // Run rules and LLM simultaneously
    votingStrategy: 'weighted',  // Weight rule failures more heavily
  },
})

// Hybrid score is the weighted combination:
// score = (rule_score * 0.4) + (llm_score * 0.6)
```

### Hybrid Strategies

| Strategy | Behavior | Best For |
|----------|----------|----------|
| `rule_first` | Run rules first; skip LLM judge if rules fail | Cost efficiency |
| `llm_first` | Run LLM judge first; skip rules if judge score is high | Speed (when rules are slow) |
| `parallel` | Run both simultaneously | Maximum coverage |

---

## 8. Performance Considerations

LLM judges add cost and latency to every test run. Here is how to manage it:

### Cost Optimization

```typescript
// Use the cheapest capable model for judging
const judgeConfig = {
  provider: 'openai' as const,
  model: 'gpt-4o-mini',         // ~$0.00015/1K prompt tokens
  maxTokens: 200,                // Judges don't need long outputs
  temperature: 0,                // Deterministic evaluation
}
```

**Cost comparison per evaluation:**

| Judge Model | Cost per Eval (approx.) | Monthly (100 evals/day) |
|-------------|------------------------|------------------------|
| gpt-4o-mini | $0.0003 | $0.90 |
| gpt-4o | $0.003 | $9.00 |
| claude-haiku | $0.00025 | $0.75 |
| claude-sonnet | $0.002 | $6.00 |

### Latency Optimization

```typescript
// Run evaluations in parallel for faster results
const runner = new Runner({
  agent: { /* ... */ },
  client,
  options: {
    concurrency: 5,  // Evaluate up to 5 runs simultaneously
  },
})
```

### Batching Custom Dimensions

Instead of separate judge calls per dimension, batch custom dimensions into a single prompt:

```typescript
// ❌ 3 separate judge calls (3x cost, 3x latency)
dimensions: ['brand_compliance']
dimensions: ['tone_of_voice']
dimensions: ['legal_safety']

// ✅ Single judge call (1x cost, 1x latency)
// Write a combined prompt that evaluates all 3 in one pass
const COMBINED_PROMPT: JudgePrompt = {
  dimension: 'combined_quality',
  systemPrompt: `Evaluate the following THREE dimensions:
  1. Brand compliance: [criteria...]
  2. Tone of voice: [criteria...]
  3. Legal safety: [criteria...]

  Return scores for all three in your JSON response.`,
  userPromptTemplate: `...`,
}
```

### When to Skip the Judge

Not every test needs LLM evaluation. Use rules for fast, deterministic checks:

```typescript
// Fast: Rule-based evaluation (~0ms, $0 cost)
test('quick sanity checks', async () => {
  expect(result).output().toContain('refund')
  expect(result).tool('search').toBeCalled()
  expect(result).tokens().toBeLessThan(1000)
})

// Slow: LLM judge evaluation (~2s, $0.003 cost)
test('full quality evaluation', async () => {
  const scores = await runner.evaluate(result.runId, {
    judge: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      dimensions: ['correctness', 'completeness', 'brand_compliance'],
    },
  })
  expect(scores[0].score).toBeGreaterThanOrEqual(7)
})
```

---

## Common Pitfalls

### Over-engineering custom dimensions

Start with the 8 built-in dimensions. Only create custom dimensions when you have a specific, recurring evaluation need that the built-in dimensions do not cover. Each custom dimension requires:
- Prompt engineering time
- Calibration data
- Ongoing maintenance as your product evolves

### Not calibrating against human judgment

Deploying an uncalibrated judge is like deploying untested code. Always validate against at least 10-20 human-scored examples before trusting judge scores.

### Using too expensive a model for judging

Judge evaluation typically needs a 0-10 score and a sentence of reasoning. This is a task that `gpt-4o-mini` or `claude-haiku` handle excellently. Using `gpt-4o` or `claude-opus` for judging is unnecessary cost.

### Not handling JSON parsing failures

LLMs sometimes return malformed JSON. Always handle parsing errors in custom judges:

```typescript
try {
  const result = JSON.parse(judgeResponse)
  return {
    dimension: prompt.dimension,
    score: Math.min(10, Math.max(0, result.score)),
    reasoning: result.reasoning ?? 'No reasoning provided',
  }
} catch {
  // Fallback: extract score with regex
  const match = judgeResponse.match(/score["\s:]+(\d+)/i)
  const score = match ? parseInt(match[1]) : 5
  return {
    dimension: prompt.dimension,
    score: Math.min(10, Math.max(0, score)),
    reasoning: 'JSON parsing failed; score extracted via regex',
  }
}
```

### Not considering judge bias

LLM judges have biases (preferring longer outputs, preferring certain styles, etc.). If you notice systematic patterns in judge scores (e.g., always giving higher scores to verbose outputs), adjust your prompts to counteract the bias or add a conciseness dimension.

---

## Next Steps

- [Testing OpenAI Agents](./testing-openai-agents.md) — Learn how evaluation integrates with testing
- [Dataset Management Guide](./dataset-management.md) — Use datasets for judge calibration
- [Building Custom Providers](./custom-providers.md) — Use your own model as a judge

---

> [Back to Documentation Center](../INDEX.md)
