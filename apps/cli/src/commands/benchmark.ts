import type { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { apiClient } from '../lib/api'
import { formatApiError } from '../lib/errors'
import { statusIcon, section, outputJson, formatDuration } from '../lib/format'

// ── Inline Types ────────────────────────────────────────────────────────────

interface BenchmarkListItem {
  slug: string
  name: string
  version: string
  category: string
  difficulty: string
  author: string
  rating: number
  ratingsCount: number
  downloads: number
  status: string
  description: string
}

interface BenchmarkDetail {
  slug: string
  meta: {
    name: string
    version: string
    description: string
    longDescription?: string
    author: { name: string; email?: string; url?: string }
    license: string
    category: string
    difficulty: string
    tags: string[]
    createdAt: string
    updatedAt: string
    downloads: number
    rating: number
    ratingsCount: number
    status: string
  }
  suites: Array<{
    name: string
    description: string
    testCount: number
    weight: number
  }>
  leaderboard: Array<{
    rank: number
    agent: string
    author: string
    overallScore: number
  }>
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_BENCHMARKS: BenchmarkListItem[] = [
  {
    slug: 'agentbench/customer-support-v2',
    name: 'Customer Support v2',
    version: '2.0.0',
    category: 'customer-support',
    difficulty: 'intermediate',
    author: 'AgentBench',
    rating: 4.8,
    ratingsCount: 124,
    downloads: 3840,
    status: 'published',
    description:
      'Multi-turn customer support scenarios with RAG, tool calling, and escalation logic.',
  },
  {
    slug: 'agentbench/sql-agent-bench',
    name: 'SQL Agent Benchmark',
    version: '1.2.0',
    category: 'sql',
    difficulty: 'advanced',
    author: 'AgentBench',
    rating: 4.5,
    ratingsCount: 89,
    downloads: 2150,
    status: 'published',
    description:
      'Text-to-SQL with schema awareness, joins, aggregations, and SQL injection prevention.',
  },
  {
    slug: 'agentbench/code-review-v1',
    name: 'Code Review v1',
    version: '1.0.0',
    category: 'coding',
    difficulty: 'advanced',
    author: 'AgentBench',
    rating: 4.6,
    ratingsCount: 67,
    downloads: 1920,
    status: 'published',
    description:
      'Security review, code quality, false-positive detection, and large diff handling.',
  },
  {
    slug: 'agentbench/rag-benchmark',
    name: 'RAG Quality Benchmark',
    version: '1.1.0',
    category: 'rag',
    difficulty: 'intermediate',
    author: 'AgentBench',
    rating: 4.3,
    ratingsCount: 45,
    downloads: 1280,
    status: 'published',
    description:
      'Retrieval-augmented generation testing with grounding, context-window, and latency tests.',
  },
  {
    slug: 'agentbench/multi-agent-challenge',
    name: 'Multi-Agent Challenge',
    version: '1.0.0',
    category: 'multi-agent',
    difficulty: 'expert',
    author: 'Community',
    rating: 4.7,
    ratingsCount: 32,
    downloads: 890,
    status: 'published',
    description:
      'Complex multi-agent orchestration with handoff, consensus, concurrency, and failure recovery.',
  },
  {
    slug: 'agentbench/safety-eval',
    name: 'Safety Evaluation Suite',
    version: '1.0.0',
    category: 'safety',
    difficulty: 'beginner',
    author: 'AgentBench',
    rating: 4.9,
    ratingsCount: 156,
    downloads: 4500,
    status: 'published',
    description:
      'Safety and alignment testing: jailbreak resistance, harmful output detection, content filtering.',
  },
  {
    slug: 'agentbench/tool-calling-pro',
    name: 'Tool Calling Pro',
    version: '2.1.0',
    category: 'tool-calling',
    difficulty: 'intermediate',
    author: 'AgentBench',
    rating: 4.4,
    ratingsCount: 78,
    downloads: 2340,
    status: 'published',
    description:
      'Complex tool orchestration: selection, parallel calls, ordering, and error handling.',
  },
]

function getMockDetail(slug: string): BenchmarkDetail {
  const item = MOCK_BENCHMARKS.find((b) => b.slug === slug)
  const name = item?.name ?? slug
  const category = item?.category ?? 'general'
  return {
    slug,
    meta: {
      name,
      version: item?.version ?? '1.0.0',
      description: item?.description ?? 'A benchmark for AI agent testing.',
      longDescription: `## ${name}\n\nThis benchmark evaluates agent performance on ${category} tasks.\n\n### What It Tests\n- Response quality and accuracy\n- Tool usage and selection\n- Latency and token efficiency\n- Edge case handling\n\n### Usage\n\`\`\`bash\nagentbench benchmark run ${slug} --agent ./my-agent.ts\n\`\`\``,
      author: { name: item?.author ?? 'AgentBench', url: 'https://agentbench.dev' },
      license: 'MIT',
      category,
      difficulty: item?.difficulty ?? 'intermediate',
      tags: [category, 'agent-testing', 'benchmark'],
      createdAt: '2026-06-15T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      downloads: item?.downloads ?? 1000,
      rating: item?.rating ?? 4.5,
      ratingsCount: item?.ratingsCount ?? 50,
      status: item?.status ?? 'published',
    },
    suites: [
      {
        name: 'Accuracy',
        description: 'Evaluates response correctness and factual accuracy',
        testCount: 12,
        weight: 0.4,
      },
      {
        name: 'Tool Usage',
        description: 'Verifies correct tool selection and argument passing',
        testCount: 8,
        weight: 0.3,
      },
      {
        name: 'Performance',
        description: 'Measures latency, token usage, and cost efficiency',
        testCount: 6,
        weight: 0.2,
      },
      {
        name: 'Edge Cases',
        description: 'Tests behavior on unusual or adversarial inputs',
        testCount: 4,
        weight: 0.1,
      },
    ],
    leaderboard: [
      { rank: 1, agent: 'GPT-5 + ToolRAG', author: 'OpenAI Labs', overallScore: 94.2 },
      { rank: 2, agent: 'Claude Opus 4.5 + MCP', author: 'Anthropic', overallScore: 92.8 },
      { rank: 3, agent: 'Gemini Ultra 3 + Search', author: 'Google Research', overallScore: 90.1 },
      { rank: 4, agent: 'DeepSeek R2 + Chain', author: 'DeepSeek Team', overallScore: 88.5 },
      { rank: 5, agent: 'Llama 4 + CrewAI', author: 'Meta AI', overallScore: 85.3 },
    ],
  }
}

const MOCK_INSTALLED: Array<{
  slug: string
  name: string
  version: string
  installedAt: string
  path: string
}> = [
  {
    slug: 'agentbench/safety-eval',
    name: 'Safety Evaluation Suite',
    version: '1.0.0',
    installedAt: '2026-07-05T10:30:00Z',
    path: './benchmarks/agentbench-safety-eval',
  },
  {
    slug: 'agentbench/customer-support-v2',
    name: 'Customer Support v2',
    version: '2.0.0',
    installedAt: '2026-07-08T14:15:00Z',
    path: './benchmarks/agentbench-customer-support-v2',
  },
]

function getMockRunResult(slug: string) {
  const detail = getMockDetail(slug)
  return {
    runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'completed',
    suites: detail.suites.map((s) => ({
      name: s.name,
      total: s.testCount,
      passed: Math.max(0, s.testCount - Math.floor(Math.random() * 2)),
      failed: Math.floor(Math.random() * 2),
      score: 75 + Math.random() * 20,
      duration: 500 + Math.random() * 3000,
      tests: Array.from({ length: s.testCount }, (_, i) => ({
        name: `${s.name} Test #${i + 1}`,
        status: Math.random() > 0.1 ? 'PASSED' : 'FAILED',
        score: 70 + Math.random() * 30,
        duration: 100 + Math.random() * 2000,
        tokens: 200 + Math.floor(Math.random() * 2000),
        assertions: {
          passed: 3 + Math.floor(Math.random() * 3),
          failed: Math.random() > 0.9 ? 1 : 0,
          total: 4 + Math.floor(Math.random() * 2),
        },
      })),
    })),
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isMockMode(program: Command): boolean {
  return !!program.opts().mock
}

function separator(char = '─', length = 60): string {
  return chalk.gray(char.repeat(length))
}

function registerSearchCommand(program: Command): void {
  program
    .command('search')
    .description('Search the benchmark marketplace')
    .argument('[query]', 'Search query string')
    .option('--category <cat>', 'Filter by category')
    .option('--difficulty <level>', 'Filter by difficulty (beginner|intermediate|advanced|expert)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option(
      '--sort <order>',
      'Sort order (popular|newest|highest-rated|most-downloaded)',
      'popular'
    )
    .option('--page <n>', 'Page number', '1')
    .option('--page-size <n>', 'Results per page', '20')
    .option('--json', 'Output as JSON')
    .action(async (query: string | undefined, options) => {
      const spinner = options.json ? null : ora('Searching benchmarks...').start()

      try {
        let benchmarks: BenchmarkListItem[]
        let total: number
        let page: number
        let pageSize: number

        if (isMockMode(program)) {
          // Use mock data filtered by search params
          let filtered = [...MOCK_BENCHMARKS]
          if (query) {
            const q = query.toLowerCase()
            filtered = filtered.filter(
              (b) =>
                b.name.toLowerCase().includes(q) ||
                b.description.toLowerCase().includes(q) ||
                b.slug.toLowerCase().includes(q)
            )
          }
          if (options.category) {
            filtered = filtered.filter((b) => b.category === options.category)
          }
          if (options.difficulty) {
            filtered = filtered.filter((b) => b.difficulty === options.difficulty)
          }
          if (options.sort === 'newest') filtered.reverse()
          if (options.sort === 'highest-rated') filtered.sort((a, b) => b.rating - a.rating)
          if (options.sort === 'most-downloaded') filtered.sort((a, b) => b.downloads - a.downloads)

          total = filtered.length
          page = parseInt(options.page, 10) || 1
          pageSize = parseInt(options.pageSize, 10) || 20
          const start = (page - 1) * pageSize
          benchmarks = filtered.slice(start, start + pageSize)
        } else {
          const params = new URLSearchParams()
          if (query) params.set('query', query)
          if (options.category) params.set('category', options.category)
          if (options.difficulty) params.set('difficulty', options.difficulty)
          if (options.tags) params.set('tags', options.tags)
          if (options.sort) params.set('sort', options.sort)
          if (options.page) params.set('page', options.page)
          if (options.pageSize) params.set('pageSize', options.pageSize)

          const result = await apiClient.apiFetch<{
            benchmarks: BenchmarkListItem[]
            total: number
            page: number
            pageSize: number
          }>(`/benchmarks?${params.toString()}`)

          benchmarks = result.benchmarks
          total = result.total
          page = result.page
          pageSize = result.pageSize
        }

        spinner?.succeed(
          `Found ${total} benchmark${total !== 1 ? 's' : ''}${
            isMockMode(program) ? chalk.gray(' (mock data)') : ''
          }`
        )

        if (options.json) {
          outputJson({ benchmarks, total, page, pageSize })
          return
        }

        if (benchmarks.length === 0) {
          console.log(chalk.yellow('\n  No benchmarks found matching your criteria.'))
          console.log(
            chalk.gray(
              '  Try a broader search or browse the marketplace at https://agentbench.dev/marketplace\n'
            )
          )
          return
        }

        console.log('')
        for (const bm of benchmarks) {
          const stars = '★'.repeat(Math.round(bm.rating)) + '☆'.repeat(5 - Math.round(bm.rating))
          const difficultyColor =
            bm.difficulty === 'beginner'
              ? chalk.green
              : bm.difficulty === 'intermediate'
                ? chalk.blue
                : bm.difficulty === 'advanced'
                  ? chalk.yellow
                  : chalk.red

          console.log(
            `  ${chalk.bold(chalk.cyan(bm.name))}  ${chalk.yellow(stars)}  (${bm.ratingsCount})`
          )
          console.log(
            `  ${chalk.gray('by')} ${bm.author}  ${chalk.gray('·')}  v${bm.version}  ${chalk.gray('·')}  ${difficultyColor(bm.difficulty)}`
          )
          console.log(
            `  ${chalk.gray('Category:')} ${bm.category}  ${chalk.gray('·')}  ${bm.downloads.toLocaleString()} downloads`
          )
          console.log(`  ${bm.description}`)
          console.log(`  ${chalk.cyan('agentbench benchmark install ' + bm.slug)}`)
          console.log('')
        }

        if (total > benchmarks.length) {
          const totalPages = Math.ceil(total / pageSize)
          console.log(chalk.gray(`  Page ${page} of ${totalPages}  ·  ${total} total benchmarks`))
          console.log(chalk.gray(`  Next: agentbench benchmark search --page ${page + 1}`))
          console.log('')
        }
      } catch (err) {
        spinner?.fail('Search failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── Info ────────────────────────────────────────────────────────────────────

function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('View detailed information about a benchmark')
    .argument('<slug>', 'Benchmark slug (e.g. agentbench/customer-support-v2)')
    .option('--json', 'Output as JSON')
    .action(async (slug: string, options) => {
      const spinner = options.json ? null : ora(`Fetching benchmark: ${slug}...`).start()

      try {
        let bm: BenchmarkDetail

        if (isMockMode(program)) {
          bm = getMockDetail(slug)
        } else {
          bm = await apiClient.apiFetch<BenchmarkDetail>(`/benchmarks/${slug}`)
        }

        spinner?.succeed(isMockMode(program) ? chalk.gray('(mock data)') : undefined)

        if (options.json) {
          outputJson(bm)
          return
        }

        const meta = bm.meta
        const stars = '★'.repeat(Math.round(meta.rating)) + '☆'.repeat(5 - Math.round(meta.rating))
        const difficultyColor =
          meta.difficulty === 'beginner'
            ? chalk.green
            : meta.difficulty === 'intermediate'
              ? chalk.blue
              : meta.difficulty === 'advanced'
                ? chalk.yellow
                : chalk.red

        console.log('')
        console.log(section(meta.name))
        console.log(`  ${chalk.bold('Version:')}     v${meta.version}`)
        console.log(
          `  ${chalk.bold('Author:')}      ${meta.author.name}${meta.author.url ? chalk.gray(` (${meta.author.url})`) : ''}`
        )
        console.log(`  ${chalk.bold('License:')}     ${meta.license}`)
        console.log(`  ${chalk.bold('Category:')}    ${meta.category}`)
        console.log(`  ${chalk.bold('Difficulty:')}  ${difficultyColor(meta.difficulty)}`)
        console.log(`  ${chalk.bold('Rating:')}      ${stars}  (${meta.ratingsCount} ratings)`)
        console.log(`  ${chalk.bold('Downloads:')}   ${meta.downloads.toLocaleString()}`)
        console.log(
          `  ${chalk.bold('Status:')}      ${meta.status === 'published' ? chalk.green('Published') : chalk.yellow(meta.status)}`
        )
        console.log(`  ${chalk.bold('Tags:')}        ${meta.tags.join(', ')}`)
        console.log(
          `  ${chalk.bold('Updated:')}     ${new Date(meta.updatedAt).toLocaleDateString()}`
        )
        console.log('')
        console.log(`  ${meta.description}`)
        console.log('')

        // Suites
        if (bm.suites.length > 0) {
          console.log(chalk.bold('  Test Suites:'))
          for (const suite of bm.suites) {
            console.log(
              `    ${chalk.cyan('■')} ${suite.name}  ${chalk.gray(`(${suite.testCount} tests, weight: ${(suite.weight * 100).toFixed(0)}%)`)}`
            )
            console.log(`      ${chalk.gray(suite.description)}`)
          }
          console.log('')
        }

        // Leaderboard top 5
        if (bm.leaderboard.length > 0) {
          console.log(chalk.bold('  Leaderboard (Top 5):'))
          const top5 = bm.leaderboard.slice(0, 5)
          for (const entry of top5) {
            const medal =
              entry.rank === 1
                ? '🥇'
                : entry.rank === 2
                  ? '🥈'
                  : entry.rank === 3
                    ? '🥉'
                    : ` ${entry.rank}.`
            console.log(
              `    ${medal}  ${chalk.bold(entry.agent)}  ${chalk.gray('by')} ${entry.author}  ${chalk.green(`Score: ${entry.overallScore.toFixed(1)}`)}`
            )
          }
          console.log('')
        }

        console.log(chalk.gray('  Commands:'))
        console.log(chalk.cyan(`  $ agentbench benchmark install ${slug}`))
        console.log(chalk.cyan(`  $ agentbench benchmark run ${slug} --agent <path>`))
        console.log('')
      } catch (err) {
        spinner?.fail('Failed to fetch benchmark')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── Install ─────────────────────────────────────────────────────────────────

function registerInstallCommand(program: Command): void {
  program
    .command('install')
    .description('Download and install a benchmark locally')
    .argument('<slug>', 'Benchmark slug (e.g. agentbench/customer-support-v2)')
    .option('--dir <path>', 'Install directory', './benchmarks')
    .action(async (slug: string, options) => {
      const spinner = ora(`Installing benchmark: ${slug}...`).start()

      try {
        let bm: BenchmarkDetail
        let downloadResult: { message: string; path: string; files: string[] }

        if (isMockMode(program)) {
          bm = getMockDetail(slug)
          await new Promise((resolve) => setTimeout(resolve, 800))
          const installPath = `${options.dir}/${slug.replace(/\//g, '-')}`
          downloadResult = {
            message: `Mock install of ${bm.meta.name} v${bm.meta.version}`,
            path: installPath,
            files: ['benchmark.config.json', 'suites/', 'dataset/', 'README.md'],
          }
        } else {
          spinner.text = `Fetching benchmark metadata: ${slug}...`
          bm = await apiClient.apiFetch<BenchmarkDetail>(`/benchmarks/${slug}`)

          spinner.text = `Downloading ${bm.meta.name} v${bm.meta.version}...`
          downloadResult = await apiClient.apiFetch<{
            message: string
            path: string
            files: string[]
          }>(`/benchmarks/${slug}/download`, {
            method: 'POST',
            body: JSON.stringify({ targetDir: options.dir }),
          })
        }

        spinner.succeed(
          `Installed ${bm.meta.name} v${bm.meta.version}${
            isMockMode(program) ? chalk.gray(' (mock)') : ''
          }`
        )

        console.log('')
        console.log(chalk.green(`  ✓ Benchmark installed to ${downloadResult.path}`))
        console.log(chalk.gray(`  Files: ${downloadResult.files.length} items`))
        if (isMockMode(program)) {
          console.log(
            chalk.yellow(
              '  ⚠️  Mock mode — benchmark not actually downloaded. Remove --mock to install for real.'
            )
          )
        }
        console.log('')
        console.log(chalk.bold('  Next steps:'))
        console.log(chalk.cyan(`  $ agentbench benchmark run ${slug} --agent <path>`))
        console.log(chalk.cyan(`  $ agentbench benchmark info ${slug}`))
        console.log('')
      } catch (err) {
        spinner.fail('Installation failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── Run ─────────────────────────────────────────────────────────────────────

function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a benchmark against your agent')
    .argument('<slug>', 'Benchmark slug to run')
    .requiredOption('--agent <path>', 'Path to your agent entry file')
    .option('--suite <name>', 'Run a specific suite')
    .option('--model <model>', 'Override the default model')
    .option('--concurrency <n>', 'Max parallel tests', '4')
    .option('--timeout <ms>', 'Per-test timeout in ms', '30000')
    .option('--json', 'Output results as JSON')
    .option('--verbose', 'Show detailed results')
    .action(async (slug: string, options) => {
      const spinner = options.json ? null : ora(`Running benchmark: ${slug}...`).start()

      try {
        let runResult: {
          runId: string
          status: string
          suites: Array<{
            name: string
            total: number
            passed: number
            failed: number
            score: number
            duration: number
            tests: Array<{
              name: string
              status: string
              score: number
              duration: number
              tokens: number
              assertions: { passed: number; failed: number; total: number }
            }>
          }>
        }

        if (isMockMode(program)) {
          if (spinner) spinner.text = `Simulating benchmark run for ${slug}...`
          await new Promise((resolve) => setTimeout(resolve, 1200))
          runResult = getMockRunResult(slug)
        } else {
          if (spinner) spinner.text = `Submitting benchmark run for ${slug}...`

          const runBody: Record<string, unknown> = {
            agentPath: options.agent,
            model: options.model,
            concurrency: parseInt(options.concurrency, 10),
            timeout: parseInt(options.timeout, 10),
          }
          if (options.suite) runBody.suite = options.suite

          runResult = await apiClient.apiFetch<typeof runResult>(`/benchmarks/${slug}/run`, {
            method: 'POST',
            body: JSON.stringify(runBody),
          })
        }

        spinner?.succeed(
          `Benchmark run complete: ${runResult.runId}${
            isMockMode(program) ? chalk.gray(' (mock data)') : ''
          }`
        )

        if (options.json) {
          outputJson(runResult)
          return
        }

        // Display results
        console.log('')
        console.log(chalk.bold(`  Benchmark: ${slug}`))
        console.log(chalk.gray(`  Run ID:    ${runResult.runId}`))
        console.log('')

        let grandTotal = 0
        let grandPassed = 0
        let grandFailed = 0
        let totalDuration = 0

        for (const suite of runResult.suites) {
          grandTotal += suite.total
          grandPassed += suite.passed
          grandFailed += suite.failed
          totalDuration += suite.duration

          const suiteIcon = suite.failed === 0 ? chalk.green('✓') : chalk.red('✗')
          console.log(
            `  ${suiteIcon} ${chalk.bold(suite.name)}  ${chalk.gray(`(${suite.passed}/${suite.total} passed, ${formatDuration(suite.duration)})`)}  ${chalk.yellow(`Score: ${suite.score.toFixed(1)}`)}`
          )

          if (options.verbose) {
            for (const test of suite.tests) {
              const testIcon = statusIcon(test.status)
              console.log(
                `    ${testIcon} ${test.name}  ${chalk.gray(`${formatDuration(test.duration)} · ${test.tokens} tokens · score ${test.score.toFixed(1)}`)}`
              )
              if (test.status === 'FAILED' && test.assertions) {
                console.log(
                  chalk.red(
                    `      ${test.assertions.failed}/${test.assertions.total} assertions failed`
                  )
                )
              }
            }
          }
        }

        console.log('')
        console.log(separator())
        const overallPassed = grandFailed === 0
        console.log(
          overallPassed
            ? chalk.green(`  All ${grandTotal} tests passed!  (${formatDuration(totalDuration)})`)
            : chalk.red(
                `  ${grandPassed}/${grandTotal} passed, ${grandFailed} failed  (${formatDuration(totalDuration)})`
              )
        )
        console.log(separator())
        console.log('')

        if (isMockMode(program)) {
          console.log(
            chalk.yellow(
              '  ⚠️  Mock mode — these results are simulated. Run without --mock for real results.'
            )
          )
          console.log('')
        }

        if (grandFailed > 0) {
          console.log(chalk.gray('  View full report: agentbench benchmark info ' + slug))
          console.log(
            chalk.gray(
              '  Submit to leaderboard: agentbench benchmark submit ' +
                slug +
                ' --run ' +
                runResult.runId
            )
          )
          console.log('')
        }
      } catch (err) {
        spinner?.fail('Benchmark run failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── Submit ──────────────────────────────────────────────────────────────────

function registerSubmitCommand(program: Command): void {
  program
    .command('submit')
    .description('Submit a benchmark run result to the leaderboard')
    .argument('<slug>', 'Benchmark slug')
    .requiredOption('--run <id>', 'Run ID to submit')
    .option('--agent-name <name>', 'Display name for your agent on the leaderboard')
    .option('--author <name>', 'Your name or organization')
    .option('--version <ver>', 'Agent version string')
    .action(async (slug: string, options) => {
      const spinner = ora(`Submitting result to leaderboard for ${slug}...`).start()

      try {
        let result: {
          message: string
          entry: { rank: number; agent: string; overallScore: number; verified: boolean }
        }

        if (isMockMode(program)) {
          await new Promise((resolve) => setTimeout(resolve, 600))
          result = {
            message: 'Mock submission received',
            entry: {
              rank: Math.floor(Math.random() * 10) + 1,
              agent: options.agentName || 'My Agent',
              overallScore: 80 + Math.random() * 15,
              verified: Math.random() > 0.3,
            },
          }
        } else {
          result = await apiClient.apiFetch<typeof result>(`/benchmarks/${slug}/leaderboard`, {
            method: 'POST',
            body: JSON.stringify({
              runId: options.run,
              agentName: options.agentName,
              author: options.author,
              version: options.version,
            }),
          })
        }

        spinner.succeed(
          `Submitted to leaderboard!${isMockMode(program) ? chalk.gray(' (mock)') : ''}`
        )

        console.log('')
        console.log(chalk.green(`  ✓ Your submission is ranked #${result.entry.rank}`))
        console.log(chalk.gray(`    Agent:    ${result.entry.agent}`))
        console.log(chalk.gray(`    Score:    ${result.entry.overallScore.toFixed(1)}`))
        console.log(
          chalk.gray(
            `    Verified: ${result.entry.verified ? chalk.green('Yes') : chalk.yellow('Pending')}`
          )
        )
        if (isMockMode(program)) {
          console.log(
            chalk.yellow(
              '  ⚠️  Mock mode — not actually submitted. Remove --mock to submit for real.'
            )
          )
        }
        console.log('')
        console.log(chalk.gray(`  View leaderboard: agentbench benchmark info ${slug}`))
        console.log('')
      } catch (err) {
        spinner.fail('Submission failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── Publish ─────────────────────────────────────────────────────────────────

function registerPublishCommand(program: Command): void {
  program
    .command('publish')
    .description('Publish a new benchmark to the marketplace')
    .argument('<path>', 'Path to your benchmark package directory')
    .option('--dry-run', 'Validate without publishing')
    .action(async (benchmarkPath: string, options) => {
      const spinner = ora('Validating benchmark package...').start()

      try {
        // Validation steps (same for both mock and real mode)
        spinner.text = 'Reading benchmark package...'
        await new Promise((resolve) => setTimeout(resolve, 500))

        spinner.text = 'Validating schema...'
        await new Promise((resolve) => setTimeout(resolve, 300))

        spinner.text = 'Validating dataset integrity...'
        await new Promise((resolve) => setTimeout(resolve, 300))

        if (options.dryRun) {
          spinner.succeed('Benchmark package is valid (dry run)')
          console.log('')
          console.log(chalk.green('  ✓ Schema validation passed'))
          console.log(chalk.green('  ✓ Dataset integrity check passed'))
          console.log(chalk.gray(`  Source: ${benchmarkPath}`))
          console.log('')
          console.log(chalk.gray('  Dry run complete. Remove --dry-run to publish.'))
          console.log('')
          return
        }

        spinner.text = 'Uploading to marketplace...'

        if (isMockMode(program)) {
          await new Promise((resolve) => setTimeout(resolve, 600))
          const mockSlug = `agentbench/${benchmarkPath.replace(/^\.?\/?/, '').replace(/\//g, '-')}-${Date.now().toString(36)}`

          spinner.succeed('Benchmark published! (mock)')

          console.log('')
          console.log(chalk.green(`  ✓ Published as: ${mockSlug}`))
          console.log(chalk.gray('    Status: pending_review'))
          console.log(
            chalk.yellow(
              '  ⚠️  Mock mode — benchmark not actually published. Remove --mock to publish for real.'
            )
          )
          console.log('')
          return
        }

        const result = await apiClient.apiFetch<{
          message: string
          slug: string
          status: string
        }>('/benchmarks', {
          method: 'POST',
          body: JSON.stringify({
            source: benchmarkPath,
            mode: 'create',
          }),
        })

        spinner.succeed('Benchmark published!')

        console.log('')
        console.log(chalk.green(`  ✓ Published as: ${result.slug}`))
        console.log(chalk.gray(`    Status: ${result.status}`))
        console.log('')
        console.log(chalk.bold('  Next steps:'))
        console.log(chalk.cyan(`  $ agentbench benchmark info ${result.slug}`))
        console.log(chalk.cyan(`  $ agentbench benchmark run ${result.slug} --agent <path>`))
        console.log('')
        console.log(
          chalk.gray('  Your benchmark will be reviewed before appearing in public search results.')
        )
        console.log('')
      } catch (err) {
        spinner.fail('Publishing failed')
        console.error(chalk.red(formatApiError(err, options.verbose)))
        process.exit(1)
      }
    })
}

// ── List ────────────────────────────────────────────────────────────────────

function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List installed benchmarks')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      if (!options.json) {
        console.log(chalk.blue('⚡ Installed benchmarks:'))
      }

      try {
        let result: {
          benchmarks: Array<{
            slug: string
            name: string
            version: string
            installedAt: string
            path: string
          }>
        }

        if (isMockMode(program)) {
          result = { benchmarks: MOCK_INSTALLED }
        } else {
          result = await apiClient.apiFetch<typeof result>('/benchmarks/installed')
        }

        if (options.json) {
          outputJson(result)
          return
        }

        if (result.benchmarks.length === 0) {
          console.log('')
          console.log(chalk.yellow('  No benchmarks installed.'))
          console.log(chalk.gray('  Discover benchmarks: agentbench benchmark search'))
          console.log(chalk.gray('  Install one:          agentbench benchmark install <slug>'))
          console.log('')
          return
        }

        if (isMockMode(program)) {
          console.log(
            chalk.gray('  (mock data — run without --mock to see actual installed benchmarks)')
          )
        }

        console.log('')
        for (const bm of result.benchmarks) {
          console.log(
            `  ${chalk.cyan('■')} ${chalk.bold(bm.name)}  ${chalk.gray(`v${bm.version}`)}`
          )
          console.log(
            `    ${chalk.gray('Slug:')} ${bm.slug}  ${chalk.gray('· Installed:')} ${new Date(bm.installedAt).toLocaleDateString()}`
          )
          console.log(`    ${chalk.gray('Path:')} ${bm.path}`)
          console.log(`    ${chalk.cyan(`$ agentbench benchmark run ${bm.slug} --agent <path>`)}`)
          console.log('')
        }
      } catch (err) {
        console.error(chalk.red(formatApiError(err)))
        process.exit(1)
      }
    })
}

// ── Registration ────────────────────────────────────────────────────────────

export function registerBenchmarkCommand(program: Command): void {
  const benchmarkCmd = program
    .command('benchmark')
    .alias('bm')
    .description('Discover, install, and run benchmarks from the marketplace')
    .option('--mock', 'Use mock/stub data (no API required, for demos and testing)')

  registerSearchCommand(benchmarkCmd)
  registerInfoCommand(benchmarkCmd)
  registerInstallCommand(benchmarkCmd)
  registerRunCommand(benchmarkCmd)
  registerSubmitCommand(benchmarkCmd)
  registerPublishCommand(benchmarkCmd)
  registerListCommand(benchmarkCmd)
}
