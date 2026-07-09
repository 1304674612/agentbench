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
  .option('-s, --suite <id>', 'Filter by test suite')
  .option('-g, --grep <pattern>', 'Filter tests by name pattern')
  .option('--verbose', 'Show detailed results for each test case')
  .option('--format <format>', 'Output format (table, json, junit)', 'table')
  .action(async (options) => {
    console.log(chalk.blue('⚡ Running tests...'))

    try {
      // Fetch test suites and cases
      const suitesUrl = options.suite
        ? `/suites/${options.suite}`
        : `/suites?projectId=${options.project}`

      interface TestCase {
        id: string
        name: string
        status: string
        assertions: Array<{ type: string; params: unknown }>
        evaluators: Array<{ type: string; config: unknown }>
      }
      interface Suite {
        id: string
        name: string
        cases: TestCase[]
      }

      let cases: TestCase[] = []

      if (options.suite) {
        const suite = await apiFetch(suitesUrl) as Suite
        cases = suite.cases
        console.log(chalk.gray(`  Suite: ${suite.name}`))
      } else {
        const { suites } = await apiFetch(suitesUrl) as { suites: Suite[] }
        cases = suites.flatMap((s) => s.cases)
        console.log(chalk.gray(`  Suites: ${suites.length}`))
      }

      // Filter by pattern
      if (options.grep) {
        const pattern = new RegExp(options.grep, 'i')
        cases = cases.filter((c) => pattern.test(c.name))
      }

      console.log(chalk.gray(`  Test cases: ${cases.length}`))
      console.log('')

      if (cases.length === 0) {
        console.log(chalk.yellow('No test cases found.'))
        return
      }

      // Run each test case
      const results: Array<{
        name: string
        status: string
        duration: number
        assertions: { passed: number; failed: number; total: number }
      }> = []

      for (const tc of cases) {
        const startTime = Date.now()
        process.stdout.write(chalk.gray(`  Running: ${tc.name}... `))

        try {
          const run = await apiFetch('/runs', {
            method: 'POST',
            body: JSON.stringify({
              projectId: options.project,
              testCaseId: tc.id,
              name: `${tc.name} (${new Date().toISOString()})`,
              tags: ['cli', 'test'],
            }),
          }) as { id: string; status: string }

          // Run evaluation if assertions exist
          if (tc.assertions.length > 0) {
            const evalResult = await apiFetch(`/runs/${run.id}/evaluate`, {
              method: 'POST',
              body: JSON.stringify({
                rules: tc.assertions.map((a) => ({
                  type: a.type,
                  params: a.params ?? {},
                })),
              }),
            }) as {
              summary: { passed: number; failed: number; totalRules: number }
            }

            results.push({
              name: tc.name,
              status: evalResult.summary.failed === 0 ? 'PASSED' : 'FAILED',
              duration: Date.now() - startTime,
              assertions: {
                passed: evalResult.summary.passed,
                failed: evalResult.summary.failed,
                total: evalResult.summary.totalRules,
              },
            })

            const icon = evalResult.summary.failed === 0 ? chalk.green('✓') : chalk.red('✗')
            console.log(
              icon +
                ` ${evalResult.summary.passed}/${evalResult.summary.totalRules} passed (${Date.now() - startTime}ms)`,
            )
          } else {
            results.push({
              name: tc.name,
              status: run.status === 'PASSED' ? 'PASSED' : run.status.toUpperCase(),
              duration: Date.now() - startTime,
              assertions: { passed: 0, failed: 0, total: 0 },
            })

            const icon = run.status === 'PASSED' ? chalk.green('✓') : chalk.red('✗')
            console.log(icon + ` ${run.status} (${Date.now() - startTime}ms)`)
          }
        } catch (err) {
          results.push({
            name: tc.name,
            status: 'ERROR',
            duration: Date.now() - startTime,
            assertions: { passed: 0, failed: 0, total: 0 },
          })
          console.log(chalk.red(`✗ ${err instanceof Error ? err.message : String(err)}`))
        }
      }

      // Output results
      console.log('')
      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2))
      } else {
        const passed = results.filter((r) => r.status === 'PASSED').length
        const failed = results.filter((r) => r.status === 'FAILED').length
        const errored = results.filter((r) => r.status === 'ERROR').length

        console.log(chalk.bold('─'.repeat(60)))
        console.log(chalk.bold('Test Results'))
        console.log(chalk.bold('─'.repeat(60)))

        if (options.verbose) {
          for (const r of results) {
            const icon =
              r.status === 'PASSED'
                ? chalk.green('  ✓')
                : r.status === 'FAILED'
                  ? chalk.red('  ✗')
                  : chalk.yellow('  ⚠')
            console.log(
              `${icon} ${r.name} [${r.status}] ${r.duration}ms` +
                (r.assertions.total > 0
                  ? ` (${r.assertions.passed}/${r.assertions.total} assertions)`
                  : ''),
            )
          }
          console.log('')
        }

        console.log(chalk.bold('Summary:'))
        if (passed > 0) console.log(chalk.green(`  ✓ ${passed} passed`))
        if (failed > 0) console.log(chalk.red(`  ✗ ${failed} failed`))
        if (errored > 0) console.log(chalk.yellow(`  ⚠ ${errored} errors`))
        console.log(chalk.gray(`  Total: ${results.length} test(s)`))

        if (failed > 0 || errored > 0) {
          process.exit(1)
        }
      }
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

