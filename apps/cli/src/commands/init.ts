import type { Command } from 'commander'
import chalk from 'chalk'
import { configFileExists, getConfigFilePath, getDefaultConfigContent } from '../lib/config'
import * as nodeFs from 'node:fs'

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize AgentBench in the current directory')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      console.log(chalk.blue('⚡ Initializing AgentBench...'))

      const configPath = getConfigFilePath()

      if (!options.force && configFileExists()) {
        console.log(
          chalk.yellow('⚠ agentbench.config.ts already exists. Use --force to overwrite.')
        )
        return
      }

      nodeFs.writeFileSync(configPath, getDefaultConfigContent(), 'utf-8')
      console.log(chalk.green('✓ Created agentbench.config.ts'))
    })
}
