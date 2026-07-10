import type { AgentBenchConfig } from './types'

/**
 * Smart default configuration for AgentBench.
 *
 * These values follow Jest / Vitest / Playwright conventions so
 * developers feel immediately at home. Every value can be
 * overridden via `agentbench.config.ts`.
 *
 * | Key               | Default                  | Reasoning                                   |
 * |-------------------|--------------------------|---------------------------------------------|
 * | `testDir`         | `'./tests'`              | Matches Jest / Vitest                       |
 * | `timeout`         | `30000`                  | Generous default for LLM calls              |
 * | `retry`           | `2`                      | Mitigates transient API failures            |
 * | `maxConcurrency`  | `4`                      | Avoids rate-limiting most LLM APIs          |
 * | `scoreThreshold`  | `7`                      | 7/10 — solid baseline for production agents |
 * | `maxTokens`       | `4096`                   | Covers most single-turn completions         |
 * | `maxLatency`      | `30000`                  | 30s is a reasonable upper bound             |
 * | `judges`          | `correctness, faithfulness, safety` | Core evaluation dimensions     |
 * | `judgeModel`      | `'openai/gpt-4o-mini'`   | Cheap, fast, reliable for scoring           |
 * | `dimensions`      | `prompt, workflow, tool, edge-case` | Comprehensive coverage        |
 * | `formats`         | `terminal, json, html`   | CLI + machine-readable + visual             |
 * | `ci.provider`     | `'github-actions'`       | Most common CI platform                     |
 */
export const defaults: AgentBenchConfig = {
  providers: {},

  agent: {
    provider: undefined,
    model: undefined,
    temperature: 0,
    maxTokens: 4096,
  },

  test: {
    testDir: './tests',
    timeout: 30000,
    retry: 2,
    maxConcurrency: 4,
  },

  assertions: {
    scoreThreshold: 7,
    maxTokens: 4096,
    maxLatency: 30000,
    forbiddenTools: [],
  },

  replay: {
    enabled: false,
    storageDir: '.agentbench/replays',
    mode: 'deterministic',
  },

  evaluation: {
    judges: ['correctness', 'faithfulness', 'safety'],
    judgeModel: 'openai/gpt-4o-mini',
    scoreThreshold: 7,
  },

  coverage: {
    dimensions: ['prompt', 'workflow', 'tool', 'edge-case'],
    thresholds: {},
  },

  report: {
    formats: ['terminal', 'json', 'html'],
    outputDir: './agentbench-report',
  },

  ci: {
    provider: 'github-actions',
    failOnThreshold: true,
    commentOnPR: true,
    artifactsDir: './agentbench-artifacts',
  },
}
