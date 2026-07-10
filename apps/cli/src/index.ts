#!/usr/bin/env node
import { Command } from 'commander'
import { registerInitCommand } from './commands/init'
import { registerRunCommand } from './commands/run'
import { registerTestCommand } from './commands/test'
import { registerEvaluateCommand } from './commands/evaluate'
import { registerReplayCommand } from './commands/replay'
import { registerCompareCommand } from './commands/compare'
import { registerReportCommand } from './commands/report'
import { registerSnapshotCommand } from './commands/snapshot'
import { registerExperimentCommand } from './commands/experiment'
import { registerConfigCommand } from './commands/config'
import { registerDevCommand } from './commands/dev'

const program = new Command()

program
  .name('agentbench')
  .description('AgentBench CLI — Regression Testing for AI Agents')
  .version('0.1.0')
  .option('--debug', 'Enable debug output with full error stacks')

// Register all commands
registerInitCommand(program)
registerRunCommand(program)
registerTestCommand(program)
registerEvaluateCommand(program)
registerReplayCommand(program)
registerCompareCommand(program)
registerReportCommand(program)
registerSnapshotCommand(program)
registerExperimentCommand(program)
registerConfigCommand(program)
registerDevCommand(program)

// Parse arguments
program.parse(process.argv)

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
