---
title: "Snapshot Testing for Agents"
description: "Capture complete agent state — prompts, tools, traces, and outputs — as versioned snapshots for regression testing."
targetAudience: "Developers familiar with Jest snapshots who want to apply the same pattern to AI agents"
readingTime: "6 min"
prerequisites:
  - "Familiarity with Jest snapshot testing"
  - "Understanding of Runs and Traces"
---

# Snapshot Testing for Agents

## Overview

AgentBench's snapshot testing is inspired by Jest's `toMatchSnapshot()` but designed for the unique challenges of AI agents. Where Jest snapshots capture rendered component output, AgentBench snapshots capture the complete agent state: the system prompt, model configuration, tools and their parameters, the input messages, the execution trace (every LLM response and tool call), environmental metadata, and the final output. This creates a comprehensive, version-controlled baseline that can be compared against future runs to detect regressions -- whether from prompt changes, model updates, tool modifications, or environment differences.

The snapshot system lives in `@agentbench/core` at `packages/core/src/snapshot/snapshot-manager.ts` and the type definitions at `packages/core/src/types/snapshot.ts`.

## What Snapshots Capture

A snapshot is a point-in-time record of everything needed to reproduce or compare an agent execution:

```typescript
interface SnapshotData {
  agent: {
    name: string                    // Human-readable agent name
    version?: string                // Agent version (e.g., "1.2.0")
    config: AgentConfig             // Full agent configuration
  }
  prompt: {
    system: string                  // System prompt text
    user?: string                   // User prompt text
    template?: string               // Prompt template (if parameterized)
    variables: Record<string, string> // Template variable values
  }
  model: {
    provider: string                // 'openai' | 'anthropic' | 'gemini' | ...
    name: string                    // Model name (e.g., 'gpt-4o')
    temperature: number
    maxTokens: number
    topP?: number
  }
  tools: Array<{                    // All available tools at snapshot time
    name: string
    description: string
    parameters: Record<string, unknown>
  }>
  context: {
    messages: Message[]             // Conversation history
    memory?: Record<string, unknown> // Agent memory state
    documents?: SnapshotDocument[]  // Retrieved documents (for RAG)
  }
  input: RunInput                   // Original input to the run
  options: RunOptions               // Execution options (timeout, maxSteps, retries, seed)
  execution?: ExecutionTrace        // Full trace of LLM and tool calls (optional)
  environment: {
    os: string                      // Operating system
    runtime: string                 // Runtime (e.g., "node v22.0.0")
    dependencies: Record<string, string> // Package versions
  }
}
```

This is significantly richer than a Jest snapshot because AI agent behavior depends on far more variables than a React component. A prompt change, a tool parameter tweak, or even a model update from the provider can alter agent behavior. Capturing the full context makes regression attribution possible.

## When to Use Snapshots vs Live Testing

| Scenario | Use Snapshots | Use Live Testing |
|---|---|---|
| CI regression testing on every commit | Yes -- fast, free, deterministic | No -- slow, expensive |
| Verifying that a prompt change did not break tool calls | Yes -- compare snapshots side by side | Maybe -- run both and compare |
| Measuring end-to-end quality with a new model | No -- snapshot of old model is irrelevant | Yes -- must run against the new model |
| Testing that a tool update preserves backward compatibility | Yes -- replay against old snapshot | Maybe -- complement with live testing |
| Checking language quality and tone | No -- snapshot cannot judge quality | Yes -- LLM judge needed |
| Freezing a known-good state as a golden baseline | Yes -- the primary use case | No |

## Creating Snapshots

### CLI

```bash
# Create a manual snapshot from a completed run
agentbench snapshot create --run <run-id> --name "baseline-v1.2.0" --type manual

# Create a snapshot with tags and description
agentbench snapshot create \
  --run <run-id> \
  --name "refund-flow-baseline" \
  --description "Known-good refund flow with GPT-4o, all assertions passing" \
  --tags "baseline,gpt-4o,refund,p0" \
  --type manual

# Auto-create a snapshot after a successful test run
agentbench test --project customer-support --snapshot-on-pass
```

