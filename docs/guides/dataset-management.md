---
title: "Dataset Management Guide"
description: "Complete guide to managing datasets for agent testing — creating datasets, importing from CSV/JSON/JSONL/HuggingFace/OpenAI Evals/DeepEval/LangSmith, validation, splitting, sampling, versioning, and best practices."
targetAudience: "Developers and QA engineers managing test data for AI agent evaluation"
readingTime: "10 min"
prerequisites:
  - "AgentBench v0.3.0+ installed"
  - "Understanding of test suites and test cases"
  - "Basic knowledge of CSV, JSON, JSONL formats"
---

## Overview

Datasets are the foundation of systematic agent testing. Instead of writing individual test cases by hand, you define a dataset of inputs and expected outputs, and AgentBench runs your agent against every item — tracking scores, costs, and regressions across the entire set.

AgentBench v0.3.0 introduces a complete dataset system with support for 7 import formats, validation, splitting, sampling, versioning, and CLI management.

---

## 1. Creating Datasets From Scratch

### Dataset Structure

A dataset consists of:
- **Metadata**: name, description, format, tags, version, license
- **Items**: individual test inputs with optional expected outputs
- **Schema**: field definitions for validation

### Creating via CLI

```bash
# Create an empty dataset
agentbench dataset create \
  --name "Customer Support Scenarios" \
  --description "Common customer service interactions" \
  --project-id proj-xxx

# Add items interactively
agentbench dataset add-item <datasetId> \
  --input '{"messages":[{"role":"user","content":"How do I get a refund?"}]}' \
  --expected '{"output":"You can request a refund within 30 days..."}'
```

### Creating via SDK

```typescript
import { Dataset } from '@agentbench/core'

const dataset = await Dataset.create({
  projectId: 'proj-xxx',
  name: 'Customer Support Scenarios',
  description: 'Common customer service interactions covering refunds, shipping, and account management.',
  format: 'json',
  tags: ['customer-support', 'refunds', 'v1'],
  version: '1.0.0',
  author: 'QA Team',
  license: 'internal',
})

// Add items
await dataset.addItem({
  split: 'test',
  input: {
    messages: [{ role: 'user', content: 'How do I get a refund for a damaged product?' }],
    variables: { category: 'refunds', difficulty: 'easy' },
  },
  expected: {
    output: 'You can request a refund within 30 days of purchase. Please visit our Returns Portal or contact support.',
    toolCalls: [
      { name: 'search_knowledge_base', arguments: { query: 'refund policy' } },
    ],
  },
  labels: ['refunds', 'damaged-product'],
})

await dataset.addItem({
  split: 'test',
  input: {
    messages: [{ role: 'user', content: 'Where is my order #12345?' }],
    variables: { category: 'shipping', difficulty: 'easy' },
  },
  expected: {
    output: 'Let me look up your order. Your order #12345 is currently in transit and estimated to arrive by Friday.',
    toolCalls: [
      { name: 'lookup_order', arguments: { orderId: '12345' } },
    ],
  },
  labels: ['shipping', 'order-tracking'],
})
```

---

## 2. Importing from External Formats

### CSV Import

```bash
agentbench dataset import <datasetId> \
  --format csv \
  --source ./data/scenarios.csv \
  --delimiter "," \
  --has-header
```

**CSV Structure:**

```csv
split,user_message,expected_output,expected_tool,category,difficulty
test,"How do I get a refund?","You can request a refund within 30 days.",search_knowledge_base,refunds,easy
test,"Where is my order?","Your order is in transit.",lookup_order,shipping,easy
train,"Can I change my address?","You can update your address in account settings.",update_account,account,medium
```

**Field Mapping:**

```bash
agentbench dataset import <datasetId> \
  --format csv \
  --source ./data/scenarios.csv \
  --mapping '{"user_message":"input.messages[0].content","expected_output":"expected.output","expected_tool":"expected.toolCalls[0].name","category":"labels[0]"}'
```

### JSON Import

```bash
agentbench dataset import <datasetId> \
  --format json \
  --source ./data/scenarios.json
```

**JSON Structure:**

```json
[
  {
    "split": "test",
    "input": {
      "messages": [
        { "role": "user", "content": "How do I get a refund?" }
      ],
      "variables": { "category": "refunds" }
    },
    "expected": {
      "output": "You can request a refund within 30 days.",
      "toolCalls": [
        { "name": "search_knowledge_base", "arguments": { "query": "refund policy" } }
      ]
    },
    "labels": ["refunds", "easy"],
    "metadata": { "created_by": "qa-team" }
  }
]
```

### JSONL Import

