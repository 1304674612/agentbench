# Tool-Calling Agent — Multi-Tool Orchestration

A production-grade agent with 8 tools tested for correct selection, parallel execution, ordering, error handling, and schema adherence.

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
User Request
    │
    ▼
┌──────────────────┐
│  Tool-Calling    │
│  Agent (OpenAI)  │
└──────────────────┘
    │
    ├──▶ get_weather(city, units?)
    ├──▶ calculator(expression)
    ├──▶ search_docs(query, maxResults?)
    ├──▶ query_database(sql)
    ├──▶ send_email(to, subject, body)
    ├──▶ check_calendar(date?, days?)
    ├──▶ translate_text(text, targetLanguage)
    └──▶ read_file(path)
```

## Tool Catalog

| Tool | Description | Key Parameters |
|---|---|---|
| `get_weather` | Current weather by city | city (required), units |
| `calculator` | Safe math evaluation | expression (required) |
| `search_docs` | Documentation search | query (required), maxResults |
| `query_database` | Read-only SQL queries | sql (required) |
| `send_email` | Send emails | to, subject, body (all required) |
| `check_calendar` | Calendar event lookup | date, days |
| `translate_text` | Language translation | text, targetLanguage (required) |
| `read_file` | File system access | path (required) |

## What This Tests

| Test Suite | What It Verifies |
|---|---|
| `tool-selection.test.ts` | Correct tool chosen for weather, math, and translation requests |
| `parallel-tools.test.ts` | Multiple independent tools called in parallel for compound requests |
| `tool-ordering.test.ts` | Dependent tools called in correct sequence (read then act) |
| `error-handling.test.ts` | Invalid inputs, missing files, unsupported capabilities handled gracefully |
| `tool-schema-adherence.test.ts` | Correct argument schemas passed to tools |

## Dataset

- `dataset/scenarios.json` — 20 scenarios covering simple, parallel, sequential, error, and edge cases

## Running

```bash
# Run all test suites
agentbench run --project tool-calling-agent

# Run specific suite
agentbench test --project tool-calling-agent --suite tests/error-handling.test.ts
```

## Replay

```bash
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
- name: Run Tool-Calling Agent Tests
  run: pnpm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
✓ tool-selection.test.ts — 3/3 passed
✓ parallel-tools.test.ts — 3/3 passed
✓ tool-ordering.test.ts — 3/3 passed
✓ error-handling.test.ts — 3/3 passed
✓ tool-schema-adherence.test.ts — 3/3 passed
```

## Key Takeaways

- Tool selection tests verify the agent maps requests to correct tools
- Parallel execution tests ensure no unnecessary serialization
- Ordering tests catch dependency violations between tools
- Error handling is critical for production agents — every tool call can fail
- Schema adherence prevents malformed tool calls from reaching production