### API

```bash
curl -X POST "http://localhost:3000/api/v1/projects/<project-id>/snapshots" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "baseline-v1.2.0",
    "type": "MANUAL",
    "runId": "<run-id>",
    "tags": ["baseline", "gpt-4o"]
  }'
```

### Programmatic

```typescript
import { captureSnapshotFromRun, buildSnapshotData } from '@agentbench/core'

// Capture from a completed run
const snapshotInput = captureSnapshotFromRun(
  runId,
  projectId,
  'refund-flow-baseline',
  runConfig,
  executionTrace,
  {
    description: 'Known-good refund flow',
    tags: ['baseline', 'p0'],
    type: 'manual',
  }
)

const snapshotData = buildSnapshotData(snapshotInput)

// Persist the snapshot
await agentbench.snapshots.create(snapshotInput)
```

## Snapshot Storage and Versioning

Snapshots are stored in `.agentbench/snapshots/` organized by project slug and snapshot ID:

```
.agentbench/snapshots/
  customer-support/
    snap_abc123/
      snapshot.json       # Full SnapshotData
    snap_def456/
      snapshot.json
    snap_ghi789/
      snapshot.json
  order-processing/
    snap_jkl012/
      snapshot.json
```

### Version Control

**Commit your snapshots.** They are small (typically 10-50 KB each) and are essential for CI and team collaboration:

```bash
# .gitignore — do NOT ignore snapshots
# Snapshots should be tracked:
# .agentbench/snapshots/   ← NOT in .gitignore

git add .agentbench/snapshots/
git commit -m "Add baseline snapshots for customer-support v1.2.0"
```

When a snapshot changes (e.g., you update the system prompt and re-record), the diff appears in your PR, giving reviewers visibility into exactly what changed:

```diff
- "system": "You are a customer support agent. Be helpful and polite."
+ "system": "You are a customer support agent. Be helpful, polite, and concise. Answer in 3 sentences or fewer."

- "temperature": 0.7
+ "temperature": 0.3
```

## Updating Snapshots

When you intentionally change agent behavior (new prompt, updated tool, different model), you need to update the corresponding snapshots:

```bash
# Update all snapshots for a project
agentbench snapshot update --project customer-support --all

# Update a specific snapshot
agentbench snapshot update --snapshot snap_abc123

# In CI, update snapshots flag fails the build if snapshots are out of date
agentbench test --project customer-support --update-snapshots
# If any snapshot comparison fails, the flag updates them AND reports the diff.
# Your CI can then commit the updated snapshots or fail the build for manual review.
```

### The `--update-snapshots` Flag

This flag behaves identically to Jest's `--updateSnapshot`:

- **Without the flag**: Snapshot mismatches are reported as test failures. Snapshots are never modified.
- **With the flag**: Snapshot mismatches cause the snapshot to be overwritten with the new value. The test passes if the snapshot update succeeds.

```bash
# CI: fail if snapshots are stale (no --update-snapshots)
agentbench test --project customer-support
# → FAIL: Snapshot "refund-baseline" no longer matches. Run with --update-snapshots to accept changes.

# Locally: accept new behavior as the new baseline
agentbench test --project customer-support --update-snapshots
# → PASS: Snapshot "refund-baseline" updated (1 change: prompt.system modified)
```

## What Happens When a Snapshot Comparison Fails

AgentBench's `compareSnapshots()` function detects changes across multiple dimensions:

