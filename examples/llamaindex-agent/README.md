# LlamaIndex Agent - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/llamaindex-agent && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      LlamaIndex Agent                             │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────┐                      │
│  │  User Query   │ --> │  Query Engine    │                      │
│  │  (natural     │     │  - embedding     │                      │
│  │   language)   │     │  - retrieval     │                      │
│  └──────────────┘     │  - synthesis     │                      │
│                       └────────┬─────────┘                      │
│                                │                                 │
│  ┌──────────────┐     ┌────────▼─────────┐                      │
│  │  Chat History │ <-> │  Chat Engine     │                      │
│  │  (multi-turn) │     │  - context mgmt  │                      │
│  │              │     │  - tool calling  │                      │
│  └──────────────┘     └────────┬─────────┘                      │
│                                │                                 │
│                       ┌────────▼─────────┐                      │
│                       │  Document Index   │                      │
│                       │  (vector store)   │                      │
│                       └──────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `query-quality.test.ts` | Query engine retrieves relevant documents and synthesizes accurate answers | `output().toContain()`, `score('relevance').toBeGreaterThan(7)` |
| `chat-context.test.ts` | Chat engine maintains context across multiple conversation turns | `output().toMatchRegex()`, `context('history').length().toBeGreaterThan(0)` |
| `tool-integration.test.ts` | Agent correctly invokes tools alongside retrieval (calculator, search) | `tool().toBeCalled()`, `output().toContain()` |
| `index-quality.test.ts` | Indexing pipeline correctly chunks and embeds documents for retrieval | `score('retrieval').toBeGreaterThan(7)`, `tokens().toBeLessThan(5000)` |

## Running Individual Tests

```bash
agentbench test --suite "query-quality"
agentbench test --grep "chat-context"
```

## Replay (Zero-Cost Testing)

```bash
agentbench test --replay
```

## Compare Mode

```bash
agentbench compare --baseline last-good-run
```

## CI Integration

This example includes `.github/workflows/agentbench.yml`.

## Expected Output

```
Running: Query Quality ... ✓ 4/4 passed (4321ms)
Running: Chat Context ... ✓ 3/3 passed (5100ms)
Running: Tool Integration ... ✓ 3/3 passed (3876ms)
Running: Index Quality ... ✓ 4/4 passed (2980ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
llamaindex-agent/
├── package.json                    # Package config
├── agentbench.config.ts            # AgentBench project configuration
├── .env.example                    # Environment variable template
├── README.md                       # This file
├── src/
│   ├── agent.ts                    # LlamaIndex agent entry point
│   ├── query-engine.ts             # Query engine (embedding + retrieval + synthesis)
│   ├── chat-engine.ts              # Chat engine with multi-turn context
│   ├── index.ts                    # Document indexing and vector store pipeline
│   └── tools.ts                    # Integrated tool definitions
├── tests/
│   ├── query-quality.test.ts       # End-to-end Q&A accuracy
│   ├── chat-context.test.ts        # Multi-turn conversation memory
│   ├── tool-integration.test.ts    # Retrieval + external tools
│   └── index-quality.test.ts       # Indexing and chunking quality
└── dataset/
    └── documents/                  # Source documents for indexing
```

## Key Takeaways

1. **Query engine and chat engine need different tests.** Query engine tests one-shot accuracy; chat engine tests context persistence.
2. **Index quality is a prerequisite for retrieval quality.** If the index chunks poorly, no LLM can salvage the answers.
3. **Tool integration tests verify the agent knows when to retrieve vs. when to use tools.** Not every query needs the index.
4. **Chat context tests should include topic shifts.** Verify the agent follows when the user changes the subject.
5. **Use overlapping document sets.** Test that the index handles semantically similar documents without confusion.
