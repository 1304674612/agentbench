# Customer Support Agent

A production-grade customer support AI agent tested with AgentBench. Handles greetings, refund policies, escalations, and multi-turn conversations with tool-augmented responses.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run all tests
pnpm test

# Run a single test suite
agentbench test --project customer-support --suite tests/greeting.test.ts
```

## Architecture

```
Customer Message
    │
    ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Support Agent        │────▶│  search_knowledge_base │──▶ KB Results
│  (gpt-4o)             │────▶│  check_order_status    │──▶ Order Data
│                       │────▶│  escalate_to_human     │──▶ Ticket Created
└──────────────────────┘     └──────────────────────┘
    │
    ▼
  Professional Response
  (or escalation ticket)
```

## What This Tests

| Test Suite | What It Verifies | Key Assertions |
|---|---|---|
| `greeting.test.ts` | Agent responds professionally to "Hello" | `status().toBeCompleted()`, `output().toContain('hello')` |
| `refund-policy.test.ts` | Agent looks up and accurately explains the 30-day refund policy | `tool('search_knowledge_base').toBeCalled()`, `output().toContain('refund')`, `score('correctness').toBeGreaterThan(7)` |
| `escalation.test.ts` | Agent escalates sensitive requests to human, does not fabricate | `tool('escalate_to_human').toBeCalled()`, `output().not.toMatchRegex(/article|section/)` |
| `multi-turn.test.ts` | Agent maintains context across 3 conversation turns | `tool('check_order_status').toBeCalled()`, `tokens().toBeLessThan(3000)` |

## Running

```bash
# Run all test suites
agentbench run --project customer-support

# Run specific suite
agentbench test --project customer-support --suite tests/escalation.test.ts

# With custom model
agentbench run --project customer-support --model gpt-4o --temperature 0.1
```

## Replay

```bash
# Replay from a trace
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
# .github/workflows/agentbench.yml
- name: Run Customer Support Tests
  run: pnpm test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
Running: Greeting ... ✓ 5/5 passed (1245ms)
Running: Refund Policy ... ✓ 5/5 passed (1876ms)
Running: Escalation ... ✓ 3/3 passed (1543ms)
Running: Multi-Turn ... ✓ 5/5 passed (2412ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
customer-support-agent/
├── package.json              # Package config with test/run scripts
├── agentbench.config.ts      # AgentBench project configuration
├── agent.ts                  # Agent implementation with 3 tools
├── .env.example              # Environment variable template
├── README.md                 # This file
└── tests/
    ├── greeting.test.ts      # Basic greeting test
    ├── refund-policy.test.ts # Policy accuracy test
    ├── escalation.test.ts    # Escalation behavior test
    └── multi-turn.test.ts    # Multi-turn conversation test
```

## Key Takeaways

- **Tool-using agents need tool-call assertions.** `tool().toBeCalled()` and `tool().not.toBeCalled()` verify correct routing.
- **Use `any([...])` for flexible matching.** LLMs rephrase — don't assert on exact strings.
- **Hallucination prevention is testable.** Regex patterns like `/article \d+|section \d+\.\d+/` catch fabricated specifics.
- **Token budgets catch cost regressions.** `tokens().toBeLessThan(N)` runs cheaply and catches prompt bloat.
- **LLM-as-judge fills the gap.** `score('correctness').toBeGreaterThan(7)` evaluates semantic quality regex can't catch.
