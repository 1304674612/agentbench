import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import type { TestCase, Suite } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { statusIcon, section } from '../lib/format'

interface TestResult {
  name: string
  status: string
  duration: number
  assertions: { passed: number; failed: number; total: number }
}

export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Run all tests in a project')
    .requiredOption('-p, --project <id>', 'Project ID')
    .option('-s, --suite <id>', 'Filter by test suite')
    .option('-g, --grep <pattern>', 'Filter tests by name pattern')
    .option('--verbose', 'Show detailed results for each test case')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      if (!options.json) {
        console.log(chalk.blue('⚡ Running tests...'))
      }

      const spinner = options.json ? null : ora('Fetching test suites...').start()

      try {
        // Fetch test suites and cases
        let cases: TestCase[] = []

        if (options.suite) {
          const suite = await apiClient.getSuite(options.suite) as Suite
          cases = suite.cases
          spinner?.succeed()
          if (!options.json) {
            console.log(`  ${chalk.gray('Suite:')} ${suite.name}`)
          }
        } else {
          const { suites } = await apiClient.listSuites(options.project)
          cases = suites.flatMap((s) => s.cases)
          spinner?.succeed()
          if (!options.json) {
            console.log(`  ${chalk.gray('Suites:')} ${suites.length}`)
          }
        }

        // Filter by pattern
        if (options.grep) {
          const pattern = new RegExp(options.grep, 'i')
          cases = cases.filter((c) => pattern.test(c.name))
        }

        if (!options.json) {
          console.log(`  ${chalk.gray('Test cases:')} ${cases.length}`)
          console.log('')
        }

        if (cases.length === 0) {
          if (!options.json) {
            console.log(chalk.yellow('No test cases found.'))
          } else {
            console.log(JSON.stringify({ results: [], summary: { total: 0, passed: 0, failed: 0, errored: 0 } }, null, 2))
          }
          return
        }

        // Run each test case
        const results: TestResult[] = []

        const runSpinner = options.json ? null : ora(`Running ${cases.length} test(s)...`).start()

        for (const tc of cases) {
          const startTime = Date.now()
          if (runSpinner) runSpinner.text = `Running: ${tc.name}...`

          try {
            const runResult = await apiClient.createRun({
              projectId: options.project,
              testCaseId: tc.id,
              name: `${tc.name} (${new Date().toISOString()})`,
              tags: ['cli', 'test'],
            })

            // Run evaluation if assertions exist
            if (tc.assertions.length > 0) {
              const evalResult = await apiClient.evaluateRun(runResult.id, {
                rules: tc.assertions.map((a) => ({
                  type: a.type,
                  params: a.params ?? {},
                })),
              })

              results.push({
                name: tc.name,
                status: evalResult.summary.failed === 0 ? 'PASSED' : 'FAILED',
                duration: Date.now() - startTime,
                assertions: {
                  passed: evalResult.summary.passed,
                  failed: evalResult.summary.failed,
                  total: evalResult.summary.totalRules,
                },
              })

              if (!options.json && options.verbose) {
                const icon =
                  evalResult.summary.failed === 0 ? chalk.green('  ✓') : chalk.red('  ✗')
                console.log(
                  `${icon} ${tc.name}: ${evalResult.summary.passed}/${evalResult.summary.totalRules} passed (${Date.now() - startTime}ms)`,
                )
              }
            } else {
              results.push({
                name: tc.name,
                status: runResult.status === 'PASSED' ? 'PASSED' : runResult.status.toUpperCase(),
                duration: Date.now() - startTime,
                assertions: { passed: 0, failed: 0, total: 0 },
              })

              if (!options.json && options.verbose) {
                const icon =
                  runResult.status === 'PASSED' ? chalk.green('  ✓') : chalk.red('  ✗')
                console.log(`${icon} ${tc.name}: ${runResult.status} (${Date.now() - startTime}ms)`)
              }
            }
          } catch (err) {
            results.push({
              name: tc.name,
              status: 'ERROR',
              duration: Date.now() - startTime,
              assertions: { passed: 0, failed: 0, total: 0 },
            })
            if (!options.json && options.verbose) {
              console.log(
                chalk.red(`  ✗ ${tc.name}: ${err instanceof Error ? err.message : String(err)}`),
              )
            }
          }
        }

        runSpinner?.succeed(`${results.length} test(s) completed`)

        // Output results
        if (options.json) {
          const passed = results.filter((r) => r.status === 'PASSED').length
          const failed = results.filter((r) => r.status === 'FAILED').length
          const errored = results.filter((r) => r.status === 'ERROR').length
          console.log(
            JSON.stringify(
              { results, summary: { total: results.length, passed, failed, errored } },
              null,
              2
            )
          )
        } else {
          const passed = results.filter((r) => r.status === 'PASSED').length
          const failed = results.filter((r) => r.status === 'FAILED').length
          const errored = results.filter((r) => r.status === 'ERROR').length

          console.log('')
          console.log(section('Test Results'))

          if (options.verbose) {
            for (const r of results) {
              const icon = statusIcon(r.status)
              console.log(
                `${icon} ${r.name} [${r.status}] ${r.duration}ms` +
                  (r.assertions.total > 0
                    ? ` (${r.assertions.passed}/${r.assertions.total} assertions)`
                    : ''),
              )
            }
            console.log('')
          }

          console.log(chalk.bold('Summary:'))
          if (passed > 0) console.log(chalk.green(`  ✓ ${passed} passed`))
          if (failed > 0) console.log(chalk.red(`  ✗ ${failed} failed`))
          if (errored > 0) console.log(chalk.yellow(`  ⚠ ${errored} errors`))
          console.log(chalk.gray(`  Total: ${results.length} test(s)`))

          if (failed > 0 || errored > 0) {
            process.exit(1)
          }
        }
      } catch (err) {
        spinner?.fail('Tests failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}
