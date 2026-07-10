---
title: "Migration Guide: v0.2.0 to v0.3.0"
description: "Step-by-step migration guide for existing AgentBench v0.2.0 users — breaking changes, new configuration format, new CLI commands, provider migration, storage path changes, and a complete migration checklist."
targetAudience: "Existing AgentBench users upgrading from v0.2.0"
readingTime: "8 min"
prerequisites:
  - "AgentBench v0.2.0 project"
  - "Node.js >= 20, pnpm >= 9"
---

## Overview

AgentBench v0.3.0 ("Adoption") is a major feature release that maintains backward compatibility with v0.2.0. Your existing `agentbench.config.ts`, tests, snapshots, and project data will continue to work. However, v0.3.0 introduces new capabilities and some reorganized defaults that you should adopt to get the full benefit.

This guide walks you through the changes and provides a checklist for a smooth migration.

---

## 1. Breaking Changes

**v0.3.0 maintains backward compatibility.** There are no hard breaking changes that will prevent your existing v0.2.0 project from working. However, there are behavioral changes and new defaults to be aware of:

### Summary of Changes

| Area | v0.2.0 | v0.3.0 | Impact |
|------|--------|--------|--------|
| Config format | Manual `agentbench.config.ts` | New `defineConfig()` helper from `@agentbench/config` | Optional; old format still works |
| Snapshot path | `<project>/.snapshots/` | `.agentbench/snapshots/` | Move your snapshots or keep old path via config |
| Report output | `./report/` | `./reports/` (plural) | Update CI scripts |
| CLI commands | 11 commands | 13 commands (`dataset`, `benchmark` added) | New capabilities |
| Providers | Manual config per provider | Auto-discovery + 6 new built-in providers | Existing configs continue to work |
| VS Code | None | Full extension | Install from marketplace |
| Dataset system | Basic | Full module with import/export/version/diff | New feature |
| `.gitignore` entries | Minimal | `.agentbench/`, `report/`, `*.snap`, `reports/` | Add new entries |

### No Deprecated APIs

No v0.2.0 APIs have been deprecated in v0.3.0. All existing code paths remain functional.

---

## 2. New Configuration Format

### Old Format (v0.2.0, still works)

```typescript
// agentbench.config.ts (v0.2.0)
import type { AgentBenchConfig } from '@agentbench/core'

const config: AgentBenchConfig = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
  },
}

export default config
```

### New Format (v0.3.0, recommended)

```typescript
// agentbench.config.ts (v0.3.0)
import { defineConfig } from '@agentbench/config'

export default defineConfig({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      defaultModel: 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultModel: 'claude-sonnet-4-20250514',
    },
    // Auto-discovered providers don't need explicit config
  },

  // New: snapshots directory
  snapshotsDir: '.agentbench/snapshots/',

  // New: report output directory
  reportDir: 'reports/',

  // New: CI-specific settings
  ci: {
    budget: 10.00,
    retries: 2,
    concurrency: 2,
    failOnRegression: true,
  },

  // New: Custom judges
  judges: {
    defaultJudge: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  },

  // New: Test defaults
  test: {
    timeout: 300000,
    retries: 0,
    snapshotFormat: 'json',
  },
})
```

### Benefits of `defineConfig()`

- **TypeScript autocompletion**: Full type hints for all configuration options
- **Validation**: Invalid configs are caught at startup with descriptive errors
- **Deep merge**: `defineConfig()` supports async configs and deep-merges multiple config sources
- **Environment interpolation**: `process.env.X` references work automatically

### Migration

You can adopt `defineConfig()` incrementally:

```bash
pnpm add @agentbench/config
```

Then wrap your existing config:

```typescript
import { defineConfig } from '@agentbench/config'
import oldConfig from './agentbench.config'  // Your existing v0.2.0 config

export default defineConfig(oldConfig)
```

---

## 3. New CLI Commands

v0.3.0 adds two new top-level commands:

### `agentbench dataset`

```bash
# Import data from various formats
agentbench dataset import <id> --format csv --source data.csv

# Export dataset
agentbench dataset export <id> --format json

# Validate dataset integrity
agentbench dataset validate <id>

# Split into train/test/validation
agentbench dataset split <id> --ratios "70:15:15"

# Sample for quick runs
agentbench dataset sample <id> --size 10

# Version management
agentbench dataset version create <id> --tag "v1.0.0"
agentbench dataset version list <id>
agentbench dataset diff <id> v1.0.0 v1.1.0
```

### `agentbench benchmark`

```bash
# Search published benchmarks
agentbench benchmark search "customer support"

# View benchmark details
agentbench benchmark info customer-support-v1

# Install a benchmark
agentbench benchmark install customer-support-v1

# Run a benchmark
agentbench benchmark run customer-support-v1

# Submit results to leaderboard
agentbench benchmark submit customer-support-v1

# Publish your own benchmark
agentbench benchmark publish --name "my-custom-benchmark"
```

