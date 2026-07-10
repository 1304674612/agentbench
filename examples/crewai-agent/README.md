# CrewAI Multi-Agent - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/crewai-agent && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    CrewAI Multi-Agent System                  │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │Researcher │ -> │  Writer   │ -> │ Reviewer  │              │
│  │ (GPT-4o)  │    │ (GPT-4o)  │    │ (GPT-4o)  │              │
│  │ search,   │    │ compose,  │    │ critique, │              │
│  │ analyze   │    │ draft     │    │ approve   │              │
│  └──────────┘    └──────────┘    └──────────┘               │
│       │               │               │                      │
│       ▼               ▼               ▼                      │
│   Research       Draft Article    Reviewed Article           │
│   Findings       (delegated)      (quality-checked)          │
└──────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `task-completion.test.ts` | All agents complete their assigned tasks within the workflow | `status().toBeCompleted()` |
| `delegation.test.ts` | Researcher correctly delegates writing to the Writer agent | `tool('delegate_to_writer').toBeCalled()` |
| `sequential-workflow.test.ts` | Agents execute in correct order: research -> write -> review | `tool().toBeCalledInOrder()`, `latency().toBeLessThan()` |
| `output-quality.test.ts` | Final output meets quality bar (factual, well-structured) | `score('quality').toBeGreaterThan(7)`, `output().toMatchRegex()` |

## Running Individual Tests

```bash
agentbench test --suite "task-completion"
agentbench test --grep "delegation"
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
Running: Task Completion ... ✓ 3/3 passed (4521ms)
Running: Delegation ... ✓ 4/4 passed (3890ms)
Running: Sequential Workflow ... ✓ 3/3 passed (5123ms)
Running: Output Quality ... ✓ 4/4 passed (6012ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
crewai-agent/
├── package.json                    # Package config
├── agentbench.config.ts            # AgentBench project configuration
├── .env.example                    # Environment variable template
├── README.md                       # This file
├── src/
│   ├── agent.ts                    # CrewAI orchestration entry point
│   ├── agents/
│   │   ├── researcher.ts           # Researcher agent definition
│   │   ├── writer.ts               # Writer agent definition
│   │   └── reviewer.ts             # Reviewer agent definition
│   └── tools.ts                    # Shared tool definitions
├── tests/
│   ├── task-completion.test.ts     # End-to-end workflow completion
│   ├── delegation.test.ts          # Inter-agent delegation
│   ├── sequential-workflow.test.ts # Correct execution ordering
│   └── output-quality.test.ts      # Final article quality evaluation
└── dataset/
    └── topics.jsonl                # Research topics with expected coverage
```

## Key Takeaways

1. **Test delegation explicitly.** Multi-agent systems fail silently when agents skip handoffs.
2. **Order matters in sequential workflows.** Use `toBeCalledInOrder()` to verify the research->write->review sequence.
3. **Output quality needs an LLM judge.** Use `score('quality')` to assess coherence, factual accuracy, and structure.
4. **Each agent is testable independently.** Mock downstream agents to isolate the Researcher, Writer, or Reviewer.
5. **Latency budgets compound with multiple agents.** Set realistic timeouts for multi-agent pipelines.
