import chalk from 'chalk'
import { ApiError } from './api'

export function formatApiError(err: unknown, verbose?: boolean): string {
  if (err instanceof ApiError) {
    let msg = `✗ ${err.message}`
    if (err.status === 0 || err.message.includes('fetch')) {
      msg +=
        '\n  ' +
        chalk.gray(
          'Tip: Is the AgentBench server running? Try starting it with `agentbench dev` or checking AGENTBENCH_API_URL.'
        )
    }
    if (verbose && err.body) {
      msg += '\n  ' + chalk.gray(`Response: ${JSON.stringify(err.body)}`)
    }
    return msg
  }

  if (err instanceof Error) {
    if (verbose && err.stack) {
      return `✗ ${err.stack}`
    }
    return `✗ ${err.message}`
  }

  return `✗ ${String(err)}`
}
