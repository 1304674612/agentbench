# Text-to-SQL Agent - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/sql-agent && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Text-to-SQL Agent                         │
│                                                              │
│  ┌──────────────┐     ┌──────────────────┐                  │
│  │ NL Question   │ --> │  Agent (GPT-4o)  │                  │
│  │ "Show all     │     │  temp=0.1        │                  │
│  │  customers    │     │  maxTokens=2048  │                  │
│  │  from the US" │     └────────┬─────────┘                  │
│  └──────────────┘              │                             │
│                                │                             │
│            ┌───────────────────┼───────────────────┐        │
│            ▼                   ▼                   ▼        │
│  ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐   │
│  │ get_schema      │ │ run_query    │ │ Security Check  │   │
│  │ tool            │ │ tool         │ │ (injection      │   │
│  │                 │ │              │ │  prevention)    │   │
│  │ SELECT cols,    │ │ In-memory    │ │                 │   │
│  │ types, FKs      │ │ SQL Executor │ │ Read-only       │   │
│  │ from schema.ts  │ │              │ │ validation      │   │
│  └─────────────────┘ └──────┬───────┘ └─────────────────┘   │
│                             │                                │
│                             ▼                                │
│                    ┌─────────────────┐                       │
│                    │ Structured      │                       │
│                    │ Output:         │                       │
│                    │ SQL: <query>    │                       │
│                    │ EXPLANATION: .. │                       │
│                    └─────────────────┘                       │
│                                                              │
│  Schema: customers, products, categories, orders,           │
│          order_items (e-commerce database)                   │
└──────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `select-queries.test.ts` | Agent generates correct SELECT queries with WHERE filters for single-table queries | `tool('get_schema').toBeCalled()`, `tool('run_query').toBeCalled()`, `output().toContain()` |
| `join-queries.test.ts` | Agent writes JOIN queries across orders, order_items, and products tables with correct ON conditions | `tool('run_query').toBeCalled()`, `output().toMatchRegex(/.{100,}/)` |
| `aggregation.test.ts` | Agent uses COUNT, SUM, GROUP BY, and ORDER BY correctly | `tool('run_query').toBeCalled()`, `output().toMatchRegex()` |
| `sql-injection.test.ts` | Agent rejects or sanitizes malicious inputs (DROP, UNION injection, OR 1=1) | `output().not.toMatchRegex(/DROP|DELETE|UNION/)` |
| `schema-awareness.test.ts` | Agent only references tables and columns that exist in the provided schema | `tool('get_schema').toBeCalled()`, `output().not.toMatchRegex(/non_existent/)` |

## Dataset

- `dataset/schema.sql` -- E-commerce database DDL (5 tables with indexes, foreign keys)
- `dataset/seed.sql` -- Seed data: 8 customers, 5 categories, 12 products, 10 orders, 15 order items

## Running Individual Tests

```bash
agentbench test --suite "select-queries"
agentbench test --grep "injection"
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
Running: Select Queries ... ✓ 4/4 passed (2340ms)
Running: Join Queries ... ✓ 4/4 passed (3120ms)
Running: Aggregation ... ✓ 6/6 passed (2980ms)
Running: SQL Injection ... ✓ 3/3 passed (2100ms)
Running: Schema Awareness ... ✓ 4/4 passed (2560ms)

Summary:
  ✓ 5 passed
  Total: 5 test(s)
```

## File Structure

```
sql-agent/
├── package.json                    # Package config (example-sql-agent)
├── agentbench.config.ts            # AgentBench project configuration
├── .env.example                    # Environment variable template (OPENAI_API_KEY)
├── README.md                       # This file
├── src/
│   ├── agent.ts                    # SQL agent implementation with structured output parsing
│   ├── db-schema.ts                # Schema definition + formatting + table name validation
│   └── query-engine.ts             # In-memory SQL executor with security validators
├── tests/
│   ├── select.test.ts              # SELECT + WHERE filter tests (2 cases)
│   ├── join.test.ts                # Multi-table JOIN tests (2 cases)
│   ├── aggregation.test.ts         # COUNT, SUM, GROUP BY, ORDER BY tests (3 cases)
│   ├── sql-injection.test.ts       # Injection prevention verification
│   └── schema-awareness.test.ts    # Schema-boundary awareness tests
└── dataset/
    ├── schema.sql                  # DDL for customers, products, categories, orders, order_items
    └── seed.sql                    # Realistic e-commerce seed data
```

## Key Takeaways

1. **Schema awareness is the foundation.** Always test that the agent reads the schema before generating queries.
2. **SQL injection prevention must be tested explicitly.** Pass malicious inputs and verify the agent refuses or sanitizes them.
3. **Structured output parsing is fragile.** Use regex assertions to verify the `SQL:` and `EXPLANATION:` fields are present and well-formed.
4. **Aggregation tests need numeric precision tolerance.** Use `toMatchRegex(/\d+\.\d+/)` rather than exact string matching for SUM/AVG results.
5. **The query engine is deterministic.** Test the executor in isolation (unit tests) before integrating with the LLM agent.
