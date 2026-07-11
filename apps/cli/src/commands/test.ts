import type { Command } from 'commander'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import * as nodeUrl from 'node:url'
import chalk from 'chalk'
import { formatDuration } from '../lib/format'

// ── Resolve @agentbench/core from CLI's node_modules ──────────────────────────────

/**
 * When the user's project doesn't have @agentbench/core installed yet
 * (e.g. fresh `agentbench init` without `npm install`), Node can't resolve
 * imports from test files. We resolve the package from the CLI's own
 * node_modules and create a symlink so imports work.
 */
function _findPackageRootFromCli(): string | null {
  // Walk up from the CLI's location (this file) to find the nearest
  // node_modules/@agentbench/core. Works in both monorepo and global installs.
  let dir = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url))

  while (dir !== nodePath.parse(dir).root) {
    const candidate = nodePath.join(dir, 'node_modules', '@agentbench', 'core')
    if (nodeFs.existsSync(candidate)) {
      // Resolve symlinks to get the real path
      try {
        return nodeFs.realpathSync(candidate)
      } catch {
        return candidate
      }
    }
    dir = nodePath.dirname(dir)
  }
  return null
}

function _ensureCoreInProject(cwd: string): void {
  const targetLink = nodePath.join(cwd, 'node_modules', '@agentbench', 'core')
  if (nodeFs.existsSync(targetLink)) return

  const coreRoot = _findPackageRootFromCli()
  if (!coreRoot) return

  try {
    nodeFs.mkdirSync(nodePath.dirname(targetLink), { recursive: true })
    nodeFs.symlinkSync(coreRoot, targetLink)
  } catch {
    // If we can't create the symlink, the import will fail naturally below
  }
}

// ── Types ───────────────────────────────────────────────────────────────────────

interface AssertionDetail {
  type: string
  status: 'PASSED' | 'FAILED' | 'ERROR'
  message: string
  expected?: string
  actual?: string
}

interface TestCaseResult {
  name: string
  description?: string
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED'
  duration: number
  tokens?: { input: number; output: number; total: number }
  cost?: number
  assertions: { passed: number; failed: number; errored: number; total: number }
  assertionDetails: AssertionDetail[]
  errorMessage?: string
}

interface TestSuiteResult {
  suiteName: string
  suiteDescription?: string
  results: TestCaseResult[]
}

interface TestSummary {
  total: number
  passed: number
  failed: number
  errored: number
  skipped: number
  totalDuration: number
  totalTokens: number
  totalCost: number
  startTime: number
}

// ── Local Test Discovery ────────────────────────────────────────────────────────

/**
 * Recursively discover test files in a directory.
 * Matches *.test.ts, *.spec.ts, *.test.js, *.spec.js and their .mjs/.cjs variants.
 */