```bash
agentbench dataset import <datasetId> \
  --format jsonl \
  --source ./data/scenarios.jsonl
```

**JSONL Structure (one JSON object per line):**

```
{"split":"test","input":{"messages":[{"role":"user","content":"How do I get a refund?"}]},"expected":{"output":"You can request a refund within 30 days."}}
{"split":"test","input":{"messages":[{"role":"user","content":"Where is my order?"}]},"expected":{"output":"Your order is in transit."}}
{"split":"train","input":{"messages":[{"role":"user","content":"Can I change my address?"}]},"expected":{"output":"You can update your address in account settings."}}
```

### HuggingFace Import

```bash
agentbench dataset import <datasetId> \
  --format huggingface \
  --source "username/dataset-name" \
  --split "test" \
  --mapping '{"question":"input.messages[0].content","answer":"expected.output"}'
```

This pulls directly from the HuggingFace Hub:

```typescript
import { Dataset } from '@agentbench/core'

const dataset = await Dataset.importFromHuggingFace({
  datasetId: 'ds-xxx',
  repo: 'username/dataset-name',
  split: 'test',
  mapping: {
    'question': 'input.messages[0].content',
    'answer': 'expected.output',
    'category': 'labels',
  },
})
```

### OpenAI Evals Import

```bash
agentbench dataset import <datasetId> \
  --format openai-evals \
  --source ./evals/refund-eval.jsonl
```

Converts OpenAI Evals format to AgentBench dataset format:

```typescript
// OpenAI Evals format
// {"input": [{"role": "user", "content": "..."}], "ideal": "expected answer"}

// Auto-converted to AgentBench format
// {"input": {"messages": [...]}, "expected": {"output": "expected answer"}}
```

### DeepEval Import

```bash
agentbench dataset import <datasetId> \
  --format deepeval \
  --source ./data/deepeval-dataset.json
```

### LangSmith Import

```bash
agentbench dataset import <datasetId> \
  --format langsmith \
  --source "your-org/your-dataset" \
  --api-key $LANGSMITH_API_KEY
```

Migrates LangSmith datasets, converting runs into AgentBench test items:

```typescript
const dataset = await Dataset.importFromLangSmith({
  datasetId: 'ds-xxx',
  datasetName: 'your-org/your-dataset',
  apiKey: process.env.LANGSMITH_API_KEY!,
  mapping: {
    'input.question': 'input.messages[0].content',
    'output.answer': 'expected.output',
  },
})
```

---

## 3. Dataset Validation

### Schema Validation

Datasets are validated against a schema that checks required fields:

```bash
agentbench dataset validate <datasetId>
```

**Validation checks:**
- All items have required `input.messages` field
- `expected` fields, if present, have valid structure
- `toolCalls` in expected have `name` and `arguments`
- `labels` are consistent strings
- No duplicate items (by input hash)
- `split` values are valid (`train`, `test`, `validation`)
- No circular references
- All items have consistent field types

### Programmatic Validation

```typescript
const validation = await dataset.validate()

if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
  // [
  //   { item: 5, field: 'input.messages', error: 'Missing required field' },
  //   { item: 12, field: 'expected.toolCalls[0].arguments', error: 'Expected object, got string' },
  // ]
}

console.log('Validation warnings:', validation.warnings)
// [
//   { item: 8, warning: 'expected.output is empty; consider adding a reference answer' },
// ]
```

### Required Fields

| Field | Required | Notes |
|-------|----------|-------|
| `input.messages` | Yes | At least one message with `role` and `content` |
| `input.messages[].role` | Yes | Must be `user`, `assistant`, or `system` |
| `input.messages[].content` | Yes | Non-empty string |
| `expected.output` | No | Strongly recommended for evaluation |
| `expected.toolCalls` | No | Required only for tool-calling assertions |
| `labels` | No | Helps with filtering and stratification |
| `metadata` | No | Arbitrary key-value pairs |

---

## 4. Splitting Datasets

Splitting is critical for separating training data (used to calibrate prompts) from test data (used to validate quality).

### Stratified Splitting

```bash
agentbench dataset split <datasetId> \
  --ratios "70:15:15" \
  --stratify "category" \
  --seed 42
```

This ensures each split has proportional representation of each category:

```
Before split:
  Category "refunds":  100 items
  Category "shipping":  50 items
  Category "account":   30 items

After split (70:15:15, stratified by category):
  Train:
    Category "refunds":  70 items (70%)
    Category "shipping":  35 items (70%)
    Category "account":   21 items (70%)

  Test:
    Category "refunds":  15 items (15%)
    Category "shipping":   7 items (15%)
    Category "account":    5 items (15%)

  Validation:
    Category "refunds":  15 items (15%)
    Category "shipping":   8 items (15%)
    Category "account":    4 items (15%)
```

