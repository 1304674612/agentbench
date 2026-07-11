import { spawn } from 'node:child_process'
import type { Command } from 'commander'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import * as readline from 'node:readline'
import chalk from 'chalk'
import ora from 'ora'
import { configFileExists, getConfigFilePath, readEnvConfig, writeEnvConfig } from '../lib/config'
import {
  renderLogo,
  renderSuccessMessage,
  getConfigTemplate,
  getTestTemplate,
  getAgentTemplate,
  getDatasetTemplate,
  getCIWorkflowTemplate,
  getGitignoreEntries,
  getProviderLabel,
} from '../lib/templates'
import type { Language, TemplateKind, Provider } from '../lib/types'

// ── Prompt Helpers ────────────────────────────────────────────────────────────

function createPrompter(): {
  question: (q: string, defaultValue?: string) => Promise<string>
  confirm: (q: string, defaultYes?: boolean) => Promise<boolean>
  select: (
    q: string,
    choices: Array<{ value: string; label: string }>,
    defaultValue?: string
  ) => Promise<string>
  close: () => void
} {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  function question(q: string, defaultValue?: string): Promise<string> {
    const suffix = defaultValue ? ` (${chalk.gray(defaultValue)})` : ''
    return new Promise((resolve) => {
      rl.question(`${q}${suffix}: `, (answer) => {
        resolve(answer.trim() || (defaultValue ?? ''))
      })
    })
  }

  async function confirm(q: string, defaultYes = true): Promise<boolean> {
    const yn = defaultYes ? 'Y/n' : 'y/N'
    const answer = await question(`${q} ${chalk.gray(`[${yn}]`)}`)
    if (!answer) return defaultYes
    return answer.toLowerCase().startsWith('y')
  }

  async function select(
    q: string,
    choices: Array<{ value: string; label: string }>,
    defaultValue?: string
  ): Promise<string> {
    console.log(chalk.bold(`\n${q}`))
    const defaultIdx = defaultValue ? choices.findIndex((c) => c.value === defaultValue) : 0
    for (let i = 0; i < choices.length; i++) {
      const prefix = choices[i].value === defaultValue ? chalk.cyan(' ❯') : '  '
      console.log(` ${prefix} ${chalk.bold(`${i + 1}.`)} ${choices[i].label}`)
    }
    const answer = await question(
      chalk.gray(`  Enter 1-${choices.length}`),
      defaultValue ? String(defaultIdx + 1) : '1'
    )
    const idx = parseInt(answer, 10) - 1
    if (Number.isNaN(idx) || idx < 0 || idx >= choices.length) {
      return choices[defaultIdx]?.value ?? choices[0].value
    }
    return choices[idx].value
  }

  function close(): void {
    rl.close()
  }

  return { question, confirm, select, close }
}

// ── Provider Key Scanner ──────────────────────────────────────────────────────

interface KeyStatus {
  provider: string
  envVar: string
  found: boolean
}

function scanApiKeys(): KeyStatus[] {
  const envVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'DEEPSEEK_API_KEY',
    'OPENROUTER_API_KEY',
    'AZURE_OPENAI_API_KEY',
    'GROQ_API_KEY',
    'MISTRAL_API_KEY',
    'COHERE_API_KEY',
  ]

  return envVars.map((envVar) => {
    // Read from process.env and from .env.agentbench
    const fromEnv = process.env[envVar]
    const fromFile = readEnvConfig()[envVar]
    return {
      provider: envVar.replace('_API_KEY', '').toLowerCase(),
      envVar,
      found: !!(fromEnv || fromFile),
    }
  })
}

function renderKeyStatus(keys: KeyStatus[]): void {
  console.log(chalk.bold('\n  API key status:'))
  for (const k of keys) {
    const icon = k.found ? chalk.green('  ✓') : chalk.red('  ✗')
    const label = getProviderLabel(k.provider)
    const status = k.found ? chalk.green('found') : chalk.gray('not set')
    console.log(`  ${icon} ${chalk.bold(label.padEnd(16))} ${status}`)
  }
  const foundCount = keys.filter((k) => k.found).length
  console.log(chalk.gray(`\n  ${foundCount} of ${keys.length} providers configured\n`))
}

