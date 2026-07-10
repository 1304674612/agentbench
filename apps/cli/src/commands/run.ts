import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import type { CreateRunParams } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { summaryLine } from '../lib/format'

export function registerRunCommand(program: Command): void {
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
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      if (!options.json) {
        console.log(chalk.blue('⚡ Creating agent test run...'))
        console.log(summaryLine('Project', options.project))
        console.log(summaryLine('Name', options.name))
        console.log(summaryLine('Model', `${options.provider}/${options.model}`))
      }

      const spinner = options.json ? null : ora('Creating run...').start()

      try {
        const params: CreateRunParams = {
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
        }
        const result = await apiClient.createRun(params)

        spinner?.succeed('Run created!')

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(summaryLine('Run ID', result.id))
          console.log(summaryLine('Status', result.status))
          console.log(
            summaryLine(
              'View',
              `${apiClient.apiBase.replace('/api/v1', '')}/runs/${result.id}`
            )
          )
        }
      } catch (err) {
        spinner?.fail('Run creation failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
