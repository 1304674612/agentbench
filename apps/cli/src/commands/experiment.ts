import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { summaryLine } from '../lib/format'

export function registerExperimentCommand(program: Command): void {
  const experimentCmd = program.command('experiment').description('Experiment management')

  // experiment run
  experimentCmd
    .command('run <experiment-id>')
    .description('Run an experiment')
    .option('-p, --project <id>', 'Project ID')
    .option('--json', 'Output as JSON')
    .action(async (experimentId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`⚡ Running experiment: ${experimentId}`))
      }

      const spinner = options.json ? null : ora('Starting experiment...').start()

      try {
        const result = await apiClient.runExperiment(experimentId)

        spinner?.succeed(result.message)

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          for (const r of result.runs) {
            console.log(summaryLine(`[${r.variant}]`, r.id))
          }
        }
      } catch (err) {
        spinner?.fail('Experiment failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })

  // experiment results
  experimentCmd
    .command('results <experiment-id>')
    .description('View experiment results')
    .option('--json', 'Output as JSON')
    .action(async (experimentId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`Experiment results: ${experimentId}`))
      }

      const spinner = options.json ? null : ora('Fetching experiment results...').start()

      try {
        const exp = await apiClient.getExperiment(experimentId)

        spinner?.succeed('Results fetched')

        if (options.json) {
          console.log(JSON.stringify(exp, null, 2))
        } else {
          console.log(chalk.bold(`\n${exp.name}`))
          console.log(
            chalk.gray(`Status: ${exp.status}  Conclusion: ${exp.conclusion ?? 'pending'}\n`)
          )
          for (const [name, s] of Object.entries(exp.summary)) {
            const icon = s.passedCount === s.runCount ? chalk.green('✓') : chalk.yellow('⚠')
            console.log(
              `  ${icon} Variant ${name}: ${s.passedCount}/${s.runCount} passed (avg ${s.avgDuration}ms)`
            )
          }
        }
      } catch (err) {
        spinner?.fail('Failed to fetch experiment results')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