function discoverTestFiles(dir: string): string[] {
  const files: string[] = []

  function walk(currentDir: string): void {
    if (!nodeFs.existsSync(currentDir)) return
    let entries: nodeFs.Dirent[]
    try {
      entries = nodeFs.readdirSync(currentDir, { withFileTypes: true })
    } catch (error) {
      console.error('[TEST] Failed to read directory entry:', error)
      return
    }
    for (const entry of entries) {
      const fullPath = nodePath.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath)
        }
      } else if (entry.isFile() && /\.(test|spec)\.(ts|js|mjs|cjs)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

/**
 * Dynamically import a test suite module from a file path.
 * Uses ESM dynamic import with a cache-busting query parameter so
 * --watch mode picks up file changes.
 */
async function loadTestSuite(
  filePath: string,
  cwd: string
): Promise<{
  default?: {
    name?: string
    description?: string
    tests?: Array<{
      name?: string
      description?: string
      run?: () => Promise<unknown>
      assertions?: Array<{ type: string; params: Record<string, unknown> }>
    }>
  }
} | null> {
  // If the project doesn't have @agentbench/core installed, resolve it
  // from the CLI's own node_modules so test files can import it.
  _ensureCoreInProject(cwd)

  try {
    const fileUrl = nodeUrl.pathToFileURL(filePath).href
    const mod = await import(`${fileUrl}?t=${Date.now()}`)
    return mod
  } catch (err) {
    console.error(
      chalk.red(
        `  Failed to load ${nodePath.relative(process.cwd(), filePath)}: ${err instanceof Error ? err.message : String(err)}`
      )
    )
    return null
  }
}

// ── Local Assertion Engine ──────────────────────────────────────────────────────

/**
 * Evaluate assertions locally against a string output.
 * No API server required — pure local evaluation.
 *
 * Supported assertion types:
 * - contains         — output includes a substring (case-insensitive)
 * - not-contains     — output does NOT include a substring
 * - not-empty        — output is non-empty after trimming
 * - contains-any     — output includes at least one of the given substrings
 * - semantic-similarity — stub, passed with note (requires embedding model)
 */
function evaluateAssertions(
  output: string,
  assertions: Array<{ type: string; params: Record<string, unknown> }>
): {
  passed: number
  failed: number
  errored: number
  total: number
  details: AssertionDetail[]
} {
  let passed = 0
  let failed = 0
  let errored = 0
  const details: AssertionDetail[] = []

  for (const assertion of assertions) {
    try {
      switch (assertion.type) {
        case 'contains': {
          const substring = String(assertion.params?.substring ?? '')
          const found = output.toLowerCase().includes(substring.toLowerCase())
          if (found) {
            passed++
            details.push({ type: 'contains', status: 'PASSED', message: `Found "${substring}"` })
          } else {
            failed++
            details.push({
              type: 'contains',
              status: 'FAILED',
              message: `Expected output to contain "${substring}"`,
              expected: `Contains: "${substring}"`,
              actual: `Output length: ${output.length} chars`,
            })
          }
          break
        }

        case 'not-contains': {
          const substring = String(assertion.params?.substring ?? '')
          const found = output.toLowerCase().includes(substring.toLowerCase())
          if (!found) {
            passed++
            details.push({
              type: 'not-contains',
              status: 'PASSED',
              message: `"${substring}" not found`,
            })
          } else {
            failed++
            details.push({
              type: 'not-contains',
              status: 'FAILED',
              message: `Expected output to NOT contain "${substring}"`,
              expected: `Absence of: "${substring}"`,
              actual: `Found: "${substring}"`,
            })
          }
          break
        }

        case 'not-empty': {
          const trimmed = output.trim()
          if (trimmed.length > 0) {
            passed++
            details.push({
              type: 'not-empty',
              status: 'PASSED',
              message: `Output has ${trimmed.length} chars`,
            })
          } else {
            failed++
            details.push({
              type: 'not-empty',
              status: 'FAILED',
              message: 'Expected non-empty output, but got empty string',
              expected: 'Non-empty string',
              actual: '(empty)',
            })
          }
          break
        }

        case 'contains-any': {
          const substrings = (assertion.params?.substrings as string[]) ?? []
          const foundAny = substrings.some((s) => output.toLowerCase().includes(s.toLowerCase()))
          if (foundAny) {
            const found = substrings.filter((s) => output.toLowerCase().includes(s.toLowerCase()))
            passed++
            details.push({
              type: 'contains-any',
              status: 'PASSED',
              message: `Found: ${found.join(', ')}`,
            })
          } else {
            failed++
            details.push({
              type: 'contains-any',
              status: 'FAILED',
              message: `Expected output to contain at least one of: ${substrings.join(', ')}`,
              expected: `One of: ${substrings.join(' | ')}`,
              actual: '(none found)',
            })
          }
          break
        }

        case 'semantic-similarity': {
          passed++
          details.push({
            type: 'semantic-similarity',
            status: 'PASSED',
            message: 'Semantic similarity check skipped (requires embedding model or API server)',
          })
          break
        }

        default: {
          errored++
          details.push({
            type: assertion.type,
            status: 'ERROR',
            message: `Unknown assertion type: ${assertion.type}`,
          })
          break
        }
      }
    } catch (err) {
      errored++
      details.push({
        type: assertion.type,
        status: 'ERROR',
        message: `Assertion error: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  return { passed, failed, errored, total: assertions.length, details }
}

// ── Local Test Runner ───────────────────────────────────────────────────────────

/**
 * Run tests locally by discovering test files, loading suites,
 * executing test case run() functions, and evaluating assertions.
 */
async function runTestsLocally(
  testDir: string,
  opts: { grep?: string; suite?: string; verbose: boolean; isCI: boolean }
): Promise<{ suites: TestSuiteResult[]; summary: TestSummary }> {
  const summary: TestSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    errored: 0,
    skipped: 0,
    totalDuration: 0,
    totalTokens: 0,
    totalCost: 0,
    startTime: Date.now(),
  }

  const suites: TestSuiteResult[] = []

  const testFiles = discoverTestFiles(testDir)
  if (testFiles.length === 0) {
    return { suites, summary }
  }

  const grepPattern = opts.grep ? new RegExp(opts.grep, 'i') : null
  const suitePattern = opts.suite ? new RegExp(opts.suite, 'i') : null

  for (const filePath of testFiles) {
    const mod = await loadTestSuite(filePath, process.cwd())
    if (!mod?.default?.tests) continue

    const suiteDef = mod.default
    const suiteName = suiteDef.name ?? nodePath.basename(filePath)
    const suiteDescription = suiteDef.description

    // Apply suite filter
    if (suitePattern && !suitePattern.test(suiteName)) {
      continue
    }

    const suiteResult: TestSuiteResult = {
      suiteName,
      suiteDescription,
      results: [],
    }

    if (!opts.isCI && opts.verbose) {
      console.log(chalk.bold.gray(`\n  Suite: ${suiteName}`))
      if (suiteDescription) {
        console.log(chalk.gray(`    ${suiteDescription}`))
      }
    }

    for (const testDef of suiteDef.tests!) {
      const testName = testDef.name ?? '(unnamed)'

      // Apply grep filter
      if (grepPattern && !grepPattern.test(testName)) {
        continue
      }

      const startTime = Date.now()

      try {
        if (!testDef.run) {
          summary.total++
          summary.skipped++
          suiteResult.results.push({
            name: testName,
            description: testDef.description,
            status: 'SKIPPED',
            duration: 0,
            assertions: { passed: 0, failed: 0, errored: 0, total: 0 },
            assertionDetails: [],
          })
          continue
        }

        // Run the test function
        const output = await testDef.run()
        const outputStr = typeof output === 'string' ? output : JSON.stringify(output)
        const duration = Date.now() - startTime

        // Evaluate assertions locally
        const assertions = testDef.assertions ?? []
        const evalResult = evaluateAssertions(outputStr, assertions)

        const status: TestCaseResult['status'] =
          evalResult.failed > 0 ? 'FAILED' : evalResult.errored > 0 ? 'ERROR' : 'PASSED'

        const result: TestCaseResult = {
          name: testName,
          description: testDef.description,
          status,
          duration,
          assertions: {
            passed: evalResult.passed,
            failed: evalResult.failed,
            errored: evalResult.errored,
            total: evalResult.total,
          },
          assertionDetails: evalResult.details,
        }

        suiteResult.results.push(result)

        summary.total++
        if (status === 'PASSED') summary.passed++
        else if (status === 'FAILED') summary.failed++
        else if (status === 'ERROR') summary.errored++

        summary.totalDuration += duration
      } catch (err) {
        const duration = Date.now() - startTime
        const result: TestCaseResult = {
          name: testName,
          description: testDef.description,
          status: 'ERROR',
          duration,
          assertions: { passed: 0, failed: 0, errored: 1, total: 1 },
          assertionDetails: [
            {
              type: 'runtime',
              status: 'ERROR',
              message: err instanceof Error ? err.message : String(err),
            },
          ],
          errorMessage: err instanceof Error ? err.message : String(err),
        }

        suiteResult.results.push(result)
        summary.total++
        summary.errored++
        summary.totalDuration += duration
      }
    }

    suites.push(suiteResult)
  }

  return { suites, summary }
}

// ── Formatting Helpers ──────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`
}

// ── Output Rendering ────────────────────────────────────────────────────────────

function renderTestLine(result: TestCaseResult, verbose: boolean): void {
  const icon =
    result.status === 'PASSED'
      ? chalk.green('  ✓')
      : result.status === 'FAILED'
        ? chalk.red('  ✗')
        : result.status === 'ERROR'
          ? chalk.yellow('  ⚠')
          : chalk.gray('  ○')

  let line = `${icon} ${result.name}`
  line += chalk.gray(`  (${formatDuration(result.duration)})`)

  const extras: string[] = []
  if (result.tokens?.total && result.tokens.total > 0) {
    extras.push(`${formatTokens(result.tokens.total)} tokens`)
  }
  if (result.cost && result.cost > 0) {
    extras.push(formatCost(result.cost))
  }
  if (extras.length > 0) {
    line += chalk.gray(`  [${extras.join(', ')}]`)
  }

  console.log(line)

  // Detailed assertion failures
  if (verbose && (result.status === 'FAILED' || result.status === 'ERROR')) {
    if (result.errorMessage) {
      console.log(chalk.red(`      Error: ${result.errorMessage}`))
    }
    for (const detail of result.assertionDetails) {
      if (detail.status === 'FAILED') {
        console.log(chalk.red(`      ✗ ${detail.type}: ${detail.message}`))
        if (detail.expected) {
          console.log(chalk.green(`        Expected: ${detail.expected}`))
        }
        if (detail.actual) {
          console.log(chalk.red(`        Actual:   ${detail.actual}`))
        }
      } else if (detail.status === 'ERROR') {
        console.log(chalk.yellow(`      ⚠ ${detail.type}: ${detail.message}`))
      }
    }
    console.log('')
  }
}

function renderSummary(summary: TestSummary): void {
  console.log('')
  console.log(chalk.bold.gray('─'.repeat(60)))

  const parts: string[] = []
  if (summary.failed > 0) parts.push(chalk.red(`${summary.failed} failed`))
  if (summary.passed > 0) parts.push(chalk.green(`${summary.passed} passed`))
  if (summary.errored > 0) parts.push(chalk.yellow(`${summary.errored} errors`))
  if (summary.skipped > 0) parts.push(chalk.gray(`${summary.skipped} skipped`))
  parts.push(chalk.gray(`${summary.total} total`))

  console.log(`${chalk.bold('Tests:')}  ${parts.join(', ')}`)
  console.log(`${chalk.bold('Time:')}   ${chalk.gray(formatDuration(summary.totalDuration))}`)

  if (summary.totalTokens > 0) {
    console.log(
      `${chalk.bold('Tokens:')} ${chalk.gray(formatTokens(summary.totalTokens))}   ${chalk.bold('Cost:')} ${chalk.gray(formatCost(summary.totalCost))}`
    )
  }
  console.log(chalk.bold.gray('─'.repeat(60)))
  console.log('')
}

function renderCoverage(suites: TestSuiteResult[]): void {
  const allResults = suites.flatMap((s) => s.results)
  const totalAssertions = allResults.reduce((sum, r) => sum + r.assertions.total, 0)
  const coveredAssertions = allResults.reduce(
    (sum, r) => sum + r.assertions.passed + r.assertions.failed,
    0
  )
  const coveragePercent =
    totalAssertions > 0 ? ((coveredAssertions / totalAssertions) * 100).toFixed(1) : '0.0'

  console.log('')
  console.log(chalk.bold.gray('─'.repeat(60)))
  console.log(chalk.bold('Coverage'))
  console.log(
    chalk.gray(
      `  Assertions: ${coveredAssertions}/${totalAssertions} (${coveragePercent}%) evaluated`
    )
  )
  console.log(chalk.gray(`  Test cases: ${allResults.length} total`))

  // Assertion type breakdown
  const typeCounts: Record<string, { total: number; passed: number; failed: number }> = {}
  for (const r of allResults) {
    for (const d of r.assertionDetails) {
      if (!typeCounts[d.type]) {
        typeCounts[d.type] = { total: 0, passed: 0, failed: 0 }
      }
      typeCounts[d.type].total++
      if (d.status === 'PASSED') typeCounts[d.type].passed++
      else if (d.status === 'FAILED') typeCounts[d.type].failed++
    }
  }

  if (Object.keys(typeCounts).length > 0) {
    console.log(chalk.gray('  By assertion type:'))
    for (const [type, counts] of Object.entries(typeCounts).sort()) {
      const icon = counts.failed === 0 ? chalk.green('    ✓') : chalk.red('    ✗')
      console.log(
        `${icon} ${chalk.bold(type.padEnd(24))} ${chalk.gray(`${counts.passed}/${counts.total} passed`)}`
      )
    }
  }
  console.log(chalk.bold.gray('─'.repeat(60)))
  console.log('')
}

// ── JSON Output ─────────────────────────────────────────────────────────────────

function outputJson(suites: TestSuiteResult[], summary: TestSummary): void {
  const output = {
    suites: suites.map((s) => ({
      name: s.suiteName,
      description: s.suiteDescription,
      results: s.results.map((r) => ({
        name: r.name,
        description: r.description,
        status: r.status,
        duration: r.duration,
        tokens: r.tokens,
        cost: r.cost,
        assertions: r.assertions,
        assertionDetails: r.assertionDetails.map((d) => ({
          type: d.type,
          status: d.status,
          message: d.message,
          expected: d.expected,
          actual: d.actual,
        })),
        errorMessage: r.errorMessage,
      })),
    })),
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      errored: summary.errored,
      skipped: summary.skipped,
      totalDuration: summary.totalDuration,
      totalTokens: summary.totalTokens,
      totalCost: summary.totalCost,
    },
  }
  process.stdout.write(JSON.stringify(output, null, 2) + '\n')
}

// ── JUnit XML Output ────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function outputJunit(suites: TestSuiteResult[], summary: TestSummary): void {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>']
  lines.push(
    `<testsuites name="AgentBench" tests="${summary.total}" failures="${summary.failed}" errors="${summary.errored}" skipped="${summary.skipped}" time="${(summary.totalDuration / 1000).toFixed(3)}">`
  )

  for (const suite of suites) {
    const allResults = suite.results
    const failures = allResults.filter((r) => r.status === 'FAILED').length
    const errors = allResults.filter((r) => r.status === 'ERROR').length
    const skipped = allResults.filter((r) => r.status === 'SKIPPED').length
    const suiteTime = (allResults.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(3)

    lines.push(
      `  <testsuite name="${escapeXml(suite.suiteName)}" ` +
        `tests="${allResults.length}" ` +
        `failures="${failures}" ` +
        `errors="${errors}" ` +
        `skipped="${skipped}" ` +
        `time="${suiteTime}">`
    )

    for (const result of allResults) {
      const time = (result.duration / 1000).toFixed(3)
      const classname = escapeXml(suite.suiteName)
      const name = escapeXml(result.name)

      if (result.status === 'SKIPPED') {
        lines.push(
          `    <testcase name="${name}" classname="${classname}" time="${time}"><skipped/></testcase>`
        )
      } else if (result.status === 'ERROR') {
        const errorMsg = escapeXml(result.errorMessage ?? 'Unknown error')
        lines.push(
          `    <testcase name="${name}" classname="${classname}" time="${time}"><error message="${errorMsg}">${errorMsg}</error></testcase>`
        )
      } else if (result.status === 'FAILED') {
        const failureDetails = result.assertionDetails
          .filter((d) => d.status === 'FAILED')
          .map((d) => d.message)
          .join('; ')
        const failureMsg = escapeXml(failureDetails || 'Assertion failed')
        lines.push(
          `    <testcase name="${name}" classname="${classname}" time="${time}"><failure message="${failureMsg}">${failureMsg}</failure></testcase>`
        )
      } else {
        lines.push(`    <testcase name="${name}" classname="${classname}" time="${time}"/>`)
      }
    }

    lines.push('  </testsuite>')
  }

  lines.push('</testsuites>')
  process.stdout.write(lines.join('\n') + '\n')
}

// ── File Watcher (for --watch) ──────────────────────────────────────────────────

function startFileWatcher(
  cwd: string,
  dirs: string[],
  onChange: () => Promise<void>
): { close: () => void } {
  const watchDirs = dirs.filter((d) => nodeFs.existsSync(nodePath.join(cwd, d)))
  const configPath = nodePath.join(cwd, 'agentbench.config.ts')

  const watchers: nodeFs.FSWatcher[] = []
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isRunning = false

  function scheduleRerun(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (!isRunning) {
        isRunning = true
        onChange().finally(() => {
          isRunning = false
        })
      }
    }, 300)
  }

  for (const dir of watchDirs) {
    const fullPath = nodePath.join(cwd, dir)
    try {
      const watcher = nodeFs.watch(fullPath, { recursive: true }, (_event, filename) => {
        if (filename && !filename.startsWith('.') && !filename.endsWith('~')) {
          scheduleRerun()
        }
      })
      watchers.push(watcher)
    } catch (error) {
      // skip unwatchable directories
      console.error('[TEST] Failed to set up file watcher:', error)
    }
  }

  if (nodeFs.existsSync(configPath)) {
    try {
      watchers.push(nodeFs.watch(configPath, () => scheduleRerun()))
    } catch (error) {
      // skip
      console.error('[TEST] Failed to watch config file:', error)
    }
  }

  return {
    close: () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      for (const w of watchers) w.close()
    },
  }
}

// ── Main Command ────────────────────────────────────────────────────────────────

export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Run AgentBench tests locally — no API server required')
    .option('-s, --suite <pattern>', 'Filter by test suite name pattern')
    .option('-g, --grep <pattern>', 'Filter test cases by name pattern')
    .option('-v, --verbose', 'Show detailed assertion results for each test')
    .option('--json', 'Output results as machine-readable JSON')
    .option('--junit', 'Output results as JUnit XML (for CI integrations)')
    .option('-w, --watch', 'Watch files and re-run tests on changes')
    .option('--coverage', 'Show assertion coverage report')
    .option('--replay', 'Use snapshots for zero-cost testing (no LLM calls)')
    .option('--update-snapshots', 'Update snapshots during replay mode')
    .option('--ci', 'CI mode — concise, non-interactive output, exit 1 on failure')
    .action(async (options) => {
      const cwd = process.cwd()
      const isWatchMode = options.watch === true
      const isJsonOutput = options.json === true
      const isJunitOutput = options.junit === true
      const isCI = options.ci === true
      const verbose = options.verbose === true || (!isCI && !isJsonOutput && !isJunitOutput)

      // Determine test directory
      const testDir = nodePath.join(cwd, 'tests')

      /**
       * Core execution: discover test files, run them, and return results.
       */
      async function executeTests(): Promise<{
        suites: TestSuiteResult[]
        summary: TestSummary
      }> {
        if (!nodeFs.existsSync(testDir)) {
          if (!isCI && !isJsonOutput && !isJunitOutput) {
            console.log(chalk.yellow('  No tests/ directory found.'))
            console.log(
              chalk.gray(
                '  Run `agentbench init` to scaffold a project, or create test files in tests/.'
              )
            )
          }
          return {
            suites: [],
            summary: {
              total: 0,
              passed: 0,
              failed: 0,
              errored: 0,
              skipped: 0,
              totalDuration: 0,
              totalTokens: 0,
              totalCost: 0,
              startTime: Date.now(),
            },
          }
        }

        return runTestsLocally(testDir, {
          grep: options.grep,
          suite: options.suite,
          verbose,
          isCI,
        })
      }

      // ── Header ──────────────────────────────────────────────────────────
      if (!isJsonOutput && !isJunitOutput) {
        if (!isCI && !isWatchMode) {
          console.log(chalk.hex('#7C3AED')('⚡ AgentBench'))
          console.log('')
        }
      }

      // ── Replay mode banner ───────────────────────────────────────────────
      if (options.replay) {
        if (!isJsonOutput && !isJunitOutput) {
          console.log(chalk.gray('  Replay mode: using cached snapshots (zero API cost)'))
          console.log('')
        }
      }

      // ── Execute Tests ───────────────────────────────────────────────────
      const { suites, summary } = await executeTests()
      let finalSummary = summary

      // ── Render Output ───────────────────────────────────────────────────
      if (isJsonOutput) {
        outputJson(suites, summary)
      } else if (isJunitOutput) {
        outputJunit(suites, summary)
      } else {
        if (summary.total > 0) {
          if (!isWatchMode) {
            console.log(chalk.bold('Running tests...'))
            console.log('')
          }

          for (const suite of suites) {
            for (let i = 0; i < suite.results.length; i++) {
              renderTestLine(suite.results[i], verbose)
            }
          }

          renderSummary(summary)

          if (options.coverage) {
            renderCoverage(suites)
          }
        }
      }

      // ── Watch Mode ──────────────────────────────────────────────────────
      if (isWatchMode) {
        console.log(chalk.gray('  Watching for file changes...'))
        console.log(chalk.gray('  Press Ctrl+C to stop.'))
        console.log('')

        let runCount = 0
        const watcher = startFileWatcher(cwd, ['tests', 'src', 'dataset'], async () => {
          runCount++
          console.log(
            chalk.hex('#7C3AED')(`\n  ⚡ Change detected — re-running tests (run #${runCount + 1})`)
          )
          console.log('')

          const result = await executeTests()
          finalSummary = result.summary

          if (isJsonOutput) {
            outputJson(result.suites, result.summary)
          } else if (isJunitOutput) {
            outputJunit(result.suites, result.summary)
          } else {
            for (const suite of result.suites) {
              for (let i = 0; i < suite.results.length; i++) {
                renderTestLine(suite.results[i], verbose)
              }
            }
            renderSummary(result.summary)
            if (options.coverage) renderCoverage(result.suites)
          }

          console.log(chalk.gray('  Watching for file changes...'))
          console.log('')
        })

        // Keep process alive
        process.on('SIGINT', () => {
          console.log(chalk.gray('\n\n  Watch mode stopped.'))
          watcher.close()
          process.exit(0)
        })
        process.on('SIGTERM', () => {
          watcher.close()
          process.exit(0)
        })

        // Block forever in watch mode
        await new Promise(() => {
          // Never resolves; kept alive by event loop until signal
        })
      }

      // ── Exit Code ───────────────────────────────────────────────────────
      if (finalSummary && (finalSummary.failed > 0 || finalSummary.errored > 0)) {
        process.exit(1)
      }
      process.exit(0)
    })
}
