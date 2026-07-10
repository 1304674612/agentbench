---
title: CLI Reference
description: Complete reference for all AgentBench CLI commands, options, flags, and output formats.
targetAudience: AgentBench users who work from the terminal
readingTime: 15 min
prerequisites:
  - AgentBench installed (pnpm install or global npm install)
  - A running AgentBench server or local test directory
---

# CLI Reference

AgentBench CLI is the primary interface for running agent tests, managing benchmarks, replaying runs, and generating reports. It exposes 13 commands grouped by workflow stage.

## Quick Reference

| Command | Purpose | Key Flags |
|---|---|---|
| `init` | Scaffold a new project interactively | `--yes`, `--template`, `--force` |
| `test` | Discover and execute local test files | `--suite`, `--grep`, `--watch`, `--coverage`, `--junit` |
| `run` | Create a single agent run via the API | `--project`, `--name`, `--model` |
| `evaluate` | Evaluate a completed run with rules | `--contains`, `--tool`, `--tokens-lt` |
| `replay` | Replay a previous run (cross-model, batch) | `--mode`, `--model`, `--batch-count` |
| `compare` | Side-by-side comparison of two runs | `--json` |
| `report` | Generate a formatted report | `--json` |
| `snapshot` | Create, list, restore snapshots | subcommands: `create`, `list`, `restore` |
| `experiment` | Execute and view A/B experiments | subcommands: `run`, `results` |
| `dev` | Watch mode with auto re-run on changes | `--project`, `--watch` |
| `config` | Get/set configuration values | subcommands: `set`, `get` |
| `dataset` | List, view, validate local CSV datasets | subcommands: `list`, `view`, `validate` |
| `benchmark` | Search, install, run, submit benchmarks | subcommands: `search`, `info`, `install`, `run`, `submit`, `publish`, `list` |

---

## Global Options

These apply to every command:

| Option | Description |
|---|---|
| `-V, --version` | Print the CLI version and exit |
| `-h, --help` | Print command-specific help and exit |

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `AGENTBENCH_API_URL` | `http://localhost:3000/api/v1` | Base URL for the AgentBench API server |

---

## `agentbench init`

Scaffolds a new AgentBench project with an interactive 4-step onboarding wizard.

```
agentbench init [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `-y, --yes` | `boolean` | `false` | Skip all prompts and use sensible defaults |
| `-t, --template <name>` | `string` | — | Project template: `hello-agent`, `customer-support`, `rag-agent`, `empty` |
| `-p, --provider <name>` | `string` | — | LLM provider: `openai`, `anthropic`, `gemini`, `deepseek`, `openrouter`, `azure`, `groq`, `mistral`, `cohere` |
| `--ci` | `boolean` | `false` | Generate a GitHub Actions CI workflow (`.github/workflows/agentbench.yml`) |
| `-f, --force` | `boolean` | `false` | Overwrite an existing `agentbench.config.ts` |

### Interactive Steps

1. **Project settings** -- name, language (TypeScript / JavaScript), package manager (npm / pnpm / yarn / bun)
2. **API keys** -- scans 9 environment variables, displays status, allows interactive entry of missing keys into `.env.agentbench`
3. **Project template** -- select from hello-agent, customer-support, rag-agent, or empty scaffold
4. **Directory layout** -- customize test, source, dataset, report, and examples directory names

### Generated Files

The command creates the following structure:

```
agentbench.config.ts
src/agent.ts                    # Agent implementation
tests/<template>.test.ts        # Test suite
dataset/<template>.queries.csv  # Dataset (if applicable)
examples/.gitkeep
reports/.gitkeep
.agentbench/snapshots/.gitkeep  # Snapshot storage
.github/workflows/agentbench.yml (if --ci)
.env.agentbench                 # API key storage
.gitignore (appended)           # .agentbench/ entries
```

### Usage Examples

```bash
# Full interactive onboarding
agentbench init

# Quick start with defaults
agentbench init --yes

# Specific template with CI
agentbench init --template customer-support --provider openai --ci

