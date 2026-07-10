---
title: "CI/CD Integration"
description: "Complete guide to integrating AgentBench into CI/CD pipelines — GitHub Actions, GitLab CI, CircleCI, JUnit XML reporting, cost budgets, regression detection, flaky test handling, and Docker-based CI."
targetAudience: "DevOps engineers and developers integrating AgentBench into automated CI/CD pipelines"
readingTime: "12 min"
prerequisites:
  - "AgentBench project initialized with `agentbench init`"
  - "Familiarity with your CI/CD platform (GitHub Actions, GitLab CI, or CircleCI)"
  - "LLM provider API keys configured as CI secrets"
---

## Overview

Integrating AgentBench into your CI/CD pipeline ensures every code change is validated against your agent's expected behavior — catching regressions in prompts, model upgrades, tool definitions, and agent logic before they reach production. This is the single highest-leverage practice for maintaining AI agent quality over time.

This guide covers configuration for all major CI platforms, CI-specific CLI flags, reporting formats, cost budgeting, regression detection, flaky test strategies, and Docker-based execution.

---

## 1. The `--ci` Flag

All CI configurations use AgentBench's `--ci` flag, which changes behavior for pipeline environments:

```bash
agentbench test --ci
```

### What `--ci` Changes

| Behavior | Default | `--ci` Mode |
|----------|---------|-------------|
| Output format | Rich TUI with colors | Plain text, no ANSI codes |
| Interactive prompts | Yes (watch mode, etc.) | No — fails immediately |
| Progress display | Animated spinner | One-line status per test |
| Exit code | 0 even on some failures | 1 on any failure (strict) |
| Report format | Console output | JUnit XML + JSON by default |
| Snapshot behavior | Interactive update prompt | Fails if snapshots don't match |
| Concurrency | Auto-detect cores | Respects `--concurrency` flag |
| Retries | 0 | Configurable via `--retries` |

### Common CI Command

```bash
# Standard CI invocation
agentbench test --ci --json --junit --verbose --concurrency 2 --retries 2

# With cost budget gate
agentbench test --ci --budget 5.00  # Fail if total cost exceeds $5.00

# With replay (zero-API-cost testing)
agentbench test --ci --replay
```

---

## 2. GitHub Actions Setup

### Auto-Generated Workflow

When you run `agentbench init --ci`, AgentBench generates a `.github/workflows/agentbench.yml` file automatically. Here is a complete reference workflow:

```yaml
name: AgentBench Tests

on:
  push:
    branches: [main]
    paths:
      - 'src/agent/**'
      - 'tests/**'
      - 'agentbench.config.ts'
      - 'datasets/**'
  pull_request:
    branches: [main]
    paths:
      - 'src/agent/**'
      - 'tests/**'
      - 'agentbench.config.ts'
      - 'datasets/**'
  workflow_dispatch:
    inputs:
      project:
        description: 'Project name to test'
        required: false
      test-pattern:
        description: 'Test file pattern to run'
        required: false
        default: 'tests/**/*.test.ts'

concurrency:
  group: agentbench-${{ github.ref }}
  cancel-in-progress: true

jobs:
  agent-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: agentbench
          POSTGRES_PASSWORD: agentbench
          POSTGRES_DB: agentbench
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup database
        run: |
          pnpm db:generate
          pnpm db:push
        env:
          DATABASE_URL: postgresql://agentbench:agentbench@localhost:5432/agentbench

      - name: Run AgentBench tests
        id: agentbench
        run: |
          agentbench test --ci --json --junit --verbose \
            --concurrency 2 \
            --retries 2 \
            --budget 10.00 \
            --output-dir reports/
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          DATABASE_URL: postgresql://agentbench:agentbench@localhost:5432/agentbench

      - name: Parse results
        id: results
        if: always()
        run: |
          echo "score=$(jq -r '.score' reports/results.json)" >> $GITHUB_OUTPUT
          echo "pass_rate=$(jq -r '.passRate' reports/results.json)" >> $GITHUB_OUTPUT
          echo "total=$(jq -r '.total' reports/results.json)" >> $GITHUB_OUTPUT
          echo "passed=$(jq -r '.passed' reports/results.json)" >> $GITHUB_OUTPUT
          echo "failed=$(jq -r '.failed' reports/results.json)" >> $GITHUB_OUTPUT
          echo "has_regression=$(jq -r '.hasRegression' reports/results.json)" >> $GITHUB_OUTPUT
          echo "total_cost=$(jq -r '.totalCost' reports/results.json)" >> $GITHUB_OUTPUT

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentbench-results-${{ github.run_id }}
          path: reports/
          retention-days: 30

      - name: Job summary
        if: always()
        run: |
          echo "## AgentBench Test Results :robot:" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Score | ${{ steps.results.outputs.score }}/10 |" >> $GITHUB_STEP_SUMMARY
          echo "| Pass Rate | ${{ steps.results.outputs.pass_rate }}% |" >> $GITHUB_STEP_SUMMARY
          echo "| Total Tests | ${{ steps.results.outputs.total }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Passed | ${{ steps.results.outputs.passed }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Failed | ${{ steps.results.outputs.failed }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Total Cost | \$${{ steps.results.outputs.total_cost }} |" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          if [ "${{ steps.results.outputs.has_regression }}" = "true" ]; then
            echo ":warning: **Regression detected!** Review the report for details." >> $GITHUB_STEP_SUMMARY
          fi
```

