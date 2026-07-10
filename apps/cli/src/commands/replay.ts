import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import type { ReplayRunParams } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { summaryLine } from '../lib/format'

export function registerReplayCommand(program: Command): void {
  program
    .command('replay <run-id>')
    .description('Replay a previous run')
    .option('-m, --model <model>', 'Replay with a different model')
    .option('--provider <provider>', 'Replay with a different provider')
    .option('--temperature <temp>', 'Override temperature')
    .option('--mode <mode>', 'Replay mode: deterministic, cross_model, batch', 'deterministic')
    .option('--batch-count <n>', 'Number of batch runs (for batch mode)', '5')
    .option('--seed <n>', 'Seed for deterministic replay')
    .option('--no-parallel', 'Disable parallel execution in batch mode')
    .option('--json', 'Output as JSON')
    .action(async (runId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`⚡ Replaying run: ${runId}`))
        console.log(summaryLine('Mode', options.mode))
      }

      const spinner = options.json ? null : ora('Creating replay runs...').start()

      try {
        const body: ReplayRunParams = {
          mode: options.mode,
          parallel: options.parallel !== false,
        }

        if (options.model) body.model = options.model
        if (options.provider) body.provider = options.provider
        if (options.temperature) body.temperature = parseFloat(options.temperature)
        if (options.seed) body.seed = parseInt(options.seed)
        if (options.mode === 'batch') body.batchCount = parseInt(options.batchCount)

        const result = await apiClient.replayRun(runId, body)

        spinner?.succeed(`${result.replayRuns.length} replay run(s) created!`)

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log('')
          for (const r of result.replayRuns) {
            console.log(summaryLine(r.name, r.id))
          }

          if (result.replayRuns.length > 1) {
            console.log('')
            console.log(
              chalk.gray(`  Compare: agentbench compare ${runId} ${result.replayRuns[0].id}`)
            )
          }
        }
      } catch (err) {
        spinner?.fail('Replay failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
