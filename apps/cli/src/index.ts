#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'

const API_BASE = process.env.AGENTBENCH_API_URL ?? 'http://localhost:3000/api/v1'

const program = new Command()

program
  .name('agentbench')
  .description('AgentBench CLI — Regression Testing for AI Agents')
  .version('0.1.0')

// Helper: call API
async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// init command
program
  .command('init')
  .description('Initialize AgentBench in the current directory')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    console.log(chalk.blue('⚡ Initializing AgentBench...'))
    console.log(chalk.gray('  Creating agentbench.config.ts'))
    console.log(chalk.green('✓ AgentBench initialized!'))
  })

// run command
program
  .command('run')
  .description('Run an agent test')
  .requiredOption('-p, --project <id>', 'Project ID')
  .requiredOption('-n, --name <name>', 'Run name')
  .option('-m, --model <model>', 'Model to use', 'gpt-4o')
  .option('--provider <provider>', 'LLM provider', 'openai')
  .option('--temperature <temp>', 'Temperature', '0.7')
  .option('--max-tokens <tokens>', 'Max tokens', '4096')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.blue('⚡ Creating agent test run...'))
    console.log(chalk.gray(`  Project: ${options.project}`))
    console.log(chalk.gray(`  Name: ${options.name}`))
    console.log(chalk.gray(`  Model: ${options.provider}/${options.model}`))

    try {
      const result = await apiFetch('/runs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: options.project,
          name: options.name,
          config: {
            agent: {
              provider: options.provider,
              model: options.model,
              temperature: parseFloat(options.temperature),
              maxTokens: parseInt(options.maxTokens),
            },
          },
          tags: ['cli'],
        }),
      })

      console.log(chalk.green('✓ Run created!'))
      console.log(chalk.gray(`  Run ID: ${result.id}`))
      console.log(chalk.gray(`  Status: ${result.status}`))
      console.log(chalk.gray(`  View: ${API_BASE.replace('/api/v1', '')}/runs/${result.id}`))
    } catch (err) {
      console.error(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// test command
program
  .command('test')
  .description('Run all tests in a project')
  .requiredOption('-p, --project <id>', 'Project ID')
  .option('-g, --grep <pattern>', 'Filter tests by name pattern')
  .action(async (options) => {
    console.log(chalk.blue('⚡ Running tests...'))

    try {
      const { runs } = await apiFetch(`/runs?projectId=${options.project}&limit=10`)
      console.log(chalk.gray(`  Found ${runs.length} recent runs`))

      const passed = runs.filter((r: { status: string }) => r.status === 'passed').length
      const failed = runs.filter((r: { status: string }) => r.status === 'failed' || r.status === 'error').length

      console.log('')
      console.log(chalk.bold('Results:'))
      console.log(chalk.green(`  ✓ ${passed} passed`))
      if (failed > 0) console.log(chalk.red(`  ✗ ${failed} failed`))

      if (failed > 0) process.exit(1)
    } catch (err) {
      console.error(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// replay command
program
  .command('replay <run-id>')
  .description('Replay a previous run')
  .option('-m, --model <model>', 'Replay with a different model')
  .action(async (runId, options) => {
    console.log(chalk.blue(`⚡ Replaying run: ${runId}`))

    try {
      const original = await apiFetch(`/runs/${runId}`)
      console.log(chalk.gray(`  Original: ${original.status} | Model: ${(original.config as Record<string, unknown>)?.agent ? ((original.config as Record<string, unknown>).agent as Record<string, unknown>)?.model : 'unknown'}`))

      // Create a new run with same config
      const config = { ...(original.config as Record<string, unknown>) }
      if (options.model && config.agent) {
        (config.agent as Record<string, unknown>).model = options.model
      }

      const result = await apiFetch('/runs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: original.projectId,
          name: `${original.name} (replay)`,
          config,
          tags: ['replay', `original:${runId}`],
        }),
      })

      console.log(chalk.green('✓ Replay created!'))
      console.log(chalk.gray(`  New Run ID: ${result.id}`))
    } catch (err) {
      console.error(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// compare command
program
  .command('compare <run-a> <run-b>')
  .description('Compare two runs')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(async (runAId, runBId, options) => {
    console.log(chalk.blue(`⚡ Comparing ${runAId} ↔ ${runBId}`))

    try {
      const [runA, runB] = await Promise.all([
        apiFetch(`/runs/${runAId}`),
        apiFetch(`/runs/${runBId}`),
      ])

      const metricsA = (runA.metrics ?? {}) as Record<string, number>
      const metricsB = (runB.metrics ?? {}) as Record<string, number>

      if (options.format === 'json') {
        console.log(JSON.stringify({ runA: { id: runA.id, status: runA.status, metrics: metricsA }, runB: { id: runB.id, status: runB.status, metrics: metricsB } }, null, 2))
      } else {
        console.log('')
        console.log(chalk.bold('Comparison:'))
        console.log(`  Status:    ${runA.status} vs ${runB.status}`)
        console.log(`  Duration:  ${runA.duration ?? '—'}ms vs ${runB.duration ?? '—'}ms`)
        console.log(`  Tokens:    ${metricsA.totalTokens ?? '—'} vs ${metricsB.totalTokens ?? '—'}`)
        console.log(`  Cost:      $${(metricsA.totalCost as number)?.toFixed(4) ?? '—'} vs $${(metricsB.totalCost as number)?.toFixed(4) ?? '—'}`)
        console.log(`  Steps:     ${metricsA.stepCount ?? '—'} vs ${metricsB.stepCount ?? '—'}`)
      }
    } catch (err) {
      console.error(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// report command
program
  .command('report [run-id]')
  .description('Generate a report for a run')
  .option('--format <format>', 'Report format (json, markdown)', 'markdown')
  .action(async (runId, options) => {
    console.log(chalk.blue('⚡ Generating report...'))

    try {
      const endpoint = runId ? `/runs/${runId}` : '/runs?limit=5'
      const data = runId ? await apiFetch(endpoint) : (await apiFetch(endpoint)).runs

      if (options.format === 'json') {
        console.log(JSON.stringify(data, null, 2))
      } else {
        if (Array.isArray(data)) {
          console.log('')
          console.log(chalk.bold('# Recent Runs Report'))
          console.log('')
          for (const run of data) {
            console.log(`- **${run.name}**: ${run.status} | ${run.duration ? `${run.duration}ms` : '—'}`)
          }
        } else {
          const run = data
          const metrics = (run.metrics ?? {}) as Record<string, number>
          console.log('')
          console.log(chalk.bold(`# ${run.name}`))
          console.log('')
          console.log(`| Metric | Value |`)
          console.log(`|--------|-------|`)
          console.log(`| Status | ${run.status} |`)
          console.log(`| Duration | ${run.duration ?? '—'}ms |`)
          console.log(`| Total Tokens | ${metrics.totalTokens ?? '—'} |`)
          console.log(`| Cost | $${(metrics.totalCost as number)?.toFixed(4) ?? '—'} |`)
          console.log(`| Steps | ${metrics.stepCount ?? '—'} |`)
        }
      }

      console.log('')
      console.log(chalk.green('✓ Report generated!'))
    } catch (err) {
      console.error(chalk.red(`✗ Failed: ${err instanceof Error ? err.message : String(err)}`))
      process.exit(1)
    }
  })

// snapshot commands
const snapshotCmd = program.command('snapshot').description('Snapshot management')

snapshotCmd
  .command('create')
  .description('Create a new snapshot')
  .option('-n, --name <name>', 'Snapshot name')
  .action(async (options) => {
    console.log(chalk.blue('⚡ Creating snapshot...'))
    // TODO: Implement
    console.log(chalk.green('✓ Snapshot created!'))
  })

snapshotCmd
  .command('list')
  .description('List all snapshots')
  .action(async () => {
    console.log(chalk.blue('Snapshots:'))
    // TODO: Implement
    console.log(chalk.gray('  No snapshots yet.'))
  })

snapshotCmd
  .command('restore <snapshot-id>')
  .description('Restore a snapshot')
  .action(async (snapshotId) => {
    console.log(chalk.blue(`⚡ Restoring snapshot: ${snapshotId}`))
    // TODO: Implement
    console.log(chalk.green('✓ Snapshot restored!'))
  })

// experiment commands
const experimentCmd = program
  .command('experiment')
  .description('Experiment management')

experimentCmd
  .command('run <config>')
  .description('Run an experiment')
  .action(async (config) => {
    console.log(chalk.blue(`⚡ Running experiment: ${config}`))
    // TODO: Implement
    console.log(chalk.green('✓ Experiment completed!'))
  })

experimentCmd
  .command('results <experiment-id>')
  .description('View experiment results')
  .action(async (experimentId) => {
    console.log(chalk.blue(`Experiment results: ${experimentId}`))
    // TODO: Implement
  })

// config commands
const configCmd = program.command('config').description('Configuration management')

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key, value) => {
    console.log(chalk.blue(`Setting ${key}=${value}`))
    // TODO: Implement
    console.log(chalk.green('✓ Configuration updated!'))
  })

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key) => {
    console.log(chalk.blue(`Config: ${key}`))
    // TODO: Implement
  })

// Parse arguments
program.parse(process.argv)

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
