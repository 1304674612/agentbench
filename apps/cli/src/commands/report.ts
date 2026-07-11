import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'

export function registerReportCommand(program: Command): void {
  program
    .command('report [run-id]')
    .description('Generate a report for a run')
    .option('--json', 'Output as JSON')
    .action(async (runId, options) => {
      if (!options.json) {
        console.log(chalk.blue('⚡ Generating report...'))
      }

      const spinner = options.json ? null : ora('Fetching data...').start()

      try {
        if (runId) {
          const run = await apiClient.getRun(runId)
          spinner?.succeed('Report generated')

          if (options.json) {
            console.log(JSON.stringify(run, null, 2))
          } else {
            const metrics = run.metrics ?? {}
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
        } else {
          const { runs } = await apiClient.listRuns()
          spinner?.succeed('Report generated')

          if (options.json) {
            console.log(JSON.stringify(runs, null, 2))
          } else {
            console.log('')
            console.log(chalk.bold('# Recent Runs Report'))
            console.log('')
            for (const run of runs) {
              console.log(
                `- **${run.name}**: ${run.status} | ${run.duration ? `${run.duration}ms` : '—'}`
              )
            }
          }
        }

        if (!options.json) {
          console.log('')
          console.log(chalk.green('✓ Report generated!'))
        }
      } catch (err) {
        spinner?.fail('Report generation failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
