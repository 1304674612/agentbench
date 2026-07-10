# OpenAI Agents SDK - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/openai-agent-sdk && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   OpenAI Agents SDK Pipeline                       │
│                                                                  │
│  ┌──────────────┐                                                │
│  │  User Input   │                                               │
│  └──────┬───────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────┐                        │
│  │        Input Guardrail                │                       │
│  │  - content filter                     │                       │
│  │  - PII detection                      │                       │
│  │  - prompt injection check             │                       │
│  └──────────┬───────────────────────────┘                        │
│             │ pass/block                                         │
│             ▼                                                    │
│  ┌──────────────────────────────────────┐                        │
│  │        Main Agent (GPT-4o)            │                       │
│  │  - tool use (calculator, search)      │                       │
│  │  - handoff decisions                  │                       │
│  └──────────┬───────────────────────────┘                        │
│             │                                                    │
│     ┌───────┼───────────┐                                       │
│     ▼       ▼           ▼                                       │
│  ┌──────┐ ┌──────┐ ┌──────────┐                                 │
│  │ Tool │ │Tool  │ │ Handoff   │                                │
│  │ Calc │ │Search│ │ Specialist│                                │
│  └──┬───┘ └──┬───┘ └────┬─────┘                                 │
│     │        │          │                                        │
│     └────────┼──────────┘                                        │
│              ▼                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │        Output Guardrail               │                       │
│  │  - factuality check                   │                       │
│  │  - output format validation           │                       │
│  └──────────┬───────────────────────────┘                        │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────────────────────┐                        │
│  │        Traced Response                │                       │
│  │  (with full span hierarchy)           │                       │
│  └──────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `guardrail-enforcement.test.ts` | Input guardrails block unsafe content and PII; output guardrails catch hallucinations | `guardrail('input').toBeTriggered()`, `guardrail('output').toBeTriggered()` |
| `handoff-logic.test.ts` | Agent correctly hands off to specialist agents when the task requires it | `handoff().toBeCalled()`, `handoff('specialist').toBeCalled()` |
| `tool-use.test.ts` | Agent correctly invokes calculator and search tools for appropriate queries | `tool('calculator').toBeCalled()`, `tool('web_search').toBeCalled()` |
| `tracing.test.ts` | Full span hierarchy is recorded across guardrails, agent, tools, and handoffs | `trace().spans().toBeGreaterThan(5)`, `trace('guardrail').toBePresent()` |

## Running Individual Tests

```bash
agentbench test --suite "guardrail-enforcement"
agentbench test --grep "handoff"
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
Running: Guardrail Enforcement ... ✓ 4/4 passed (3200ms)
Running: Handoff Logic ... ✓ 3/3 passed (4100ms)
Running: Tool Use ... ✓ 4/4 passed (2980ms)
Running: Tracing ... ✓ 3/3 passed (2500ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
openai-agent-sdk/
├── package.json                      # Package config
├── agentbench.config.ts              # AgentBench project configuration
├── .env.example                      # Environment variable template
├── README.md                         # This file
├── src/
│   ├── agent.ts                      # Main agent with guardrails + handoffs
│   ├── guardrails/
│   │   ├── input-guardrails.ts       # Content filter, PII detection, injection check
│   │   └── output-guardrails.ts      # Factuality check, format validation
│   ├── handoffs/
│   │   └── specialist.ts             # Specialist agent for domain-specific tasks
│   └── tools.ts                      # Calculator and search tool definitions
├── tests/
│   ├── guardrail-enforcement.test.ts # Input/output guardrail verification
│   ├── handoff-logic.test.ts         # Agent-to-specialist handoff tests
│   ├── tool-use.test.ts              # Tool invocation accuracy
│   └── tracing.test.ts               # Span hierarchy and trace completeness
└── dataset/
    └── prompts.jsonl                 # Prompts covering safe, unsafe, and handoff scenarios
```

## Key Takeaways

1. **Guardrails are your first line of defense.** Test both input (block) and output (validate) guardrails.
2. **Handoffs must be traceable.** Every handoff should create a child span so you can see the full decision path.
3. **Tool selection is a routing problem.** The agent should use `calculator` for math queries and `web_search` for factual queries -- test that it chooses correctly.
4. **Tracing is critical for debugging agent loops.** Assert on span count and hierarchy to catch infinite loops or missing spans.
5. **Guardrails should fail closed.** When unsure, block -- never let questionable content through silently.
