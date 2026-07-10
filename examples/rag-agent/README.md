# RAG Agent — Retrieval-Augmented Generation

A production-grade RAG (Retrieval-Augmented Generation) agent tested with AgentBench. Demonstrates embedding-based retrieval, document chunking, grounding verification, context window management, and latency budgeting.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run all tests
pnpm test

# Run a single test suite
agentbench test --project rag-agent --suite tests/grounding.test.ts
```

## Architecture

```
User Query
    │
    ▼
┌─────────────┐     ┌──────────────────┐
│  RAG Agent  │────▶│  Retriever Tool  │
│  (OpenAI)   │     │  (TF-IDF mock)   │
└─────────────┘     └──────────────────┘
    │                       │
    │              ┌────────▼────────┐
    │              │  Document Store  │
    │              │  (3 docs,        │
    │              │   chunked)       │
    │              └────────┬────────┘
    │                       │
    ▼                       ▼
  Answer            Scored Chunks
  (grounded,        (top-k)
   cited)
```

## What This Tests

| Test Suite | What It Verifies |
|---|---|
| `retrieval-quality.test.ts` | Retriever returns relevant chunks for queries; scoring quality |
| `grounding.test.ts` | Agent bases answers on retrieved docs; handles out-of-domain queries |
| `context-window.test.ts` | Agent handles large and minimal retrieval windows without errors |
| `latency-budget.test.ts` | Combined retrieval + LLM latency stays within defined budgets |

## Dataset

- `dataset/documents/` — 3 markdown documents (Tesla safety, Python 3.13, Kubernetes v1.30)
- `dataset/queries.csv` — 20 test queries covering all document topics

## Running

```bash
# Run all test suites
agentbench run --project rag-agent

# Run specific suite
agentbench test --project rag-agent --suite tests/grounding.test.ts

# With custom model
agentbench run --project rag-agent --model gpt-4o --temperature 0.1
```

## Replay

```bash
# Replay from a trace
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
# .github/workflows/agentbench.yml
- name: Run RAG Agent Tests
  run: pnpm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
✓ retrieval-quality.test.ts — 3/3 passed
✓ grounding.test.ts — 3/3 passed
✓ context-window.test.ts — 2/2 passed
✓ latency-budget.test.ts — 2/2 passed
```

## Key Takeaways

- RAG agents must be tested for both retrieval quality AND answer grounding
- Context window tests catch retrieval-size-related failures
- Latency budgets are critical for production RAG pipelines
- The retriever is deterministic and testable in isolation