### Programmatic Splitting

```typescript
const splits = await dataset.split({
  ratios: { train: 0.7, test: 0.2, validation: 0.1 },
  stratify: 'labels[0]',  // Stratify by the first label
  seed: 42,
})

console.log(splits.train.length)      // 140 items
console.log(splits.test.length)       // 40 items
console.log(splits.validation.length)  // 20 items
```

---

## 5. Sampling for Quick Test Runs

When iterating rapidly, run against a sample instead of the full dataset:

```bash
# Random sample of 10 items
agentbench dataset sample <datasetId> --size 10 --seed 42

# Stratified sample (2 items per category)
agentbench dataset sample <datasetId> --size 2 --stratify "category"

# Weighted sample (more difficult items)
agentbench dataset sample <datasetId> --size 10 --weight "difficulty"
```

### Programmatic Sampling

```typescript
// Simple random sample
const sample = await dataset.sample({ size: 10, seed: 42 })

// Stratified sample: 2 items from each difficulty level
const stratifiedSample = await dataset.sample({
  size: 2,
  stratify: 'difficulty',
})

// Filtered sample: only high-difficulty items
const hardItems = await dataset.sample({
  filter: (item) => item.labels?.includes('difficulty:hard') ?? false,
  size: 5,
})
```

---

## 6. Versioning Datasets

Datasets change over time as you add new scenarios and refine expected answers. Versioning helps track what changed and why.

### Creating Versions

```bash
# Tag the current state as a version
agentbench dataset version create <datasetId> \
  --tag "v1.0.0" \
  --message "Initial release — 50 refund scenarios"

# After adding more items
agentbench dataset version create <datasetId> \
  --tag "v1.1.0" \
  --message "Added 20 shipping scenarios"

# List all versions
agentbench dataset version list <datasetId>
# v1.1.0  (current)
# v1.0.0
```

### Checking Out Versions

```bash
# Revert to a specific version for testing
agentbench dataset version checkout <datasetId> --tag "v1.0.0"

# Return to latest
agentbench dataset version checkout <datasetId> --latest
```

### Diffing Versions

```bash
agentbench dataset diff <datasetId> v1.0.0 v1.1.0
```

**Output:**

```
Dataset diff: v1.0.0 → v1.1.0

Added: 20 items
  + "Where is my order #12345?" (shipping)
  + "What's the status of my replacement?" (shipping)
  + ...

Removed: 0 items

Modified: 3 items
  ~ "How do I get a refund?" — expected.output updated (more detail)
  ~ "Can I cancel my order?" — labels changed (['refunds'] → ['refunds', 'cancellation'])
  ~ "What payment methods?" — split changed (train → test)

Statistics:
  v1.0.0:  50 items (all refunds)
  v1.1.0:  70 items (50 refunds + 20 shipping)
```

### Programmatic Versioning

```typescript
// Create a version
const version = await dataset.createVersion({
  tag: 'v1.2.0',
  message: 'Added account management scenarios, fixed 3 expected outputs',
})

// Diff two versions
const diff = await dataset.diff('v1.1.0', 'v1.2.0')
console.log('Added:', diff.added.length)
console.log('Removed:', diff.removed.length)
console.log('Modified:', diff.modified.length)
```

---

## 7. Using Datasets in Test Suites

### Iterating Over Dataset Items

```typescript
import { suite, test, expect } from '@agentbench/core'

suite('Customer Support Scenarios', () => {
  const dataset = await Dataset.load('ds-customer-support', { version: 'v1.1.0' })

  // Iterate over each item in the test split
  for (const item of dataset.items({ split: 'test' })) {
    test(item.input.messages[0].content, async () => {
      const runner = new Runner({
        agent: {
          provider: 'openai',
          model: 'gpt-4o',
          systemPrompt: 'You are a helpful customer service agent.',
          tools: customerServiceTools,
        },
        client,
      })

      const result = await runner.execute({
        messages: item.input.messages,
        variables: item.input.variables,
      })

      // Assert against expected values
      if (item.expected?.output) {
        expect(result).output().toMatch(
          new RegExp(item.expected.output.slice(0, 50))
        )
      }

      if (item.expected?.toolCalls) {
        for (const expectedTool of item.expected.toolCalls) {
          expect(result).tool(expectedTool.name).toBeCalled()
        }
      }

      // Tag results with dataset metadata
      result.metadata = {
        datasetId: dataset.id,
        itemId: item.id,
        labels: item.labels,
      }
    })
  }
})
```

