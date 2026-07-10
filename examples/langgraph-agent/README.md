# LangGraph Agent — State Graph Workflow

A LangGraph-style agent with a 5-node state graph, conditional edge routing, state transition tracking, and human-in-the-loop approval workflows.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run all tests
pnpm test
```

## Architecture

```
START
  │
  ▼
[classify] ── classify intent (QA, summarization, code, etc.)
  │
  ▼
[retrieve] ── fetch relevant context from knowledge base
  │
  ▼
[reason] ──── analyze and plan response
  │
  ▼
[generate] ◄─────────────────────────────┐
  │                                       │
  ▼                                       │
[validate] ── pass ──────────▶ END        │
  │  │                                    │
  │  ├── needs_revision ──────────────────┘
  │  │
  │  ├── needs_human ──▶ [human_review] ──▶ END
  │  │
  │  └── fail ──────────▶ [fallback] ─────▶ END
```

## State Schema

The workflow state tracks:
- `intent` — Classified user intent (question_answering, summarization, etc.)
- `confidence` — Classification confidence score
- `retrievedContext` — Context items from the RETRIEVE node
- `reasoning` — Analysis from the REASON node
- `generatedResponse` — Final response from GENERATE
- `validation` — Quality check result (pass/needs_revision/needs_human/fail)
- `humanReviewRequired` — Whether human approval is needed
- `nodeTraversalPath` — Ordered list of visited nodes
- `messages` — Full conversational history

## Nodes

| Node | Description |
|---|---|
| `classifyNode` | Pattern-match intent classification (5 patterns + fallback) |
| `retrieveNode` | Intent-specific context retrieval from knowledge base |
| `reasonNode` | Analysis and response planning |
| `generateNode` | Intent-specific response generation |
| `validateNode` | Quality check with conditional routing |
| `humanReviewNode` | Simulated human approval/rejection |
| `fallbackNode` | Graceful failure handling |

## What This Tests

| Test Suite | What It Verifies |
|---|---|
| `workflow-paths.test.ts` | Correct path traversal for QA, code, and summarization intents |
| `state-transitions.test.ts` | State fields populated correctly at each stage |
| `conditional-edges.test.ts` | Need-revision routes to generate, need-human routes to review |
| `human-in-loop.test.ts` | Approval completes workflow; rejection routes to revision |

## Dataset

- `dataset/graph-scenarios.json` — 15 scenarios covering all intents and edge cases

## Running

```bash
# Run all test suites
agentbench run --project langgraph-agent

# Run specific suite
agentbench test --project langgraph-agent --suite tests/conditional-edges.test.ts
```

## Replay

```bash
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
- name: Run LangGraph Agent Tests
  run: pnpm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
✓ workflow-paths.test.ts — 3/3 passed
✓ state-transitions.test.ts — 3/3 passed
✓ conditional-edges.test.ts — 3/3 passed
✓ human-in-loop.test.ts — 3/3 passed
```

## Key Takeaways

- State graph pattern enables deterministic, testable agent workflows
- Conditional edges handle branching logic without complex if/else chains
- State transitions are fully inspectable for debugging
- Human-in-the-loop is a critical pattern for high-stakes agent outputs
- Each node is a pure function making unit testing straightforward
