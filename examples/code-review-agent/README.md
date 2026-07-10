# Code Review Agent

A production-grade code review AI agent tested with AgentBench. Uses Claude to analyze code for bugs, security vulnerabilities, and best practice violations with specialized static analysis tools.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your Anthropic API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Run all tests
pnpm test
```

## Architecture

```
Code Submission
    │
    ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Code Review Agent    │────▶│  read_file            │──▶ Source Files
│  (Claude Sonnet)      │────▶│  analyze_code         │──▶ Bug/Crime Detection
│                       │────▶│  check_best_practices │──▶ Standards Report
│                       │────▶│  suggest_improvements │──▶ Refactoring Diffs
└──────────────────────┘     └──────────────────────┘
    │
    ▼
  Reviewed Code + Actionable Feedback
```

## What This Tests

| Test Suite | What It Verifies | Key Assertions |
|---|---|---|
| `code-quality.test.ts` | Agent identifies bugs (off-by-one, type safety, unused vars, performance) | `tool('analyze_code').toBeCalled()`, `output().toMatchRegex(/off-by-one|bug|error/)` |
| `security-review.test.ts` | Agent catches SQL injection, hardcoded secrets, missing input validation, exposed endpoints | `output().toMatchRegex(/sql.?injection|injection.?attack/), output().toMatchRegex(/hardcoded.?secret|environment.?variable/)` |

## Running

```bash
# Run all test suites
agentbench run --project code-review

# Run specific suite
agentbench test --project code-review --suite tests/security-review.test.ts
```

## Replay

```bash
# Replay from a trace
agentbench replay --trace .agentbench/traces/latest.json
```

## CI Integration

```yaml
# .github/workflows/agentbench.yml
- name: Run Code Review Tests
  run: pnpm test
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Expected Output

```
Running: Code Quality ... ✓ 5/5 passed (2341ms)
Running: Security Review ... ✓ 5/5 passed (3124ms)

Summary:
  ✓ 2 passed
  Total: 2 test(s)
```

## File Structure

```
code-review-agent/
├── package.json              # Package config
├── agentbench.config.ts      # AgentBench project configuration
├── agent.ts                  # Agent with 4 static analysis tools
├── README.md                 # This file
└── tests/
    ├── code-quality.test.ts  # Code quality analysis tests
    └── security-review.test.ts # Security vulnerability detection tests
```

## Key Takeaways

- **Regex-based assertions catch security patterns reliably.** `toMatchRegex(/sql.?injection/)` verifies the agent names the vulnerability, not just that it found something.
- **Mock tools must return realistic data.** The agent's behavior depends on tool output quality — "foo bar" mocks produce meaningless test results.
- **Test both detection AND suggestion.** `suggest_improvements` tool calls verify the agent provides fixes, not just complaints.
- **Separate code quality from security tests.** Different review categories have different severity thresholds and assertion strategies.
- **Use `any([...])` for flexible output matching.** LLMs describe the same issue in multiple ways.
