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
import { registerBenchmarkCommand } from './commands/benchmark'
import { registerDatasetCommand } from './commands/dataset'

const program = new Command()

program
  .name('agentbench')
  .description(
    'AgentBench — The AI Agent Regression Testing Framework. Write tests, run evals, compare models, and catch prompt regressions before they ship.'
  )
  .version('0.3.0')
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
registerBenchmarkCommand(program)
registerDatasetCommand(program)

// Parse arguments
program.parse(process.argv)

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
