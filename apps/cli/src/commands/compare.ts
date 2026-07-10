import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'

export function registerCompareCommand(program: Command): void {
  program
    .command('compare <run-a> <run-b>')
    .description('Compare two runs')
    .option('--json', 'Output as JSON')
    .action(async (runAId, runBId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`⚡ Comparing ${runAId} ↔ ${runBId}`))
      }

      const spinner = options.json ? null : ora('Fetching runs...').start()

      try {
        const [runA, runB] = await Promise.all([
          apiClient.getRun(runAId),
          apiClient.getRun(runBId),
        ])

        spinner?.succeed('Runs fetched')

        const metricsA = runA.metrics ?? {}
        const metricsB = runB.metrics ?? {}

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                runA: { id: runA.id, status: runA.status, metrics: metricsA },
                runB: { id: runB.id, status: runB.status, metrics: metricsB },
              },
              null,
              2
            )
          )
        } else {
          console.log('')
          console.log(chalk.bold('Comparison:'))
          console.log(`  Status:    ${runA.status} vs ${runB.status}`)
          console.log(`  Duration:  ${runA.duration ?? '—'}ms vs ${runB.duration ?? '—'}ms`)
          console.log(
            `  Tokens:    ${metricsA.totalTokens ?? '—'} vs ${metricsB.totalTokens ?? '—'}`
          )
          console.log(
            `  Cost:      $${(metricsA.totalCost as number)?.toFixed(4) ?? '—'} vs $${(metricsB.totalCost as number)?.toFixed(4) ?? '—'}`
          )
          console.log(
            `  Steps:     ${metricsA.stepCount ?? '—'} vs ${metricsB.stepCount ?? '—'}`
          )
        }
      } catch (err) {
        spinner?.fail('Comparison failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
