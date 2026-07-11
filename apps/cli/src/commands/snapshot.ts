import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { summaryLine } from '../lib/format'

export function registerSnapshotCommand(program: Command): void {
  const snapshotCmd = program.command('snapshot').description('Snapshot management')

  // snapshot create
  snapshotCmd
    .command('create')
    .description('Create a new snapshot from a run')
    .requiredOption('-p, --project <id>', 'Project ID')
    .requiredOption('-r, --run <id>', 'Run ID to snapshot')
    .requiredOption('-n, --name <name>', 'Snapshot name')
    .option('-d, --description <desc>', 'Snapshot description')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      if (!options.json) {
        console.log(chalk.blue('⚡ Creating snapshot...'))
      }

      const spinner = options.json ? null : ora('Fetching run data...').start()

      try {
        const run = await apiClient.getRun(options.run)
        const config = run.config
        const agent = (config?.agent ?? {}) as Record<string, unknown>
        const input = (config?.input ?? { messages: [] }) as Record<string, unknown>
        const opts = (config?.options ?? {}) as Record<string, unknown>

        if (spinner) spinner.text = 'Creating snapshot...'

        const snapshot = await apiClient.createSnapshot(options.project, {
          name: options.name,
          description: options.description,
          runId: options.run,
          type: 'MANUAL',
          data: {
            agent: { name: run.name, config: agent },
            prompt: { system: agent.systemPrompt ?? '', variables: {} },
            model: {
              provider: agent.provider ?? 'openai',
              name: agent.model ?? 'unknown',
              temperature: agent.temperature ?? 0.7,
              maxTokens: agent.maxTokens ?? 4096,
            },
            tools: (agent.tools as unknown[]) ?? [],
            context: { messages: input.messages ?? [] },
            input,
            options: opts,
          },
          tags: ['cli'],
        })

        spinner?.succeed('Snapshot created!')

        if (options.json) {
          console.log(JSON.stringify(snapshot, null, 2))
        } else {
          console.log(summaryLine('ID', snapshot.id))
        }
      } catch (err) {
        spinner?.fail('Snapshot creation failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })

  // snapshot list
  snapshotCmd
    .command('list')
    .description('List all snapshots')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const spinner = options.json ? null : ora('Fetching snapshots...').start()

      try {
        const { snapshots } = await apiClient.listSnapshots(options.project)

        spinner?.succeed(`${snapshots.length} snapshot(s) found`)

        if (options.json) {
          console.log(JSON.stringify(snapshots, null, 2))
        } else {
          console.log(chalk.blue('Snapshots:'))

          if (snapshots.length === 0) {
            console.log(chalk.gray('  No snapshots yet.'))
            return
          }

          for (const s of snapshots) {
            const typeColor =
              s.type === 'AUTO' ? chalk.blue : s.type === 'CI' ? chalk.magenta : chalk.white
            console.log(`  ${typeColor(`[${s.type.toLowerCase()}]`)} ${s.name}`)
            console.log(
              chalk.gray(
                `    ${s.id} | ${s.toolCount} tools | ${s.messageCount} messages | ${s.createdAt}`
              )
            )
          }
        }
      } catch (err) {
        spinner?.fail('Failed to fetch snapshots')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })

  // snapshot restore
  snapshotCmd
    .command('restore <snapshot-id>')
    .description('Restore a snapshot (creates a new run)')
    .option('-m, --model <model>', 'Override model for restored run')
    .option('--json', 'Output as JSON')
    .action(async (snapshotId, options) => {
      if (!options.json) {
        console.log(chalk.blue(`⚡ Restoring snapshot: ${snapshotId}`))
      }

      const spinner = options.json ? null : ora('Restoring snapshot...').start()

      try {
        const result = await apiClient.restoreSnapshot(
          snapshotId,
          options.model ? { model: options.model } : undefined
        )

        spinner?.succeed('Snapshot restored!')

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          console.log(summaryLine('New Run ID', result.runId))
        }
      } catch (err) {
        spinner?.fail('Snapshot restore failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