# Force overwrite
agentbench init --force --yes
```

---

## `agentbench test`

Discovers and executes test files locally with assertion evaluation -- no API server required.

```
agentbench test [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `-s, --suite <pattern>` | `string` | — | Filter test suites by name (case-insensitive substring) |
| `-g, --grep <pattern>` | `string` | — | Filter individual test cases by name (regex) |
| `-v, --verbose` | `boolean` | `false` | Show per-assertion detail for failed tests |
| `--json` | `boolean` | `false` | Output results as JSON |
| `--junit` | `boolean` | `false` | Output results as JUnit XML (for CI systems) |
| `-w, --watch` | `boolean` | `false` | Watch for file changes and re-run (uses `fs.watch`, 300ms debounce) |
| `--coverage` | `boolean` | `false` | Print assertion evaluation coverage report |
| `--replay` | `boolean` | `false` | Use recorded replay data instead of live agent calls |
| `--update-snapshots` | `boolean` | `false` | Update stored snapshots on mismatch |
| `--ci` | `boolean` | `false` | CI mode: no interactive output, exit code 1 on failure |

### Test Discovery

The runner scans the `tests/` directory (configurable via `agentbench.config.ts`) for files matching:
- `*.test.ts`, `*.test.js`, `*.test.mjs`, `*.test.cjs`
- `*.spec.ts`, `*.spec.js`, `*.spec.mjs`, `*.spec.cjs`

Skips `node_modules` and dot-directories.

### Local Assertion Engine

Six assertion types are evaluated locally against agent output:

| Type | Behavior |
|---|---|
| `contains` | Case-insensitive substring match |
| `not-contains` | Case-insensitive substring absence |
| `not-empty` | Non-empty output after trimming |
| `contains-any` | At least one of multiple substrings matches |
| `semantic-similarity` | Stub (requires embedding model -- always passes locally) |

### Output Format

**Standard output:**
```
⚡ Running tests...
  Suites: 3
  Test cases: 12

  ✓ greeting: 5/5 passed (2340ms)
  ✓ refund_check: 4/4 passed (1890ms)
  ✗ escalation: 2/3 failed (3200ms)

────────────────────────────────────────────
Summary:
  ✓ 10 passed
  ✗ 1 failed
  ⚠ 0 errors
```

**JSON output format:**
```json
{
  "suites": [
    {
      "suiteName": "greeting",
      "results": [
        {
          "name": "hello world",
          "status": "PASSED",
          "duration": 2340,
          "tokens": { "input": 42, "output": 128, "total": 170 },
          "cost": 0.0012,
          "assertions": { "passed": 3, "failed": 0, "errored": 0, "total": 3 }
        }
      ]
    }
  ],
  "summary": { "total": 12, "passed": 10, "failed": 1, "errored": 0, "totalDuration": 12450, "totalTokens": 4200, "totalCost": 0.035 }
}
```

**JUnit XML format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="AgentBench Tests" tests="12" failures="1" errors="0" time="12.45">
  <testsuite name="greeting" tests="5" failures="0" errors="0" time="2.34">
    <testcase name="hello world" time="2.34"/>
  </testsuite>
</testsuites>
```

### Usage Examples

```bash
# Run all tests
agentbench test

# Filter by suite and grep
agentbench test --suite customer-support --grep "refund"

# Watch mode with verbose output
agentbench test --watch --verbose

# CI mode with JUnit output
agentbench test --ci --junit > test-results.xml

# Coverage report
agentbench test --coverage
```

---

## `agentbench run`

Creates and executes a single agent test run via the API.

```
agentbench run [options]
```

### Options

| Option | Required | Type | Default | Description |
|---|---|---|---|---|
| `-p, --project <id>` | Yes | `string` | — | Project ID |
| `-n, --name <name>` | Yes | `string` | — | Human-readable run name |
| `-m, --model <model>` | No | `string` | `gpt-4o` | Model to use |
| `--provider <provider>` | No | `string` | `openai` | LLM provider |
| `--temperature <temp>` | No | `string` | `0.7` | Sampling temperature (0-2) |
| `--max-tokens <tokens>` | No | `string` | `4096` | Max tokens per completion |
| `-v, --verbose` | No | `boolean` | `false` | Verbose output |
| `--json` | No | `boolean` | `false` | Output as JSON |

### JSON Output

```json
{
  "id": "run_abc123",
  "name": "GPT-4o Baseline",
  "status": "PENDING",
  "config": {
    "agent": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  },
  "tags": ["cli"],
  "createdAt": "2026-07-10T12:00:00.000Z"
}
```

### Usage Examples

```bash
# Basic run
agentbench run --project proj_001 --name "GPT-4o Baseline"

# Specific model and provider
agentbench run -p proj_001 -n "Claude Comparison" --provider anthropic --model claude-sonnet-4-20250514

# Deterministic run
agentbench run -p proj_001 -n "Zero-temp test" --temperature 0 --json
```

---

## `agentbench evaluate`

Evaluates a completed run against assertion rules.

```
agentbench evaluate <run-id> [options]
```

### Options

| Option | Type | Description |
|---|---|---|
| `--contains <text>` | `string` | Assert output contains substring |
| `--tool <name>` | `string` | Assert a tool was called |
| `--tool-not <name>` | `string` | Assert a tool was NOT called |
| `--latency-lt <ms>` | `number` | Assert latency below threshold (ms) |
| `--tokens-lt <n>` | `number` | Assert token usage below threshold |
| `--cost-lt <dollars>` | `number` | Assert cost below threshold (USD) |
| `--json-schema <schema>` | `string` | Validate output against a JSON schema (file path) |
| `--expected <text>` | `string` | Exact output match |
| `-v, --verbose` | `boolean` | Show per-rule detailed results |
| `--json` | `boolean` | Output as JSON |

You must specify at least one rule. Multiple rules can be combined.

### JSON Output

```json
{
  "assertionResults": [
    { "type": "contains", "status": "PASSED", "message": "Found \"refund\"" },
    { "type": "tool_called", "status": "PASSED", "message": "Tool \"search_docs\" was called" },
    { "type": "tokens_lt", "status": "FAILED", "expected": "< 4096 tokens", "actual": "4520 tokens" }
  ],
  "summary": { "passed": 2, "failed": 1, "errored": 0, "totalRules": 3 },
  "scores": [
    { "evaluator": "correctness", "score": 8.5, "maxScore": 10.0, "reason": "The response correctly addressed the query" }
  ]
}
```

### Usage Examples

```bash
# Simple content check
agentbench evaluate run_abc123 --contains "refund policy"

# Tool usage assertions
agentbench evaluate run_abc123 --tool search_docs --tool-not delete_record

# Resource limits
agentbench evaluate run_abc123 --latency-lt 5000 --tokens-lt 4096 --cost-lt 0.01

# JSON schema validation
agentbench evaluate run_abc123 --json-schema ./schemas/response.schema.json

# Verbose with multiple rules
agentbench evaluate run_abc123 --contains "退款" --tool search_docs --latency-lt 5000 --verbose
```

---

## `agentbench replay`

Replays a previous run, optionally with a different model or in batch mode.

```
agentbench replay <run-id> [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `-m, --model <model>` | `string` | — | Replay with a different model |
| `--provider <provider>` | `string` | — | Replay with a different provider |
| `--temperature <temp>` | `number` | — | Override temperature |
| `--mode <mode>` | `string` | `deterministic` | Replay mode: `deterministic`, `cross_model`, `batch` |
| `--batch-count <n>` | `number` | `5` | Number of batch runs (batch mode only) |
| `--seed <n>` | `number` | — | Seed for deterministic replay |
| `--no-parallel` | `boolean` | `false` | Disable parallel execution in batch mode |
| `--json` | `boolean` | `false` | Output as JSON |

### Replay Modes

| Mode | Description |
|---|---|
| `deterministic` | Replay exact inputs including LLM responses (if recorded). Useful for testing non-model changes. |
| `cross_model` | Replay with a different model/provider. Uses the same inputs but calls the new model. |
| `batch` | Replay the same run N times to measure variance. Use with `--batch-count` and `--seed`. |

### JSON Output

```json
{
  "replayRuns": [
    { "id": "run_replay_001", "name": "Replay of GPT-4o Baseline (#1)" },
    { "id": "run_replay_002", "name": "Replay of GPT-4o Baseline (#2)" }
  ]
}
```

### Usage Examples

```bash
# Cross-model replay
agentbench replay run_abc123 --model claude-sonnet-4-20250514 --provider anthropic --mode cross_model

# Batch replay for variance measurement
agentbench replay run_abc123 --mode batch --batch-count 10 --seed 42

# Deterministic replay with different temperature
agentbench replay run_abc123 --mode deterministic --temperature 0
```

---

## `agentbench compare`

Side-by-side comparison of two runs' metrics.

```
agentbench compare <run-a-id> <run-b-id> [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `--json` | `boolean` | `false` | Output as JSON |

### Output

**Standard output:**
```
⚡ Comparing run_abc123 ↔ run_def456

Comparison:
  Status:    passed vs passed
  Duration:  2340ms vs 1890ms
  Tokens:    2847 vs 2103
  Cost:      $0.0089 vs $0.0065
  Steps:     3 vs 2
```

**JSON output:**
```json
{
  "runA": { "id": "run_abc123", "status": "passed", "metrics": { "totalTokens": 2847, "totalCost": 0.0089, "stepCount": 3 } },
  "runB": { "id": "run_def456", "status": "passed", "metrics": { "totalTokens": 2103, "totalCost": 0.0065, "stepCount": 2 } }
}
```

### Usage Examples

```bash
# Terminal comparison
agentbench compare run_abc123 run_def456

# JSON for further processing
agentbench compare run_abc123 run_def456 --json | jq '.runB.metrics.totalCost - .runA.metrics.totalCost'
```

---

## `agentbench report`

Generates a formatted report for a single run or lists all recent runs.

```
agentbench report [run-id] [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `--json` | `boolean` | `false` | Output as JSON |

### Usage Examples

```bash
# Single run report
agentbench report run_abc123

# All recent runs
agentbench report

# JSON output for piping
agentbench report run_abc123 --json > report.json
```

---

## `agentbench snapshot`

Snapshot management: capture agent state, list snapshots, and restore to create new runs.

```
agentbench snapshot <subcommand> [options]
```

### `snapshot create`

Create a snapshot from an existing run.

| Option | Required | Type | Description |
|---|---|---|---|
| `-p, --project <id>` | Yes | `string` | Project ID |
| `-r, --run <id>` | Yes | `string` | Run ID to snapshot |
| `-n, --name <name>` | Yes | `string` | Snapshot name |
| `-d, --description <desc>` | No | `string` | Human-readable description |
| `--json` | No | `boolean` | Output as JSON |

```bash
agentbench snapshot create -p proj_001 -r run_abc123 -n "v1.0 Baseline" -d "Before prompt optimization"
```

### `snapshot list`

List all snapshots for a project.

| Option | Required | Type | Description |
|---|---|---|---|
| `-p, --project <id>` | Yes | `string` | Project ID |
| `--json` | No | `boolean` | Output as JSON |

```bash
agentbench snapshot list -p proj_001
# [manual] v1.0 Baseline
#   snap_001 | 3 tools | 8 messages | 2026-07-10T12:00:00.000Z
```

### `snapshot restore <snapshot-id>`

Restore a snapshot, creating a new run.

| Option | Type | Default | Description |
|---|---|---|---|
| `-m, --model <model>` | `string` | — | Override model for the restored run |
| `--json` | `boolean` | `false` | Output as JSON |

```bash
agentbench snapshot restore snap_001
agentbench snapshot restore snap_001 --model gpt-5
```

---

## `agentbench experiment`

Execute and view A/B experiments.

```
agentbench experiment <subcommand> [options]
```

### `experiment run <experiment-id>`

Execute all runs for an experiment.

| Option | Type | Default | Description |
|---|---|---|---|
| `-p, --project <id>` | `string` | — | Project ID |
| `--json` | `boolean` | `false` | Output as JSON |

```bash
agentbench experiment run exp_001 -p proj_001
```

### `experiment results <experiment-id>`

View experiment results and statistical conclusion.

| Option | Type | Default | Description |
|---|---|---|---|
| `--json` | `boolean` | `false` | Output as JSON |

```bash
agentbench experiment results exp_001
# My A/B Test
# Status: COMPLETED  Conclusion: WINNER_A
#
#   ✓ Variant A: 8/10 passed (avg 2340ms)
#   ⚠ Variant B: 6/10 passed (avg 2890ms)
```

---

## `agentbench dev`

Development mode: watches source files and automatically re-runs tests on changes.

```
agentbench dev [options]
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `-p, --project <id>` | `string` | — | Project ID (passed to `agentbench test`) |
| `-w, --watch <paths...>` | `string[]` | `[cwd]` | Additional paths to watch |
| `--poll-interval <ms>` | `number` | `1000` | File polling interval in milliseconds |
| `-v, --verbose` | `boolean` | `false` | Verbose output (shows which files changed) |
| `--no-tests` | `boolean` | `false` | Watch only -- do not run tests |

### Behavior

- Recursively scans watch directories for `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yml`, `.yaml`, `.toml` files
- Compares file `mtimeMs` on each poll interval to detect changes
- On change detection, spawns `agentbench test` with the provided options
- Debounces: if tests are running when another change is detected, queues a re-run after the current run completes
- Handles `SIGINT` / `SIGTERM` for graceful shutdown

```bash
agentbench dev
agentbench dev --project proj_001 --watch ./src ./config --verbose
```

---

## `agentbench config`

Read and write configuration values in `.env.agentbench`.

```
agentbench config <subcommand> [options]
```

### `config set <key> <value>`

Set a configuration value (writes to `.env.agentbench`).

```bash
agentbench config set OPENAI_API_KEY sk-abc123
```

### `config get <key>`

Read a configuration value.

```bash
agentbench config get OPENAI_API_KEY
# sk-abc123
```

---

## `agentbench dataset`

Local CSV dataset management: list, view, and validate.

```
agentbench dataset <subcommand> [options]
```

### `dataset list`

List all CSV datasets in a directory.

| Option | Type | Default | Description |
|---|---|---|---|
| `-d, --dir <path>` | `string` | `dataset` | Directory containing CSV files |

```bash
agentbench dataset list
agentbench dataset list --dir ./my-datasets
```

### `dataset view <name>`

View dataset contents with formatted output.

| Option | Type | Default | Description |
|---|---|---|---|
| `-d, --dir <path>` | `string` | `dataset` | Directory containing CSV files |
| `-n, --limit <number>` | `number` | `20` | Maximum rows to display |
| `--json` | `boolean` | `false` | Output as JSON |

```bash
agentbench dataset view customer-support
agentbench dataset view customer-support --limit 5 --json
```

### `dataset validate <name>`

Validate a dataset for common issues.

| Option | Type | Default | Description |
|---|---|---|---|
| `-d, --dir <path>` | `string` | `dataset` | Directory containing CSV files |
| `--json` | `boolean` | `false` | Output as JSON |

Checks for:
- Missing required `query` column
- Empty `query` values in rows
- Duplicate `query` values

```bash
agentbench dataset validate customer-support
```

---

## `agentbench benchmark`

Benchmark marketplace: search, install, run, submit, and publish benchmarks.

```
agentbench benchmark <subcommand> [options]
```

### `benchmark search [query]`

Search the benchmark marketplace.

| Option | Type | Default | Description |
|---|---|---|---|
| `--category <cat>` | `string` | — | Filter by category |
| `--difficulty <level>` | `string` | — | `beginner`, `intermediate`, `advanced`, `expert` |
| `--tags <tags>` | `string` | — | Comma-separated tags |
| `--sort <order>` | `string` | `popular` | `popular`, `newest`, `highest-rated`, `most-downloaded` |
| `--page <n>` | `number` | `1` | Page number |
| `--page-size <n>` | `number` | `20` | Results per page |
| `--json` | `boolean` | `false` | Output as JSON |

```bash
agentbench benchmark search "customer"
agentbench benchmark search --category sql --difficulty advanced --sort highest-rated
```

### `benchmark info <slug>`

View detailed benchmark information including test suites and leaderboard.

```bash
agentbench benchmark info agentbench/customer-support-v2
```

### `benchmark install <slug>`

Download and install a benchmark locally.

| Option | Type | Default | Description |
|---|---|---|---|
| `--dir <path>` | `string` | `./benchmarks` | Installation directory |

```bash
agentbench benchmark install agentbench/customer-support-v2
```

### `benchmark run <slug>`

Run a benchmark against your agent.

| Option | Required | Type | Default | Description |
|---|---|---|---|---|
| `--agent <path>` | Yes | `string` | — | Path to agent implementation |
| `--suite <name>` | No | `string` | — | Run a specific suite only |
| `--model <model>` | No | `string` | — | Model override |
| `--concurrency <n>` | No | `number` | `4` | Concurrent test execution |
| `--timeout <ms>` | No | `number` | `30000` | Per-test timeout |
| `--json` | No | `boolean` | `false` | Output as JSON |
| `--verbose` | No | `boolean` | `false` | Per-test detail output |

```bash
agentbench benchmark run agentbench/customer-support-v2 --agent ./src/agent.ts
agentbench benchmark run agentbench/customer-support-v2 --agent ./src/agent.ts --suite "Refund Scenarios" --verbose
```

### `benchmark submit <slug>`

Submit benchmark results to the public leaderboard.

| Option | Required | Type | Description |
|---|---|---|---|
| `--run <id>` | Yes | `string` | Run ID to submit |
| `--agent-name <name>` | No | `string` | Display name for the agent |
| `--author <name>` | No | `string` | Author name |
| `--version <ver>` | No | `string` | Agent version |

```bash
agentbench benchmark submit agentbench/customer-support-v2 --run run_abc123 --agent-name "MyBot v2"
```

### `benchmark publish <path>`

Publish a benchmark package to the marketplace.

| Option | Type | Default | Description |
|---|---|---|---|
| `--dry-run` | `boolean` | `false` | Validate without publishing |

```bash
agentbench benchmark publish ./my-benchmark
agentbench benchmark publish ./my-benchmark --dry-run
```

### `benchmark list`

List locally installed benchmarks.

```bash
agentbench benchmark list
agentbench benchmark list --json
```

---

## Common Pitfalls

### API server not running

Commands like `run`, `evaluate`, `replay`, and `snapshot` require the API server. Start it with `docker compose up -d` followed by `pnpm dev`.

**Fix:** Use local-only commands (`test`, `dataset`, `dev`) if you don't need the API server.

### Temperature parsing

The `--temperature` flag accepts string input. Invalid values (e.g., non-numeric) will produce `NaN`.

**Fix:** Always pass numeric values: `--temperature 0.7` not `--temperature "low"`.

### Watch mode not detecting changes

The `dev` command uses polling-based watching (via `fs.stat`). If your poll interval is too long, changes may be missed or delayed.

**Fix:** Reduce `--poll-interval` to `500` for faster detection at the cost of higher CPU usage.

### JUnit XML encoding

The `--junit` flag properly escapes XML entities (`<`, `>`, `&`, `"`, `'`). If your CI system shows malformed XML, ensure you are piping output to a file correctly.

**Fix:** Use `agentbench test --junit > results.xml` (not `|` to another process that may truncate).

### Config key not found

The `config get` command reads from `.env.agentbench`, not `agentbench.config.ts`. It shows `(not set)` if the key is not in the env config.

**Fix:** Use `config set <key> <value>` to add the key, or edit `.env.agentbench` directly.

---

## Next Steps

- [Configuration Reference](./config.md) -- Configure every aspect of AgentBench via `agentbench.config.ts`
- [Assertion DSL Reference](./assertion-dsl.md) -- Write expressive chainable assertions in TypeScript
- [REST API Reference](./api.md) -- Interact with AgentBench programmatically
- [A/B Testing AI Agents](../cookbook/agent-ab-testing.md) -- Run statistically valid experiments
- [Catching Prompt Regressions](../cookbook/catching-prompt-regressions.md) -- Detect prompt quality regressions