### Setting Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
```

For a deeper dive into GitHub Actions, see the [GitHub Actions Setup](./github-actions.md) guide.

---

## 3. GitLab CI Setup

### .gitlab-ci.yml

```yaml
stages:
  - test

variables:
  PNPM_VERSION: '9'

agentbench-tests:
  stage: test
  image: node:20-alpine
  timeout: 30 minutes

  services:
    - postgres:16-alpine
      alias: postgres

  variables:
    POSTGRES_USER: agentbench
    POSTGRES_PASSWORD: agentbench
    POSTGRES_DB: agentbench
    DATABASE_URL: postgresql://agentbench:agentbench@postgres:5432/agentbench

  before_script:
    - corepack enable
    - corepack prepare pnpm@${PNPM_VERSION} --activate
    - pnpm install --frozen-lockfile
    - pnpm db:generate
    - pnpm db:push

  script:
    - agentbench test --ci --json --junit --verbose
      --concurrency 2 --retries 2 --budget 10.00
      -o reports/ || TEST_EXIT_CODE=$?
    - |
      if [ -f reports/results.json ]; then
        SCORE=$(jq -r '.score' reports/results.json)
        PASS_RATE=$(jq -r '.passRate' reports/results.json)
        echo "Score: $SCORE/10 | Pass Rate: $PASS_RATE%"
      fi
    - exit ${TEST_EXIT_CODE:-0}

  artifacts:
    when: always
    paths:
      - reports/
    reports:
      junit: reports/junit.xml
    expire_in: 30 days

  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      changes:
        - src/agent/**/*
        - tests/**/*
        - agentbench.config.ts
        - datasets/**/*
    - if: $CI_COMMIT_BRANCH == "main"
```

### GitLab Merge Request Integration

GitLab natively consumes JUnit XML artifacts. When you add `reports: junit: reports/junit.xml` to the artifacts, GitLab automatically displays pass/fail results in the merge request widget.

### Protected Variables

In GitLab: **Settings > CI/CD > Variables** (set as "Masked" and "Protected" for main branch access):

```
OPENAI_API_KEY → sk-...
ANTHROPIC_API_KEY → sk-ant-...
```

---

## 4. CircleCI Setup

### .circleci/config.yml

```yaml
version: 2.1

executors:
  agentbench-executor:
    docker:
      - image: cimg/node:20.11
      - image: cimg/postgres:16.1
        environment:
          POSTGRES_USER: agentbench
          POSTGRES_PASSWORD: agentbench
          POSTGRES_DB: agentbench
    environment:
      DATABASE_URL: postgresql://agentbench:agentbench@localhost:5432/agentbench