### Updated Test Command Flags

The `test` command supports new flags in v0.3.0:

```bash
agentbench test --ci              # CI mode (new: strict exit codes, JUnit output)
agentbench test --watch           # Watch mode (new: auto re-run on file changes)
agentbench test --replay          # Replay from snapshots (new: deterministic testing)
agentbench test --update-snapshots # Update stored snapshots
agentbench test --coverage        # Coverage report (new: assertion coverage)
agentbench test --json            # JSON output
agentbench test --junit           # JUnit XML output
agentbench test --budget 10.00    # Cost budget gate
agentbench test --concurrency 2   # Concurrency limit
agentbench test --retries 2       # Flaky test retries
agentbench test --output-dir reports/  # Custom output directory
```

---

## 4. New Provider Packages

v0.3.0 adds 6 new built-in provider packages:

| Package | Provider | Auto-discovered |
|---------|----------|----------------|
| `@agentbench/gemini` | Google Gemini | Yes |
| `@agentbench/deepseek` | DeepSeek | Yes |
| `@agentbench/azure-openai` | Azure OpenAI | Yes |
| `@agentbench/openrouter` | OpenRouter | Yes |
| `@agentbench/groq` | Groq | Yes |
| `@agentbench/ollama` | Ollama (local) | Yes |

### Migrating from Manual Provider Config

If you had manual provider configurations in v0.2.0 using `@agentbench/adapter`:

```typescript
// v0.2.0 — manual provider via adapter
import { createAdapter } from '@agentbench/adapter'

const customProvider = createAdapter({
  name: 'my-gemini-agent',
  provider: 'custom',
  run: async (input) => {
    const response = await fetch('https://generativelanguage.googleapis.com/...')
    return { output: response.text }
  },
})
```

```typescript
// v0.3.0 — native Gemini provider
import { GeminiProvider } from '@agentbench/gemini'

const runner = new Runner({
  agent: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    systemPrompt: 'You are helpful.',
  },
  client: new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY! }),
})
```

### Provider Auto-Discovery

Install a provider package and it is automatically available:

```bash
pnpm add @agentbench/gemini
```

```typescript
// No manual registration needed — just use the provider ID
const runner = new Runner({
  agent: { provider: 'gemini', model: 'gemini-2.0-flash', /* ... */ },
})
```

---

## 5. Snapshot Storage Path Change

### Old Path (v0.2.0)

```
<project-root>/.snapshots/
  ├── run-abc123.json
  └── run-def456.json
```

### New Path (v0.3.0)

```
<project-root>/.agentbench/
  └── snapshots/
      ├── run-abc123.json
      └── run-def456.json
```

### Migration

**Option A: Move existing snapshots**

```bash
mkdir -p .agentbench
mv .snapshots .agentbench/snapshots
```

**Option B: Keep old path (via config)**

```typescript
export default defineConfig({
  snapshotsDir: '.snapshots/',  // Keep v0.2.0 path
})
```

---

## 6. Report Output Directory Change

### Old Path (v0.2.0)

```
./report/
  ├── results.json
  ├── summary.md
  └── traces/
```

### New Path (v0.3.0)

```
./reports/
  ├── results.json
  ├── junit.xml
  ├── summary.md
  └── traces/
```

### Update CI Scripts

```diff
# v0.2.0
- agentbench test -o report/

# v0.3.0
+ agentbench test --output-dir reports/
```

```diff
# Update artifact paths in CI
- - uses: actions/upload-artifact@v3
-   with:
-     path: report/

+ - uses: actions/upload-artifact@v4
+   with:
+     path: reports/
```

---

## 7. .gitignore Additions

Add these new entries to your `.gitignore`:

```diff
# AgentBench
+.agentbench/
+reports/
 *.snap
 .env.agentbench
```

Remove any old entries:

```diff
- report/
- .snapshots/
```

---

## 8. New Template Structure for `agentbench init`

The v0.3.0 `agentbench init` generates a richer project structure:

### v0.2.0 Structure

```
my-agent/
├── agentbench.config.ts
├── tests/
│   └── agent.test.ts
└── .env
```

### v0.3.0 Structure

```
my-agent/
├── agentbench.config.ts
├── .env.agentbench
├── .github/
│   └── workflows/
│       └── agentbench.yml          # New: auto-generated CI workflow
├── src/
│   └── agent/
│       └── index.ts                # Agent implementation
├── tests/
│   ├── suites/
│   │   ├── basic.test.ts
│   │   └── advanced.test.ts
│   └── helpers/
│       └── setup.ts
├── datasets/
│   └── scenarios.csv               # New: sample dataset
└── snapshots/                      # New: snapshot storage
```

### Re-initializing

If you want to adopt the new template structure, run `agentbench init` in a new directory and copy your existing tests into it, or manually create the new directories and files.

---

## 9. Complete Migration Checklist

Use this checklist to track your migration progress:

