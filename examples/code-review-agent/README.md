# Code Review Agent Example

A complete example of testing an AI code review agent using AgentBench with Anthropic Claude.

## What This Example Demonstrates

- **Code review agent** -- a Claude-powered agent that reviews code for bugs, security vulnerabilities, and best practice violations using four specialized tools.
- **Security-first analysis** -- tests focus on catching critical issues: SQL injection, hardcoded secrets, input validation gaps.
- **Static analysis tooling** -- mock implementations of `analyze_code`, `check_best_practices`, and `suggest_improvements` that return realistic analysis results.
- **Claude integration** -- uses `@agentbench/anthropic` for automatic tracing of Anthropic API calls.
- **Regex-based assertions** -- demonstrates `toMatchRegex()` for pattern-based output validation.

## Test Suites

| Suite | Description |
|-------|-------------|
| `code-quality.test.ts` | Agent identifies off-by-one errors, type safety issues, unused variables, and performance concerns |
| `security-review.test.ts` | Agent catches SQL injection, hardcoded secrets, exposed debug endpoints, and missing validation |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Run tests
pnpm test
```

## Expected Output

```
Running: Code Quality ... ✓ 4/4 passed (2341ms)
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
├── agent.ts                  # Agent implementation with mock tools
├── README.md                 # This file
└── tests/
    ├── code-quality.test.ts  # Code quality analysis tests
    └── security-review.test.ts # Security vulnerability detection tests
```

## How It Works

1. The test provides a code sample with known issues (SQL injection, hardcoded secrets, etc.)
2. `runCodeReviewAgent()` sends the code to Claude with tool definitions
3. Claude calls the analysis tools to identify issues
4. The test assertions verify:
   - The correct tools were called (`analyze_code`, `check_best_practices`)
   - The output mentions the expected security/code issues
   - The agent suggests concrete improvements

## Customizing for Your Own Code Review Agent

1. **Replace mock tools** in `agent.ts` with real implementations (e.g., call ESLint, SonarQube, or Semgrep APIs)
2. **Update the system prompt** in `agentbench.config.ts` for your review standards
3. **Add your own code samples** in test files to match your codebase patterns
4. **Add more test suites** for specific categories: accessibility, i18n, testing coverage, etc.
