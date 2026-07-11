import type { Command } from 'commander'
import chalk from 'chalk'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'

interface WatchOptions {
  pollInterval: number
  verbose: boolean
}

function watchFiles(
  dirs: string[],
  callback: (filePath: string) => void,
  opts: WatchOptions
): () => void {
  const watchedFiles = new Set<string>()
  const timers: ReturnType<typeof setInterval>[] = []
  const fileMTimes = new Map<string, number>()

  // Simple polling-based watcher using fs.stat
  function scanDirectory(dir: string): void {
    try {
      const entries = nodeFs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = nodePath.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDirectory(fullPath)
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json|yml|yaml|toml)$/.test(entry.name)) {
          watchedFiles.add(fullPath)
        }
      }
    } catch (error) {
      // Directory may not exist yet — ignore
      console.error('[DEV] Failed to scan directory:', error)
    }
  }

  // Initial scan
  for (const dir of dirs) {
    scanDirectory(dir)
    // Check if it's a single file
    if (nodeFs.existsSync(dir) && nodeFs.statSync(dir).isFile()) {
      watchedFiles.add(dir)
    }
  }

  // Seed mtimes
  for (const f of watchedFiles) {
    try {
      fileMTimes.set(f, nodeFs.statSync(f).mtimeMs)
    } catch (error) {
      console.error('[DEV] Failed to stat file for mtime seeding:', error)
    }
  }

  if (opts.verbose) {
    console.log(chalk.gray(`  Watching ${watchedFiles.size} file(s)...`))
  }

  // Poll for changes
  const timer = setInterval(() => {
    // Re-scan directories to pick up new files
    for (const dir of dirs) {
      scanDirectory(dir)
    }

    for (const f of watchedFiles) {
      try {
        const stat = nodeFs.statSync(f)
        const prev = fileMTimes.get(f) ?? 0
        if (stat.mtimeMs > prev) {
          fileMTimes.set(f, stat.mtimeMs)
          callback(f)
        }
      } catch (error) {
        // File may have been deleted
        console.error('[DEV] Failed to stat watched file:', error)
        fileMTimes.delete(f)
      }
    }
  }, opts.pollInterval)

  timers.push(timer)

  // Return cleanup function
  return () => {
    for (const t of timers) {
      clearInterval(t)
    }
  }
}

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Start development mode — watch for file changes and re-run tests')
    .option('-p, --project <id>', 'Project ID')
    .option('-w, --watch <paths...>', 'Additional paths to watch')
    .option('--poll-interval <ms>', 'Polling interval in ms', '1000')
    .option('-v, --verbose', 'Verbose output')
    .option('--no-tests', 'Watch only, do not run tests')
    .action(async (options) => {
      console.log(chalk.blue('⚡ AgentBench Dev Mode'))
      console.log(chalk.gray('  Watching for file changes...'))
      console.log(chalk.gray('  Press Ctrl+C to stop'))
      console.log('')

      const cwd = process.cwd()
      const watchDirs = options.watch ? [...options.watch] : [cwd]

      // Always include agentbench.config.ts if it exists
      const configPath = nodePath.join(cwd, 'agentbench.config.ts')
      if (nodeFs.existsSync(configPath)) {
        watchDirs.push(configPath)
      }

      if (options.verbose) {
        console.log(chalk.gray(`  Watch paths: ${watchDirs.join(', ')}`))
      }

      let running = false
      let pendingChange = false

      const runTests = async () => {
        if (running) {
          pendingChange = true
          return
        }

        running = true
        pendingChange = false

        const timestamp = new Date().toLocaleTimeString()
        console.log(chalk.blue(`\n[${timestamp}] Changes detected — running tests...`))

        try {
          // Use child process to run the test command
          const { execSync } = await import('node:child_process')
          const args = ['agentbench', 'test']
          if (options.project) {
            args.push('-p', options.project)
          }
          console.log(chalk.gray(`  $ ${args.join(' ')}`))
          console.log('')

          execSync(args.join(' '), {
            cwd,
            stdio: 'inherit',
            env: { ...process.env, FORCE_COLOR: '1' },
          })
        } catch (error) {
          // Test failures are expected in dev mode — don't kill the watcher
          console.error('[DEV] Test execution failed:', error)
          console.log(chalk.yellow('  Tests failed — waiting for changes...'))
        }

        running = false

        // If more changes came in while running, re-run
        if (pendingChange) {
          setTimeout(() => {
            void runTests()
          }, 500)
        }
      }

      const stopWatch = watchFiles(
        watchDirs,
        (_filePath: string) => {
          if (options.verbose) {
            console.log(chalk.gray(`  File changed: ${_filePath}`))
          }
          if (!options.noTests) {
            void runTests()
          }
        },
        {
          pollInterval: parseInt(options.pollInterval),
          verbose: options.verbose,
        }
      )

      // Handle graceful shutdown
      const shutdown = () => {
        console.log(chalk.gray('\n  Shutting down dev mode...'))
        stopWatch()
        process.exit(0)
      }

      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
    })
}