### Configuration

- [ ] Install v0.3.0: `pnpm add agentbench@latest @agentbench/core@latest`
- [ ] Install `@agentbench/config`: `pnpm add @agentbench/config`
- [ ] Wrap existing config with `defineConfig()` from `@agentbench/config`
- [ ] Add new config sections: `ci`, `judges`, `test`
- [ ] Update provider configs for any new providers you want to use

### File System

- [ ] Move snapshots: `.snapshots/` to `.agentbench/snapshots/` (or update config)
- [ ] Update report output paths in CI scripts: `report/` to `reports/`
- [ ] Add `.agentbench/` and `reports/` to `.gitignore`
- [ ] Remove old `report/` and `.snapshots/` from `.gitignore` if present

### CLI

- [ ] Update CI scripts to use new flags: `--ci`, `--json`, `--junit`, `--budget`
- [ ] Update `agentbench test -o report/` to `agentbench test --output-dir reports/`
- [ ] Explore new commands: `agentbench dataset`, `agentbench benchmark`

### Providers

- [ ] Review which of the 6 new providers you can use
- [ ] Migrate any manual `@agentbench/adapter` configs to native providers
- [ ] Remove provider packages you no longer need

### Testing

- [ ] Try `agentbench test --watch` for development workflow
- [ ] Try `agentbench test --replay` for deterministic CI testing
- [ ] Add cost budgets to your CI workflow: `--budget 10.00`
- [ ] Set up regression detection: `--fail-on-regression`

### CI/CD

- [ ] Regenerate CI workflow: `agentbench init --ci` (or manually update)
- [ ] Update GitHub Actions workflow trigger paths to include `datasets/**`
- [ ] Add new provider API keys as CI secrets
- [ ] Update `actions/upload-artifact` from `v3` to `v4`

### Data

- [ ] Explore the dataset system: `agentbench dataset --help`
- [ ] Import existing test data into datasets for structured management
- [ ] Set up dataset versioning for your test scenarios

### Tooling

- [ ] Install the VS Code extension from the marketplace
- [ ] Configure VS Code extension settings if needed
- [ ] Try CodeLens "Run Test" and "Debug Test" in your test files

### Verification

- [ ] Run `agentbench test` locally to verify nothing is broken
- [ ] Run `agentbench test --ci` locally to verify CI mode works
- [ ] Push to a branch and verify CI passes
- [ ] Review PR comment format if using the composite action

---

## 10. Version Compatibility Matrix

| AgentBench Version | Node.js | pnpm | TypeScript |
|-------------------|---------|------|------------|
| v0.2.0 | >= 18 | >= 8 | >= 5.0 |
| v0.3.0 | >= 20 | >= 9 | >= 5.0 |

### Upgrading Node.js and pnpm

If you are on older versions:

```bash
# Upgrade Node.js (via nvm or your preferred method)
nvm install 20
nvm use 20

# Upgrade pnpm
npm install -g pnpm@latest
```

---

## Common Pitfalls

### Snapshots "not found" after migration

If your snapshots were at `.snapshots/` but v0.3.0 looks at `.agentbench/snapshots/`, tests with `--replay` flag will fail with "snapshot not found." Either move the files or update `snapshotsDir` in your config.

### CI scripts referencing old report path

If your CI uploads artifacts from `report/` but v0.3.0 outputs to `reports/`, the upload step will silently produce an empty artifact. Update the path.

### New `.gitignore` entries not applied

After adding `.agentbench/` and `reports/` to `.gitignore`, make sure these paths are not already tracked by git. If they are:

```bash
git rm -r --cached .agentbench/ reports/
git commit -m "Remove tracked .agentbench/ and reports/ directories"
```

### Provider auto-discovery not working

If you installed `@agentbench/provider-gemini` but can't use `provider: 'gemini'` in your config, check that:
1. The package is installed in `node_modules`
2. The package name starts with `@agentbench/provider-`
3. The provider's `id` field matches your config

### `defineConfig` TypeScript errors

If you see type errors after wrapping your config with `defineConfig()`, ensure you have `@agentbench/config` installed and that your `tsconfig.json` includes the paths:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

---

## Getting Help

If you encounter issues during migration:

- **GitHub Issues:** [github.com/1304674612/agentbench/issues](https://github.com/1304674612/agentbench/issues)
- **Documentation:** [docs/](../INDEX.md)
- **v0.3.0 Status:** [docs/v0.3/STATUS.md](../v0.3/STATUS.md)

---

## Next Steps

- [Testing OpenAI Agents](./testing-openai-agents.md) — Updated patterns for v0.3.0
- [CI/CD Integration](./ci-cd-integration.md) — Set up CI with the new workflow
- [Dataset Management Guide](./dataset-management.md) — Start using the new dataset system
- [Building Custom Providers](./custom-providers.md) — Build integrations for new providers

---

> [Back to Documentation Center](../INDEX.md)