// ── Steps ─────────────────────────────────────────────────────────────────────

function stepHeader(step: number, title: string): void {
  console.log(`\n${chalk.hex('#7C3AED').bold(`  [Step ${step}]`)} ${chalk.bold(title)}`)
}

// ── Main Command ──────────────────────────────────────────────────────────────

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a new AgentBench project with interactive onboarding')
    .option('-y, --yes', 'Skip all prompts and use defaults')
    .option(
      '-t, --template <name>',
      'Project template: hello-agent, customer-support, rag-agent, empty'
    )
    .option('-p, --provider <name>', 'LLM provider: openai, anthropic, gemini, deepseek, etc.')
    .option('--ci', 'Generate GitHub Actions CI workflow')
    .option('-f, --force', 'Overwrite existing configuration')
    .option('-q, --quick', 'Zero prompts: auto-detect keys, scaffold, and run tests immediately')
    .action(async (options) => {
      // ── Welcome Banner ──────────────────────────────────────────────────
      // --quick mode: skip the logo banner for a cleaner output
      if (!options.quick) {
        console.log(renderLogo())
      }

      const spinner = ora()

      // --quick implies --yes (skip all prompts)
      if (options.quick) {
        options.yes = true
      }

      // Check for existing config
      if (!options.force && configFileExists()) {
        if (options.quick) {
          // --quick mode: auto-force when config already exists
          options.force = true
        } else {
          console.log(
            chalk.yellow('  ⚠ agentbench.config.ts already exists. Use --force to overwrite.\n')
          )
          return
        }
      }

      const prompter = createPrompter()
      const cwd = process.cwd()
      const dirName = nodePath.basename(cwd)

      try {
        // ── Step 1: Project basics ───────────────────────────────────────
        if (!options.quick) stepHeader(1, 'Project settings')

        const projectName = options.yes
          ? dirName
          : await prompter.question('  Project name', dirName)

        let language: Language = 'ts'
        if (!options.yes) {
          language = (await prompter.select(
            '  Language:',
            [
              { value: 'ts', label: 'TypeScript' },
              { value: 'js', label: 'JavaScript' },
            ],
            'ts'
          )) as Language
        }

        // --quick mode: force JavaScript so tests run immediately without
        // a TypeScript compilation step (Node can't import .ts files directly).
        if (options.quick) {
          language = 'js'
        }

        let packageManager = 'npm'
        if (!options.yes) {
          // Detect available package managers
          const pmOptions = [
            { value: 'npm', label: 'npm' },
            { value: 'pnpm', label: 'pnpm' },
            { value: 'yarn', label: 'yarn' },
            { value: 'bun', label: 'bun' },
          ]
          packageManager = await prompter.select('  Package manager:', pmOptions, 'npm')
        }

        // ── Step 2: API keys ─────────────────────────────────────────────
        if (!options.quick) stepHeader(2, 'API keys')

        const keys = scanApiKeys()
        if (!options.quick) renderKeyStatus(keys)

        let selectedProvider: Provider = 'openai'
        if (options.provider) {
          selectedProvider = options.provider as Provider
        } else if (!options.yes) {
          // Ask which provider to use
          const providerChoices = keys.map((k) => ({
            value: k.provider,
            label: `${getProviderLabel(k.provider)} ${k.found ? chalk.green('(key found)') : chalk.red('(not set)')}`,
          }))
          selectedProvider = (await prompter.select(
            '  Select default LLM provider:',
            providerChoices,
            keys.find((k) => k.found)?.provider ?? 'openai'
          )) as Provider

          // Offer to configure missing keys
          const selectedKey = keys.find((k) => k.provider === selectedProvider)
          if (selectedKey && !selectedKey.found) {
            const wantConfig = await prompter.confirm(
              `  Configure ${selectedKey.envVar} now?`,
              true
            )
            if (wantConfig) {
              const keyValue = await prompter.question(`  ${selectedKey.envVar}=`)
              if (keyValue) {
                writeEnvConfig(selectedKey.envVar, keyValue, cwd)
                console.log(chalk.green(`  ✓ Saved ${selectedKey.envVar} to .env.agentbench`))
              }
            }
          }

          // Ask about other missing keys
          const unconfiguredKeys = keys.filter((k) => !k.found && k.provider !== selectedProvider)
          if (unconfiguredKeys.length > 0) {
            const wantMore = await prompter.confirm(
              `  Configure ${unconfiguredKeys.length} other missing API keys?`,
              false
            )
            if (wantMore) {
              for (const k of unconfiguredKeys) {
                const val = await prompter.question(`  ${k.envVar} (leave empty to skip)`)
                if (val) {
                  writeEnvConfig(k.envVar, val, cwd)
                  console.log(chalk.green(`  ✓ Saved ${k.envVar}`))
                }
              }
            }
          }
        } else {
          // --yes mode: pick the first found provider
          const firstFound = keys.find((k) => k.found)
          if (firstFound) selectedProvider = firstFound.provider as Provider
        }

        // ── Step 3: Template ──────────────────────────────────────────────
        if (!options.quick) stepHeader(3, 'Project template')

        let template: TemplateKind = 'hello-agent'
        if (options.template) {
          const validTemplates = ['hello-agent', 'customer-support', 'rag-agent', 'empty']
          if (validTemplates.includes(options.template)) {
            template = options.template as TemplateKind
          } else {
            console.log(
              chalk.yellow(`  ⚠ Unknown template "${options.template}". Using "hello-agent".`)
            )
          }
        } else if (!options.yes) {
          template = (await prompter.select(
            '  Choose a starting template:',
            [
              {
                value: 'hello-agent',
                label: `Hello Agent  ${chalk.gray('— Simple conversational agent with CSV-driven tests')}`,
              },
              {
                value: 'customer-support',
                label: `Customer Support  ${chalk.gray('— Support agent with refund, escalation scenarios')}`,
              },
              {
                value: 'rag-agent',
                label: `RAG Agent  ${chalk.gray('— Retrieval-augmented agent with knowledge base')}`,
              },
              {
                value: 'empty',
                label: `Empty  ${chalk.gray('— Bare scaffold. Build from scratch.')}`,
              },
            ],
            'hello-agent'
          )) as TemplateKind
        }

        // Template descriptions
        const templateDescriptions: Record<TemplateKind, string> = {
          'hello-agent':
            'Simple conversational agent with greetings, factual questions, and CSV-driven parametrized tests.',
          'customer-support':
            'Customer support agent handling refunds, returns, and escalation scenarios.',
          'rag-agent': 'RAG agent that retrieves documents before answering, with source citation.',
          empty: 'Empty scaffold — add your own agent and tests.',
        }
        if (!options.quick) console.log(`  ${chalk.gray(templateDescriptions[template])}`)

        // ── Step 4: Directory layout ──────────────────────────────────────
        if (!options.quick) stepHeader(4, 'Directory layout')

        let testDir = 'tests'
        let srcDir = 'src'
        let datasetDir = 'dataset'
        let reportDir = 'reports'
        let examplesDir = 'examples'

        if (!options.yes) {
          const customize = await prompter.confirm('  Customize directory names?', false)
          if (customize) {
            testDir = await prompter.question('  Test directory', testDir)
            srcDir = await prompter.question('  Source directory', srcDir)
            datasetDir = await prompter.question('  Dataset directory', datasetDir)
            reportDir = await prompter.question('  Report directory', reportDir)
            examplesDir = await prompter.question('  Examples directory', examplesDir)
          }
        }

        if (!options.quick) {
          console.log(chalk.gray(`  Tests:       ${testDir}/`))
          console.log(chalk.gray(`  Source:      ${srcDir}/`))
          console.log(chalk.gray(`  Datasets:    ${datasetDir}/`))
          console.log(chalk.gray(`  Reports:     ${reportDir}/`))
          console.log(chalk.gray(`  Examples:    ${examplesDir}/`))
        }

        // Determine CI generation
        const includeCI = options.ci || false

        // ── Summary ──────────────────────────────────────────────────────
        if (!options.quick) {
          console.log(chalk.hex('#7C3AED').bold('\n  ─── Summary ───'))
          console.log(chalk.gray(`  Project:     ${projectName}`))
          console.log(chalk.gray(`  Language:    ${language.toUpperCase()}`))
          console.log(chalk.gray(`  Provider:    ${getProviderLabel(selectedProvider)}`))
          console.log(chalk.gray(`  Template:    ${template}`))
          console.log(chalk.gray(`  CI/CD:       ${includeCI ? 'Yes' : 'No'}`))
        }

        if (!options.yes) {
          const proceed = await prompter.confirm('\n  Generate project files?', true)
          if (!proceed) {
            console.log(chalk.yellow('  Aborted.'))
            prompter.close()
            return
          }
        }

        prompter.close()

        // ── Step 5: Generate all files ─────────────────────────────────
        spinner.start('Generating project files...')

        const ext = language === 'ts' ? 'ts' : 'js'

        // 1. agentbench.config.ts
        nodeFs.writeFileSync(
          getConfigFilePath(cwd),
          getConfigTemplate({
            projectName,
            language,
            provider: selectedProvider,
            includeCI,
            testDir,
            srcDir,
            datasetDir,
            reportDir,
            examplesDir,
          }),
          'utf-8'
        )

        // 2. src/agent.ts
        const agentDir = nodePath.join(cwd, srcDir)
        nodeFs.mkdirSync(agentDir, { recursive: true })
        nodeFs.writeFileSync(
          nodePath.join(agentDir, `agent.${ext}`),
          getAgentTemplate(language, template, srcDir),
          'utf-8'
        )

        // 3. tests/ directory
        const testsDir = nodePath.join(cwd, testDir)
        nodeFs.mkdirSync(testsDir, { recursive: true })
        const testFile = template === 'empty' ? 'first-suite' : `${template}`
        nodeFs.writeFileSync(
          nodePath.join(testsDir, `${testFile}.test.${ext}`),
          getTestTemplate({ language, template, testDir, srcDir, datasetDir }),
          'utf-8'
        )

        // 4. dataset/ directory (if applicable)
        const datasetContent = getDatasetTemplate(template)
        if (datasetContent) {
          const datasetFullDir = nodePath.join(cwd, datasetDir)
          nodeFs.mkdirSync(datasetFullDir, { recursive: true })
          nodeFs.writeFileSync(
            nodePath.join(datasetFullDir, `${template}.queries.csv`),
            datasetContent,
            'utf-8'
          )
        }

        // 5. examples/ directory
        const examplesFullDir = nodePath.join(cwd, examplesDir)
        nodeFs.mkdirSync(examplesFullDir, { recursive: true })
        nodeFs.writeFileSync(nodePath.join(examplesFullDir, '.gitkeep'), '', 'utf-8')

        // 6. reports/ directory
        const reportsFullDir = nodePath.join(cwd, reportDir)
        nodeFs.mkdirSync(reportsFullDir, { recursive: true })
        nodeFs.writeFileSync(nodePath.join(reportsFullDir, '.gitkeep'), '', 'utf-8')

        // 7. .agentbench/ directory
        const agentbenchDir = nodePath.join(cwd, '.agentbench')
        nodeFs.mkdirSync(agentbenchDir, { recursive: true })
        nodeFs.mkdirSync(nodePath.join(agentbenchDir, 'snapshots'), { recursive: true })
        // Ignore file so the dir is committed but contents are not
        nodeFs.writeFileSync(
          nodePath.join(agentbenchDir, '.gitignore'),
          '*\n!snapshots/\nsnapshots/*\n!snapshots/.gitkeep\n',
          'utf-8'
        )
        nodeFs.writeFileSync(nodePath.join(agentbenchDir, 'snapshots', '.gitkeep'), '', 'utf-8')

        // 8. .github/workflows/agentbench.yml (if CI)
        if (includeCI) {
          const workflowsDir = nodePath.join(cwd, '.github', 'workflows')
          nodeFs.mkdirSync(workflowsDir, { recursive: true })
          nodeFs.writeFileSync(
            nodePath.join(workflowsDir, 'agentbench.yml'),
            getCIWorkflowTemplate(),
            'utf-8'
          )
        }

        // 9. .gitignore entries
        const gitignorePath = nodePath.join(cwd, '.gitignore')
        const gitignoreContent = getGitignoreEntries()
        if (nodeFs.existsSync(gitignorePath)) {
          const existing = nodeFs.readFileSync(gitignorePath, 'utf-8')
          if (!existing.includes('.agentbench/')) {
            nodeFs.appendFileSync(gitignorePath, gitignoreContent)
          }
        } else {
          nodeFs.writeFileSync(gitignorePath, gitignoreContent.trimStart(), 'utf-8')
        }

        // 10. .env.agentbench (if not already created during key config)
        const envPath = nodePath.join(cwd, '.env.agentbench')
        if (!nodeFs.existsSync(envPath)) {
          // Write the selected provider key if we found it in env
          const selectedKeyStatus = keys.find((k) => k.provider === selectedProvider)
          if (selectedKeyStatus?.found) {
            const envVal = process.env[selectedKeyStatus.envVar] ?? ''
            if (envVal) {
              nodeFs.writeFileSync(
                envPath,
                `# AgentBench environment configuration\n${selectedKeyStatus.envVar}=${envVal}\n`,
                'utf-8'
              )
            }
          } else {
            nodeFs.writeFileSync(
              envPath,
              `# AgentBench environment configuration\n# Add your API keys below:\n# OPENAI_API_KEY=sk-...\n# ANTHROPIC_API_KEY=sk-ant-...\n`,
              'utf-8'
            )
          }
        }

        spinner.succeed('Project files generated')

        // ── Quick mode: install deps and run tests immediately ──────────
        if (options.quick) {
          // Ensure package.json exists so @agentbench/core can be resolved.
          // When running from a global install, the user's project needs its own
          // copy of @agentbench/core; we create a minimal package.json and
          // install it automatically.
          const pkgJsonPath = nodePath.join(cwd, 'package.json')
          if (!nodeFs.existsSync(pkgJsonPath)) {
            nodeFs.writeFileSync(
              pkgJsonPath,
              JSON.stringify(
                {
                  name: projectName,
                  private: true,
                  type: 'module',
                  dependencies: {
                    '@agentbench/core': '^0.3.0',
                  },
                },
                null,
                2
              ) + '\n',
              'utf-8'
            )
          }

          // Install dependencies
          spinner.start('Installing dependencies...')
          const installExitCode: number = await new Promise((resolve) => {
            const install = spawn('npm', ['install', '--loglevel=error'], {
              cwd,
              stdio: 'inherit',
            })

            install.on('close', (code: number | null) => {
              resolve(code ?? 1)
            })

            install.on('error', () => {
              resolve(1)
            })
          })

          if (installExitCode !== 0) {
            spinner.warn('npm install skipped — package may not be published yet')
            console.log(
              chalk.gray('  The test runner will resolve @agentbench/core from the CLI.\n')
            )
            // Don't exit — the test runner has a symlink fallback for
            // @agentbench/core resolution from the CLI's own node_modules.
          } else {
            spinner.succeed('Dependencies installed')
          }

          // Run the tests
          console.log(chalk.gray('\n  Running tests...\n'))

          const testExitCode: number = await new Promise((resolve) => {
            // Use the same node binary and CLI script so it works regardless
            // of how agentbench was invoked (global install, npx, monorepo dev).
            const child = spawn(process.execPath, [process.argv[1], 'test'], {
              cwd,
              stdio: 'inherit',
            })

            child.on('close', (code) => {
              resolve(code ?? 1)
            })

            child.on('error', (err) => {
              console.error(chalk.red(`  Failed to run agentbench test: ${err.message}`))
              resolve(1)
            })
          })

          console.log(
            chalk.green(
              '\n✓ AgentBench is ready. Edit tests/hello-agent.test.ts to test your own agent.\n'
            )
          )

          process.exit(testExitCode)
        }

        // ── Success Message ────────────────────────────────────────────
        console.log(renderSuccessMessage(projectName, template, packageManager))
      } catch (err) {
        spinner.fail('Initialization failed')
        console.error(chalk.red(err instanceof Error ? err.message : String(err)))
        prompter.close()
        process.exit(1)
      }
    })
}