### Filtering by Labels

```typescript
// Only run refund-related tests
const refundItems = dataset.items({
  split: 'test',
  filter: (item) => item.labels?.includes('refunds') ?? false,
})

// Only run high-difficulty tests
const hardItems = dataset.items({
  split: 'test',
  filter: (item) => item.input.variables?.['difficulty'] === 'hard',
})
```

### Dataset-Centric Test Suite

```typescript
import { defineConfig } from '@agentbench/config'

export default defineConfig({
  suites: {
    'customer-support': {
      dataset: 'ds-customer-support',
      datasetVersion: 'v1.1.0',
      split: 'test',
      agent: {
        provider: 'openai',
        model: 'gpt-4o',
        systemPrompt: 'You are a customer service agent.',
      },
      evaluators: [
        { type: 'LLM_JUDGE', config: { dimensions: ['correctness', 'completeness'] } },
      ],
    },
  },
})
```

Run:

```bash
agentbench test --suite customer-support
```

---

## 8. Best Practices for Dataset Organization

### Naming Conventions

```
datasets/
├── customer-support/
│   ├── refunds/
│   │   ├── v1.0.0.json
│   │   └── v1.1.0.json
│   ├── shipping/
│   │   └── v1.0.0.json
│   └── account-management/
│       └── v1.0.0.json
├── technical-support/
│   ├── troubleshooting.json
│   └── escalation.json
└── sales/
    ├── product-inquiries.json
    └── pricing-questions.json
```

### Label Taxonomy

Use consistent, hierarchical labels:

```
labels:
  - "category:refunds"         # Top-level category
  - "difficulty:easy"          # Difficulty level
  - "requires:tool-calling"    # Required capabilities
  - "model:gpt-4o"             # Target model
  - "language:english"         # Language
  - "domain:retail"            # Business domain
```

### Dataset Size Guidelines

| Purpose | Recommended Size | Notes |
|---------|-----------------|-------|
| Quick smoke test | 10-20 items | 30-second runs |
| Per-PR testing | 50-100 items | < 5 minutes |
| Full nightly run | 200-500 items | < 30 minutes |
| Pre-release validation | 500+ items | Run on schedule |

### Balancing Your Dataset

Ensure your dataset covers:
- **Happy paths** (60%): Typical user interactions
- **Edge cases** (25%): Unusual inputs, special characters, long inputs, multiple intents
- **Error cases** (15%): Missing information, conflicting requests, security probes

### Dataset README

Every dataset should have a README or metadata describing:

```typescript
await Dataset.create({
  name: 'Customer Support Scenarios',
  description: `Covers 5 categories: refunds, shipping, account, billing, technical.
  Sources: Real customer tickets (anonymized), QA team contributions.
  Last reviewed: 2026-06-15.
  Reviewers: qa-team@company.com`,
  author: 'QA Team',
  license: 'internal',
  tags: ['customer-support', 'production-data'],
})
```

---

## Common Pitfalls

### Putting test data in train split and vice versa

If you calibrate your prompts or system prompt against the test split, your test scores will be inflated (data leakage). Always keep train and test splits strictly separate. Use different seeds for splitting.

### Not versioning datasets

Without versioning, you cannot reproduce old test results. A `v1.0.0` test result from 3 months ago may not be comparable to a `v1.2.0` result today because the dataset has changed. Always tag versions.

### Using too-small datasets

A dataset of 5 items cannot reliably detect regressions. Statistical noise from LLM non-determinism will overwhelm any real signal. Aim for at least 30 items per category for meaningful evaluation.

### Not updating expected outputs when behavior changes

If you intentionally change your agent's behavior (e.g., a prompt update that makes answers more concise), update the expected outputs in your dataset. Otherwise, the old expected outputs will cause false regression alerts.

### Forgetting to validate after import

Imported datasets often have format issues: missing fields, type mismatches, encoding problems. Always run `agentbench dataset validate` after importing.

### CSV encoding issues

CSV files from Excel often have BOM (Byte Order Mark) characters or non-UTF-8 encoding. Use `--encoding utf-8` explicitly and clean your CSV files before importing:

```bash
# Detect encoding
file -I data.csv

# Convert to UTF-8
iconv -f WINDOWS-1252 -t UTF-8 data.csv > data-utf8.csv
```

---

## Next Steps

- [Testing OpenAI Agents](./testing-openai-agents.md) — Use datasets in your test suites
- [CI/CD Integration](./ci-cd-integration.md) — Run dataset-based tests in CI
- [Building Custom Judges](./custom-judges.md) — Evaluate dataset items with custom criteria

---

> [Back to Documentation Center](../INDEX.md)