jobs:
  agentbench-test:
    executor: agentbench-executor
    parallelism: 1

    steps:
      - checkout

      - run:
          name: Install pnpm
          command: |
            sudo corepack enable
            sudo corepack prepare pnpm@9 --activate

      - restore_cache:
          keys:
            - pnpm-store-{{ checksum "pnpm-lock.yaml" }}

      - run:
          name: Install dependencies
          command: pnpm install --frozen-lockfile

      - save_cache:
          key: pnpm-store-{{ checksum "pnpm-lock.yaml" }}
          paths:
            - ~/.local/share/pnpm/store

      - run:
          name: Setup database
          command: |
            pnpm db:generate
            pnpm db:push

      - run:
          name: Run AgentBench tests
          command: |
            agentbench test --ci --json --junit --verbose \
              --concurrency 2 --retries 2 --budget 10.00 \
              -o reports/

      - store_test_results:
          path: reports/

      - store_artifacts:
          path: reports/
          destination: agentbench-results

  workflows:
    version: 2
    test:
      jobs:
        - agentbench-test:
            context:
              - agentbench-secrets
            filters:
              branches:
                only:
                  - main
                  - /feature\/.*/
```

### CircleCI Contexts

Create an `agentbench-secrets` context in **Organization Settings > Contexts** with all required API keys.

---

## 5. Running Tests in CI Mode

### Essential CI Flags

```bash
agentbench test --ci \           # CI mode (no TUI, strict exit codes)
  --json \                        # Output results.json
  --junit \                       # Output junit.xml for test reporting tools
  --verbose \                     # Detailed output for debugging failures
  --concurrency 2 \               # Limit parallel API calls
  --retries 2 \                   # Retry flaky tests up to 2 times
  --budget 10.00 \                # Fail if total cost exceeds $10.00
  --output-dir reports/           # Custom output directory
  --timeout 300                   # 5-minute timeout per test
```

### CI vs Local Mode Comparison

```bash
# Local development — rich TUI, interactive prompts
agentbench test --watch

# CI pipeline — plain output, strict failures
agentbench test --ci --json --junit
```

---

## 6. Generating JUnit XML for Test Reporting

JUnit XML is the standard format consumed by CI test reporting tools (GitHub Actions Test Reports, GitLab MR widget, CircleCI Insights, Jenkins, etc.).

### Enabling JUnit Output

```bash
agentbench test --ci --junit -o reports/
```

This produces `reports/junit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="AgentBench Tests" tests="12" failures="2" errors="0" time="45.3">
  <testsuite name="Customer Support" tests="4" failures="0" errors="0" time="15.2">
    <testcase name="refund inquiry" classname="customer-support" time="3.8">
      <properties>
        <property name="model" value="gpt-4o"/>
        <property name="tokens" value="245"/>
        <property name="cost" value="0.0032"/>
      </properties>
    </testcase>
    <testcase name="shipping status" classname="customer-support" time="4.1">
      <properties>
        <property name="model" value="gpt-4o"/>
        <property name="tokens" value="312"/>
        <property name="cost" value="0.0041"/>
      </properties>
    </testcase>
  </testsuite>
  <testsuite name="Tool Calling" tests="3" failures="1" errors="0" time="12.7">
    <testcase name="search tool selection" classname="tool-calling" time="5.2"/>
    <testcase name="parallel tool calls" classname="tool-calling" time="4.8">
      <failure message="Expected 2 tool calls but got 1">
        Assertion: tool('search_knowledge_base').toBeCalledTimes(2)
        Actual: 1 call(s)
        Trace: run-tc002-abc123
      </failure>
    </testcase>
  </testsuite>
</testsuites>
```

### Tool-Specific Configuration

**Jenkins:**
```groovy
junit 'reports/junit.xml'
```

**GitHub Actions (Marketplace action):**
```yaml
- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  with:
    files: reports/junit.xml