```typescript
import { compareSnapshots } from '@agentbench/core'

const diff = compareSnapshots(previousSnapshot.data, currentSnapshot.data)

console.log(diff)
// {
//   identical: false,
//   changes: [
//     {
//       path: 'prompt.system',
//       type: 'modified',
//       description: 'System prompt changed',
//     },
//     {
//       path: 'model.name',
//       type: 'modified',
//       before: 'gpt-4o',
//       after: 'claude-sonnet-4-20250514',
//       description: 'Model changed: gpt-4o → claude-sonnet-4-20250514',
//     },
//     {
//       path: 'model.temperature',
//       type: 'modified',
//       before: 0.7,
//       after: 0.3,
//       description: 'Temperature changed: 0.7 → 0.3',
//     },
//     {
//       path: 'tools.send_email',
//       type: 'added',
//       description: 'Tool "send_email" added',
//     },
//     {
//       path: 'tools.lookup_order.parameters',
//       type: 'modified',
//       description: 'Tool "lookup_order" parameters changed',
//     },
//     {
//       path: 'options.timeout',
//       type: 'modified',
//       before: 30000,
//       after: 60000,
//       description: 'Timeout changed: 30000ms → 60000ms',
//     },
//   ],
//   summary: '6 change(s) detected',
// }
```

The comparison checks:
- System prompt text
- Model provider, name, temperature, max tokens
- Tools: additions, removals, parameter changes
- Message count changes
- Execution options (timeout, max steps)

## Snapshot Assertions

Use `.toMatchSnapshot()` to assert that an agent's output matches a previously stored snapshot:

```typescript
import { expect } from '@agentbench/core'

// Assert output matches the stored snapshot
await expect(runResult)
  .output().toMatchSnapshot('refund-baseline')
  .run()

// If the output has changed, the assertion fails with a diff:
// Expected output to match snapshot "refund-baseline"
// Diff:
// - "You can refund items within 30 days of purchase."
// + "Items can be returned within 30 days for a full refund."
```

## Restoring Runs from Snapshots

Snapshots can be used to recreate a run for re-evaluation or further testing:

```typescript
import { restoreConfigFromSnapshot } from '@agentbench/core'

// Restore the RunConfig from a snapshot
const restoredConfig = restoreConfigFromSnapshot(snapshot.data)

// The restored config has everything needed to re-run:
console.log(restoredConfig.name)         // "customer-support (replay)"
console.log(restoredConfig.agent.model)  // "gpt-4o"
console.log(restoredConfig.agent.systemPrompt) // "You are a customer support agent..."
console.log(restoredConfig.agent.tools)  // [{ name: 'search_docs', ... }]
console.log(restoredConfig.options.seed) // Original seed value

// Use this config to create a new run
const newRun = await agentbench.run(restoredConfig)
```

### CLI

```bash
# Restore a snapshot as a new run
agentbench snapshot restore snap_abc123

# Restore and immediately evaluate
agentbench snapshot restore snap_abc123 --evaluate --dimensions correctness,faithfulness
```

## Snapshot Lifecycle

```
1. Record baseline
   agentbench run --name "initial-baseline"
   agentbench snapshot create --run <run-id> --name "v1-baseline"

2. Make a change (new prompt, tool, model)
   Edit agent code/prompts/tools

3. Run tests against saved snapshot
   agentbench test --project my-project --snapshot v1-baseline

4a. If tests pass → no regression detected, proceed

4b. If tests fail → two options:
    a. The failure is expected (you changed behavior intentionally)
       → agentbench test --update-snapshots (accept new behavior as baseline)
    b. The failure is unexpected (you introduced a regression)
       → Debug the change, fix the regression, re-run tests
```

## Best Practices

### 1. Do not snapshot everything

A snapshot captures a LOT of state. If you snapshot every run, you will have hundreds of snapshots to review and maintain. Instead, snapshot strategically:

- **Golden paths**: The 5-10 most critical user flows
- **Regression-prone areas**: Flows that broke before
- **Baseline checkpoints**: Before major refactors or model migrations

### 2. Snapshot stable behaviors, not LLM outputs

