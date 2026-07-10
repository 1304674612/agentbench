# Code Generation Agent - AgentBench Example

**Reading time:** 5 min | **Prerequisites:** Node.js 20+, OpenAI API key

## Quick Start

```bash
cd examples/coding-agent && cp .env.example .env && npm install && agentbench test
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐
│  Task Prompt     │ --> │  Coding Agent (GPT-4o)       │
│  ("Write a fn")  │     │  - write_file tool           │
└─────────────────┘     │  - run_test tool             │
                         │  - code review loops         │
                         └──────────┬───────────────────┘
                                    │
                         ┌──────────▼───────────────────┐
                         │  Generated Code + Test Results│
                         │  (validated by assertions)    │
                         └──────────────────────────────┘
```

## What This Example Tests

| Test Suite | What It Verifies | Assertion Type |
|------------|-----------------|----------------|
| `code-generation.test.ts` | Agent produces syntactically valid, runnable code from natural language specs | `tool('write_file').toBeCalled()`, `output().toMatchRegex()` |
| `bug-fixing.test.ts` | Agent identifies and fixes bugs in provided code samples | `tool('write_file').toBeCalledTimes({ min: 2 })`, `output().toContain()` |
| `refactoring.test.ts` | Agent improves code structure without changing behavior | `output().toMatchRegex()`, `status().toBeCompleted()` |
| `tdd.test.ts` | Agent writes tests first, then implementation (test-driven workflow) | `tool('run_test').toBeCalled()`, `score('coverage').toBeGreaterThan(7)` |

## Running Individual Tests

```bash
agentbench test --suite "code-generation"
agentbench test --grep "bug-fixing"
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
Running: Code Generation ... ✓ 5/5 passed (3241ms)
Running: Bug Fixing ... ✓ 4/4 passed (2876ms)
Running: Refactoring ... ✓ 4/4 passed (2543ms)
Running: TDD ... ✓ 4/4 passed (3102ms)

Summary:
  ✓ 4 passed
  Total: 4 test(s)
```

## File Structure

```
coding-agent/
├── package.json                  # Package config
├── agentbench.config.ts          # AgentBench project configuration
├── .env.example                  # Environment variable template
├── README.md                     # This file
├── src/
│   └── agent.ts                  # Agent with write_file + run_test tools
├── tests/
│   ├── code-generation.test.ts   # Natural-language to code tests
│   ├── bug-fixing.test.ts        # Debugging capability tests
│   ├── refactoring.test.ts       # Code improvement tests
│   └── tdd.test.ts               # Test-driven development workflow tests
└── dataset/
    └── tasks.jsonl               # 20 coding tasks (generate, fix, refactor)
```

## Key Takeaways

1. **Test the tool calls, not just the output.** Verify `write_file` and `run_test` were called for coding agents.
2. **Bug-fixing tests need before/after comparisons.** Assert that the agent changed the code meaningfully.
3. **TDD workflow requires ordering checks.** The agent must call `write_file` for tests before implementation.
4. **JSONL datasets scale well.** Adding tasks to `tasks.jsonl` makes it easy to grow coverage without new test files.
5. **Use `score('coverage')` for generated code.** LLM-as-judge scoring catches edge cases regex assertions miss.
