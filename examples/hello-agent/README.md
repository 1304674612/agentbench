# Hello Agent — Minimal Starter Example

The simplest possible AgentBench project. A single-turn chat agent with no tools, no multi-step reasoning, and no external dependencies beyond the OpenAI API. Use this as your template to bootstrap a new agent evaluation project.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│  User Input  │ --> │  Hello Agent    │ --> │   Response   │
│  (message)   │     │  (gpt-4o-mini)  │     │  (assertions)│
└──────────────┘     └─────────────────┘     └──────────────┘
```

## What This Tests

| Category | Assertions | Why It Matters |
|----------|-----------|----------------|
| **Completion** | `status().toBeCompleted()` | Agent runs without crashing or timing out |
| **Output quality** | `output().toContain(...)` | Response is relevant and correct |
| **Token efficiency** | `tokens().toBeLessThan(N)` | Costs stay within budget |
| **Latency** | `latency().toBeLessThan(ms)` | Response time meets SLA |
| **Consistency** | Repeated runs at temp=0 | Agent is deterministic enough for CI |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — add your OPENAI_API_KEY

# 3. Run tests
pnpm test
```

## Replay

```bash
# Replay the last test run with tracing
agentbench replay --project hello-agent --trace latest
```

## CI Integration

```yaml
# .github/workflows/agent-evals.yml
- name: Run Hello Agent Tests
  run: pnpm --filter example-hello-agent test
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Expected Output

```
Running: Greeting ... ✓ 5/5 passed (845ms)
Running: Factual ... ✓ 6/6 passed (1234ms)
Running: Replay ... ✓ 4/4 passed (2103ms)

Summary:
  ✓ 3 passed
  Total: 3 test(s)
```

## File Structure

```
hello-agent/
├── package.json              # Package config with test/run scripts
├── agentbench.config.ts      # AgentBench project configuration
├── .env.example              # Environment variable template
├── README.md                 # This file
├── src/
│   └── agent.ts              # Agent implementation (single-turn chat)
├── tests/
│   ├── greeting.test.ts      # Basic greeting test (1 case)
│   ├── factual.test.ts       # Factual accuracy tests (2 cases)
│   └── replay.test.ts        # Deterministic replay tests (2 cases)
└── dataset/
    └── queries.csv           # 10 benchmark queries with expected answers
```

## Key Takeaways

1. **Start simple.** A single `expect().status().toBeCompleted()` is a valid first test.
2. **Use `any([...])` for fuzzy matching.** LLMs rephrase — assertions should be flexible.
3. **Set temperature=0 for replay tests.** Deterministic evals are essential for CI.
4. **Watch tokens.** Budget `tokens().toBeLessThan()` early to catch cost regressions.
5. **Keep system prompts concise.** Long prompts increase token cost and reduce reliability.

## Customizing for Your Own Agent

1. Replace the system prompt in `src/agent.ts` with your own instructions.
2. Change `model` in `agentbench.config.ts` to your preferred model.
3. Add tools by extending the `tools` array and implementing handlers.
4. Write test suites that reflect your agent's specific responsibilities.
5. Add dataset entries in `dataset/queries.csv` for bulk evaluation.
