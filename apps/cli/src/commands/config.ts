import type { Command } from 'commander'
import chalk from 'chalk'
import {
  configFileExists,
  getEnvConfigValue,
  writeEnvConfig,
} from '../lib/config'

export function registerConfigCommand(program: Command): void {
  const configCmd = program.command('config').description('Configuration management')

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key, value) => {
      if (!configFileExists()) {
        console.log(chalk.yellow('⚠ No agentbench.config.ts found. Run `agentbench init` first.'))
        return
      }
      writeEnvConfig(key, value)
      console.log(chalk.green(`✓ ${key}=${value}`))
    })

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key) => {
      const val = getEnvConfigValue(key)
      if (val) {
        console.log(val)
      } else {
        console.log(chalk.gray(`${key} is not set`))
      }
    })
}