```

---

## 7. Setting Cost Budgets as CI Gates

Cost budgets ensure your agent testing doesn't unexpectedly bill thousands of dollars.

### Budget Configuration

```bash
# Fail if total cost exceeds $10.00
agentbench test --ci --budget 10.00

# Per-suite budget (in agentbench.config.ts)
import { defineConfig } from '@agentbench/config'

export default defineConfig({
  ci: {
    budget: 10.00,          // Max total cost per CI run
    perTestBudget: 1.00,    // Max cost per individual test
    warnAt: 5.00,           // Print warning at 50% of budget
  },
  providers: {
    judge: {
      model: 'gpt-4o-mini', // Use cheap model for evaluation
    },
  },
})
```

### Budget Enforcement

```typescript
test('budget example', async () => {
  // This test will be skipped if the budget is already exceeded
  const result = await runner.execute({ /* ... */ })

  // Individual test cost assertion
  expect(result).cost().toBeLessThan(0.50)
})

// In CI, if total cost exceeds budget, agentbench exits with code 1
// and prints a summary:
//
// Budget exceeded: $12.45 / $10.00
//   Most expensive tests:
//   1. complex_analysis: $3.21
//   2. multi_turn_conversation: $2.88
//   3. reasoning_benchmark: $2.10
```

---

## 8. Regression Detection as a Merge Blocker

### How Regression Detection Works

AgentBench compares each test run against stored snapshots (baseline). If the new run's scores are significantly lower, it's flagged as a regression.

### Enabling in CI

```bash
agentbench test --ci --replay --fail-on-regression
```

### Configuration

```typescript
export default defineConfig({
  ci: {
    failOnRegression: true,
    regressionThreshold: 0.05,   // 5% score drop = regression
    regressionDimensions: ['correctness', 'faithfulness', 'tool_usage'],
    snapshotsDir: '.agentbench/snapshots/',
  },
})
```

### GitLab Merge Request Example

```yaml
agentbench-regression-check:
  script:
    - agentbench test --ci --replay --fail-on-regression
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  artifacts:
    reports:
      junit: reports/junit.xml
```

### PR Comment Integration

When a regression is detected, AgentBench posts the diff directly to the PR/MR comment:

| Test | Baseline | Current | Delta |
|------|----------|---------|-------|
| refund_inquiry | 9.2 | 7.1 | -2.1 :warning: |
| shipping_status | 8.8 | 8.9 | +0.1 |
| tool_selection | 9.5 | 9.4 | -0.1 |

---

## 9. Handling Flaky Tests

LLM-based tests are inherently non-deterministic. Even with temperature 0, outputs can vary slightly between model versions. AgentBench provides several strategies for handling flakiness.

### Retries

```bash
agentbench test --ci --retries 3
```

Each failed test is retried up to 3 times. The best score among retries is used. If all retries fail, the test is marked as failed.

### Score Thresholds Instead of Exact Match

```typescript
// ❌ Brittle — exact matches fail on minor output variations
expect(result).output().toMatch('The refund policy states that returns must be made within 30 days of purchase and items must be in original packaging.')

// ✅ Robust — use score thresholds
expect(result).evaluate('correctness').score().toBeGreaterThanOrEqual(7)

// ✅ Use semantic assertions
expect(result).output().toContain('refund')
expect(result).output().toMatch(/within \d+ days/i)
```

### Replay Mode (Zero Flakiness)

```bash
agentbench test --ci --replay
```

Replay mode uses stored snapshots instead of live API calls. Tests are 100% deterministic, zero API cost, and run in seconds. This is the recommended approach for CI:

1. **On main branch:** Run with live API, update snapshots
2. **On PRs:** Run in replay mode (fast, deterministic, zero cost)
3. **Nightly:** Full live-API run to refresh snapshots

### Flakiness Configuration

```typescript
export default defineConfig({
  ci: {
    retries: 3,
    retryDelay: 5000,          // 5-second delay between retries
    scoreThreshold: 7,         // Default passing score
    maxFlakinessRate: 0.1,     // Fail if >10% of tests are flaky
  },
})
```

---

## 10. Caching Snapshots Between CI Runs

### GitHub Actions Cache

```yaml
- name: Cache snapshots
  uses: actions/cache@v4
  with:
    path: .agentbench/snapshots
    key: agentbench-snapshots-${{ runner.os }}-${{ hashFiles('tests/**') }}
    restore-keys: |
      agentbench-snapshots-${{ runner.os }}-
