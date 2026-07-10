# Complex Multi-Agent Orchestration - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/multi-agent-workflow && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Multi-Agent Orchestration System                    │
│                                                                      │
│                        ┌──────────────┐                              │
│                        │  Coordinator │                              │
│                        │  (GPT-4o)    │                              │
│                        │  routes,     │                              │
│                        │  monitors,   │                              │
│                        │  resolves    │                              │
│                        └──┬───┬───┬──┘                              │
│                           │   │   │                                  │
│              ┌────────────┘   │   └────────────┐                    │
│              ▼                ▼                ▼                    │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐               │
│     │ Researcher  │   │  Writer     │   │  Reviewer   │              │
│     │ (GPT-4o)   │   │ (GPT-4o)   │   │ (GPT-4o)   │               │
│     │             │   │             │   │             │               │
│     │ web_search  │   │ compose     │   │ critique    │               │
│     │ fetch_pages │   │ draft       │   │ score       │               │
│     │ summarize   │   │ restructure │   │ approve     │               │
│     └─────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
│           │                 │                  │                      │
│           └────────┬────────┘                  │                      │
│                    │ consensus check            │                      │
│                    ▼                            ▼                      │
│              ┌──────────────┐          ┌──────────────┐              │
│              │   Consensus  │          │  Failure      │              │
│              │   Reached?   │── no ──>│  Recovery     │              │
│              └──────┬───────┘          │  (retry/      │              │
│                     │ yes              │  reassign)    │              │
│                     ▼                  └──────────────┘              │
│              ┌──────────────┐                                        │
│              │  Final Output │                                        │
│              └──────────────┘                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `orchestration.test.ts` | Coordinator correctly routes tasks to the right agents | `tool('assign_task').toBeCalled()`, `tool().toBeCalledInOrder()` |
| `handoff.test.ts` | Tasks flow between agents without data loss or duplication | `state('task').toEqual()`, `output().toMatchRegex()` |
| `consensus.test.ts` | Multiple agents reach agreement before final output is produced | `score('agreement').toBeGreaterThan(7)`, `tool().toBeCalledTimes({ min: 3 })` |
| `concurrency.test.ts` | Parallel agent execution completes correctly without race conditions | `tool().toBeCalledConcurrently()`, `latency().toBeLessThan(15000)` |
| `failure-recovery.test.ts` | System recovers when an agent fails -- retry or reassign | `status().toBeCompleted()`, `tool('reassign').toBeCalled()` |

## Running Individual Tests

```bash
agentbench test --suite "orchestration"
agentbench test --grep "failure-recovery"
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
Running: Orchestration ... ✓ 4/4 passed (5600ms)
Running: Handoff ... ✓ 3/3 passed (4800ms)
Running: Consensus ... ✓ 4/4 passed (7200ms)
Running: Concurrency ... ✓ 3/3 passed (8900ms)
Running: Failure Recovery ... ✓ 3/3 passed (6500ms)

Summary:
  ✓ 5 passed
  Total: 5 test(s)
```

## File Structure

```
multi-agent-workflow/
├── package.json                      # Package config
├── agentbench.config.ts              # AgentBench project configuration
├── .env.example                      # Environment variable template
├── README.md                         # This file
├── src/
│   ├── agent.ts                      # Orchestration entry point
│   ├── orchestrator.ts               # Coordinator agent + routing logic
│   ├── agents/
│   │   ├── researcher.ts             # Researcher agent (search, fetch, summarize)
│   │   ├── writer.ts                 # Writer agent (compose, draft, restructure)
│   │   └── reviewer.ts               # Reviewer agent (critique, score, approve)
│   ├── consensus.ts                  # Consensus protocol implementation
│   └── recovery.ts                   # Failure detection and recovery logic
├── tests/
│   ├── orchestration.test.ts         # Task routing verification
│   ├── handoff.test.ts               # Inter-agent data flow
│   ├── consensus.test.ts             # Multi-agent agreement verification
│   ├── concurrency.test.ts           # Parallel execution safety
│   └── failure-recovery.test.ts      # Agent failure and recovery
└── dataset/
    └── scenarios.jsonl               # Multi-agent task scenarios with expected outcomes
```

## Key Takeaways

1. **The Coordinator is the single point of failure.** Test its failure recovery first.
2. **Handoff tests must verify data integrity.** Agents can transform (or corrupt) data during handoffs.
3. **Consensus requires a defined protocol.** Test both "all agree" and "disagreement" paths.
4. **Concurrency bugs are timing-dependent.** Run concurrent tests multiple times and assert on invariants, not exact ordering.
5. **Failure recovery should be graceful.** The system must complete (possibly degraded) even when an agent crashes.