The most valuable snapshots capture **configuration and tool contracts**, not the exact text output of an LLM. A snapshot comparison that fails because the LLM rephrased "Hello, how can I help?" to "Hi, what can I assist you with?" creates noise without signal.

Instead, focus snapshot assertions on:
- Tool calls made (deterministic within a trace)
- JSON-structured outputs (schema-constrained)
- Configuration (prompt, model, tools, options)
- Operational metrics (latency, tokens, cost within thresholds)

For free-text output quality, use LLM judge score assertions with tolerance bands, not snapshot matching.

### 3. Review snapshot diffs in PRs

When a PR changes a snapshot, the diff tells a story. Reviewers should ask:
- Was this prompt change intentional? Does it align with the PR description?
- Why was this tool added/removed? Is the tool actually available in production?
- Why did the model change? Is this a migration or an accident?
- Why did the timeout double? Is there a performance regression?

### 4. Tag and organize snapshots

Use tags to categorize snapshots for filtering and bulk operations:

```bash
agentbench snapshot create --run <id> --name "refund-happy-path" \
  --tags "baseline,gpt-4o,p0,refund,happy-path"

agentbench snapshot create --run <id> --name "refund-error-path" \
  --tags "baseline,gpt-4o,p1,refund,error-path"

# List only P0 snapshots
agentbench snapshot list --project customer-support --tag p0

# Update all GPT-4o snapshots after a model change
agentbench snapshot update --project customer-support --tag gpt-4o
```

### 5. Use snapshot types to distinguish purposes

AgentBench supports three snapshot types:

| Type | Purpose | Created By |
|---|---|---|
| `manual` | Developer-created baseline, intentionally preserved | CLI: `--type manual` |
| `auto` | Automatically captured after successful runs | `--snapshot-on-pass` |
| `ci` | Captured in CI pipelines as evidence | CI webhook |

Use `manual` for golden baselines you review and maintain. Use `ci` for traceability in regulated environments.

## Common Pitfalls

### "My snapshot is too large and changes on every run"

**Problem**: You snapshotted the entire execution trace including every LLM response, and it changes every time because the LLM rephrases.

**Solution**: Use `.toMatchSnapshot()` only for stable parts of the output (JSON-structured responses, tool call sequences). For variable text, use LLM judge score assertions. Consider creating configuration-only snapshots (without `execution`) for prompt/model/tool baseline tracking.

### "Snapshot restore fails because tools don't exist anymore"

**Problem**: You restored a snapshot that references tools since removed from your agent.

**Solution**: Before removing a tool, check for snapshots that reference it: `agentbench snapshot list --tool old_tool_name`. Either update those snapshots or accept that they will become historical artifacts.

### "I have 50 snapshot diffs in my PR and can't tell what's meaningful"

**Problem**: You ran `--update-snapshots` without reviewing what changed, and now the PR shows 50 snapshot files modified.

**Solution**: Always review snapshot diffs BEFORE updating. Run without `--update-snapshots` first to see what would fail. Only update the snapshots whose changes you intentionally made. Consider splitting large changes into smaller PRs.

### "Snapshots give a false sense of security"

**Problem**: All snapshots pass, so the team assumes the agent is working correctly.

**Solution**: Snapshots verify that nothing CHANGED, not that the thing is CORRECT. If your baseline snapshot was wrong to begin with, passing snapshot comparisons just confirm the error is consistent. Always pair snapshots with:
1. LLM judge evaluations (is the answer actually correct?)
2. Rule-based assertions (did the agent follow the expected workflow?)
3. Periodic manual review of baseline quality

## Next Steps

- **[How Deterministic Replay Works](./replay.md)** -- replay runs from snapshots at zero cost
- **[The Assertion Model](./assertions.md)** -- learn about `.toMatchSnapshot()` and other assertions
- **[Dealing with LLM Non-Determinism](./non-determinism.md)** -- understand why snapshots are essential for taming LLM variability
