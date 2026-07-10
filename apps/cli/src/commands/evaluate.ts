import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { section, statusIcon, summaryLine } from '../lib/format'
import * as nodeFs from 'node:fs'

export function registerEvaluateCommand(program: Command): void {
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
    .option('--json', 'Output as JSON')
    .action(async (runId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`⚡ Evaluating run: ${runId}`))
      }

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
          const schemaContent = nodeFs.readFileSync(options.jsonSchema, 'utf-8')
          const schema = JSON.parse(schemaContent) as unknown
          rules.push({ type: 'json_schema', params: { schema: schema as Record<string, unknown> } })
        }

        if (rules.length === 0) {
          console.log(chalk.yellow('No evaluation rules specified. Use --help to see options.'))
          return
        }

        const spinner = options.json ? null : ora('Evaluating...').start()
        const result = await apiClient.evaluateRun(runId, { rules })
        spinner?.succeed('Evaluation complete')

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log('')
          console.log(section('Evaluation Results'))
          console.log('')

          if (options.verbose) {
            for (const ar of result.assertionResults) {
              const icon = statusIcon(ar.status)
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
          console.log(summaryLine('Total', `${summary.totalRules} rule(s)`))

          // Score summary
          if (result.scores.length > 0) {
            console.log('')
            console.log(chalk.bold('Scores:'))
            for (const s of result.scores) {
              console.log(summaryLine(s.evaluator, `${s.score}/${s.maxScore} — ${s.reason}`))
            }
          }

          if (summary.failed > 0) process.exit(1)
        }
      } catch (err) {
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