```

### GitLab CI Cache

```yaml
cache:
  key: agentbench-snapshots
  paths:
    - .agentbench/snapshots/
```

---

## 11. Docker-Based CI Setup

For consistent CI environments, use a pre-built Docker image:

### Custom Dockerfile

```dockerfile
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN npm install -g agentbench

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm db:generate

ENTRYPOINT ["agentbench", "test", "--ci"]
```

### Running in Docker

```bash
docker build -t agentbench-ci .
docker run --rm \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e DATABASE_URL=postgresql://... \
  agentbench-ci --json --junit -o /app/reports/
```

### Docker Compose for CI

```yaml
# docker-compose.ci.yml
version: '3.8'
services:
  agentbench:
    build: .
    environment:
      - OPENAI_API_KEY
      - ANTHROPIC_API_KEY
      - DATABASE_URL=postgresql://agentbench:agentbench@postgres:5432/agentbench
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./reports:/app/reports

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: agentbench
      POSTGRES_PASSWORD: agentbench
      POSTGRES_DB: agentbench
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## 12. Environment Variable Management for CI

### Recommended Setup

Each CI platform has a secure way to manage API keys:

| Platform | Mechanism |
|----------|-----------|
| GitHub Actions | Repository Secrets + Environments |
| GitLab CI | Protected + Masked Variables |
| CircleCI | Contexts |
| Jenkins | Credentials Plugin |
| Docker | `--env-file` or secrets manager |

### Using .env.agentbench in CI

```bash
# In CI, create the file from secrets before running tests
echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env.agentbench
echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >> .env.agentbench
agentbench test --ci
```

### Never Log Secrets

AgentBench automatically redacts API keys from logs and trace outputs when running in `--ci` mode.

```bash
# ❌ Never do this
echo $OPENAI_API_KEY

# ✅ AgentBench redacts automatically
agentbench test --ci --verbose  # Keys are masked as sk-...XXXX
```

---

## Common Pitfalls

### Forgetting to add API keys as CI secrets

The most common failure: `Error: OpenAI API key is required`. Ensure all required provider secrets are set in your CI platform's secret management.

### Running with --concurrency too high

CI runners typically have 2-4 vCPUs. Setting `--concurrency 10` will hit rate limits on most provider tiers. Start with `--concurrency 2` and increase only if needed.

### Not using --frozen-lockfile

Always use `pnpm install --frozen-lockfile` in CI to ensure reproducible dependencies. Without it, CI may install different versions than local development.

### Snapshot drift

If you cache snapshots between runs, remember to invalidate the cache when tests change. Use `hashFiles('tests/**')` in your cache key.

### Not handling CI exit codes correctly

AgentBench exits with code 1 on test failures in `--ci` mode. Make sure your CI pipeline treats exit code 1 as a failure. Some CI platforms require explicit `|| exit 1` in shell scripts.

### Hitting timeouts on complex agent tests

Agent tests with multi-turn tool calling can run for minutes. Set `timeout-minutes: 30` (or higher) on your CI job, and use `--timeout 300` to set per-test timeouts.

---

## Next Steps

- [GitHub Actions Setup](./github-actions.md) — Deep dive into GitHub Actions integration
- [Testing OpenAI Agents](./testing-openai-agents.md) — Provider-specific testing patterns
- [Testing Anthropic Claude Agents](./testing-anthropic-agents.md) — Claude-specific testing
- [Dataset Management Guide](./dataset-management.md) — Organize test data for CI

---

> [Back to Documentation Center](../INDEX.md)