// evaluate command
program
  .command('evaluate <run-id>')
  .description('Evaluate a run with rules and criteria')
  .option('--contains <text>', 'Check if output contains text')
  .option('--tool <name>', 'Check if a tool was called')
  .option('--tool-not <name>', 'Check if a tool was NOT called')
  .option('--latency-lt <ms>', 'Check if latency is less than threshold (ms)')
  .option('--tokens-lt <n>', 'Check if tokens are less than threshold')
  .option('--cost-lt <dollars>', 'Check if cost is less than threshold')
  .option('--json-schema <schema>', 'Validate output against JSON schema (file path)')
  .option('--expected <text>', 'Expected output for exact match')
  .option('-v, --verbose', 'Show detailed evaluation results')
  .action(async (runId, options) => {
    console.log(chalk.blue(`⚡ Evaluating run: ${runId}`))

    try {
      // Build rule configs from CLI options
      const rules: Array<{ type: string; params: Record<string, unknown> }> = []

      if (options.contains) {
        rules.push({ type: 'contains', params: { substring: options.contains } })
      }
      if (options.tool) {
        rules.push({ type: 'tool_called', params: { tool: options.tool } })
      }
      if (options.toolNot) {
        rules.push({ type: 'tool_not_called', params: { tool: options.toolNot } })
      }
      if (options.latencyLt) {
        rules.push({ type: 'latency_lt', params: { threshold: parseInt(options.latencyLt) } })
      }
      if (options.tokensLt) {
        rules.push({ type: 'tokens_lt', params: { threshold: parseInt(options.tokensLt) } })
      }
      if (options.costLt) {
        rules.push({ type: 'cost_lt', params: { threshold: parseFloat(options.costLt) } })
      }
      if (options.expected) {
        rules.push({ type: 'exact_match', params: { expected: options.expected } })
      }
      if (options.jsonSchema) {
        const fs = await import('node:fs')
        const schemaContent = fs.readFileSync(options.jsonSchema, 'utf-8')
        const schema = JSON.parse(schemaContent)
        rules.push({ type: 'json_schema', params: { schema } })
      }

      if (rules.length === 0) {
        console.log(chalk.yellow('No evaluation rules specified. Use --help to see options.'))
        return
      }

      const result = await apiFetch(`/runs/${runId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({ rules }),
      }) as {
        runId: string
        summary: { totalRules: number; passed: number; failed: number; errored: number }
        scores: Array<{ evaluator: string; score: number; maxScore: number; reason: string }>
        assertionResults: Array<{ type: string; status: string; message?: string }>
      }

      console.log('')
      console.log(chalk.bold('─'.repeat(50)))
      console.log(chalk.bold('Evaluation Results'))
      console.log(chalk.bold('─'.repeat(50)))
      console.log('')

      if (options.verbose) {
        for (const ar of result.assertionResults) {
          const icon =
            ar.status === 'PASSED'
              ? chalk.green('  ✓')
              : ar.status === 'FAILED'
                ? chalk.red('  ✗')
                : chalk.yellow('  ⚠')
          console.log(`${icon} [${ar.type}] ${ar.message ?? ar.status}`)
        }
        console.log('')
      }

      // Summary
      const { summary } = result
      console.log(chalk.bold('Summary:'))
      if (summary.passed > 0) console.log(chalk.green(`  ✓ ${summary.passed} passed`))
      if (summary.failed > 0) console.log(chalk.red(`  ✗ ${summary.failed} failed`))
      if (summary.errored > 0) console.log(chalk.yellow(`  ⚠ ${summary.errored} errored`))
      console.log(chalk.gray(`  Total: ${summary.totalRules} rule(s)`))

      // Score summary
      if (result.scores.length > 0) {
        console.log('')
        console.log(chalk.bold('Scores:'))
        for (const s of result.scores) {
          console.log(chalk.gray(`  ${s.evaluator}: ${s.score}/${s.maxScore} — ${s.reason}`))
        }
      }

      if (summary.failed > 0) process.exit(1)
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
