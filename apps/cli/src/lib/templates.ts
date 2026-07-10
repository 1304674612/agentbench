import chalk from 'chalk'
import type { TemplateKind, Language, Provider } from './types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type { TemplateKind, Language, Provider }

// ── Config Template ───────────────────────────────────────────────────────────

export interface ConfigTemplateOptions {
  projectName: string
  language: Language
  provider: Provider
  includeCI: boolean
  testDir: string
  datasetDir: string
  srcDir: string
  reportDir: string
  examplesDir: string
}

export function getConfigTemplate(opts: ConfigTemplateOptions): string {
  return `import { defineConfig } from '@agentbench/core'

export default defineConfig({
  // ── Project ────────────────────────────────────────────────────────────────
  name: '${opts.projectName}',

  // ── Default LLM ────────────────────────────────────────────────────────────
  model: {
    provider: '${opts.provider}',
    model: '${getDefaultModel(opts.provider)}',
    temperature: 0.7,
    maxTokens: 4096,
  },

  // ── Test Configuration ─────────────────────────────────────────────────────
  tests: {
    timeout: 30000,
    maxSteps: 10,
    retries: 1,
    dir: '${opts.testDir}',
    setupFiles: [],
  },

  // ── Directory Layout ───────────────────────────────────────────────────────
  dirs: {
    src: '${opts.srcDir}',
    tests: '${opts.testDir}',
    datasets: '${opts.datasetDir}',
    reports: '${opts.reportDir}',
    examples: '${opts.examplesDir}',
  },

  // ── Snapshots ──────────────────────────────────────────────────────────────
  snapshots: {
    enabled: true,
    dir: '.agentbench/snapshots',
    autoUpdate: false,
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [],
})
`
}

function getDefaultModel(provider: Provider): string {
  const models: Record<Provider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.5-flash',
    deepseek: 'deepseek-chat',
    openrouter: 'openai/gpt-4o',
    azure: 'gpt-4o',
    groq: 'llama-4-scout-17b-16e-instruct',
    mistral: 'mistral-large-latest',
    cohere: 'command-r-plus',
  }
  return models[provider] ?? 'gpt-4o'
}

// ── Test Templates ───────────────────────────────────────────────────────────

export interface TestTemplateOptions {
  language: Language
  template: TemplateKind
  testDir: string
  srcDir: string
  datasetDir: string
}

export function getTestTemplate(opts: TestTemplateOptions): string {
  switch (opts.template) {
    case 'hello-agent':
      return getHelloAgentTest(opts)
    case 'customer-support':
      return getCustomerSupportTest(opts)
    case 'rag-agent':
      return getRagAgentTest(opts)
    case 'empty':
      return getEmptyTest()
    default:
      return getHelloAgentTest(opts)
  }
}

function getHelloAgentTest(opts: TestTemplateOptions): string {
  return `import { defineSuite, defineTest } from '@agentbench/core'
import { agent } from '../${opts.srcDir}/agent'
import { loadCsvDataset } from '@agentbench/core/dataset'

const queries = loadCsvDataset('${opts.datasetDir}/hello-agent.queries.csv')

export default defineSuite({
  name: 'Hello Agent',
  description: 'Basic smoke tests — verify the agent responds correctly to simple prompts.',

  tests: [
    defineTest({
      name: 'greets the user',
      description: 'Agent should respond with a friendly greeting and introduce itself.',

      async run() {
        const result = await agent.chat('Hello! Who are you?')
        return result
      },

      assertions: [
        { type: 'contains', params: { substring: 'agent' } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'answers factual questions',
      description: 'Agent should provide correct answers to simple factual questions.',

      async run() {
        const result = await agent.chat('What is 2 + 2?')
        return result
      },

      assertions: [
        { type: 'contains', params: { substring: '4' } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'handles empty input gracefully',
      description: 'Agent should not crash or return an error on empty input.',

      async run() {
        const result = await agent.chat('')
        return result
      },

      assertions: [
        { type: 'not-empty', params: {} },
      ],
    }),
  ],

  // CSV-driven parametrized tests
  parametrize: queries.map((row) =>
    defineTest({
      name: \`CSV: \${row.query.slice(0, 40)}\`,
      description: 'Parametrized test from dataset.',

      async run() {
        const result = await agent.chat(row.query)
        return { result, expectedContains: row.expectedContains }
      },

      assertions: [
        {
          type: 'contains',
          params: { substring: row.expectedContains },
        },
        { type: 'not-empty', params: {} },
      ],
    }),
  ),
})
`
}

function getCustomerSupportTest(opts: TestTemplateOptions): string {
  return `import { defineSuite, defineTest } from '@agentbench/core'
import { agent } from '../${opts.srcDir}/agent'

export default defineSuite({
  name: 'Customer Support Agent',
  description: 'Evaluate the agent on common customer-support scenarios.',

  tests: [
    defineTest({
      name: 'handles refund request',
      description: 'Agent should process a refund request with empathy and correct policy.',

      async run() {
        const result = await agent.chat(
          'I received a damaged item in my order #12345. I want a refund.',
        )
        return result
      },

      assertions: [
        { type: 'contains', params: { substring: 'refund' } },
        { type: 'contains', params: { substring: 'sorry' } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'redirects to human when needed',
      description: 'Agent should escalate complex issues to a human agent.',

      async run() {
        const result = await agent.chat(
          'I need to dispute a charge from 6 months ago. This is a legal matter.',
        )
        return result
      },

      assertions: [
        { type: 'contains-any', params: { substrings: ['human', 'escalate', 'specialist', 'team'] } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'stays on brand',
      description: 'Agent should maintain a professional and helpful tone.',

      async run() {
        const result = await agent.chat('You are useless and terrible!')
        return result
      },

      assertions: [
        { type: 'not-contains', params: { substring: 'stupid' } },
        { type: 'not-empty', params: {} },
      ],
    }),
  ],
})
`
}

function getRagAgentTest(opts: TestTemplateOptions): string {
  return `import { defineSuite, defineTest } from '@agentbench/core'
import { agent } from '../${opts.srcDir}/agent'

export default defineSuite({
  name: 'RAG Agent',
  description: 'Evaluate a Retrieval-Augmented Generation agent on knowledge-intensive tasks.',

  tests: [
    defineTest({
      name: 'retrieves from knowledge base',
      description: 'Agent should retrieve and cite relevant documents.',

      async run() {
        const result = await agent.chat(
          'What is the refund policy for digital products?',
        )
        return result
      },

      assertions: [
        { type: 'contains', params: { substring: 'policy' } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'admits when no knowledge found',
      description: 'Agent should be honest when relevant documents are not found.',

      async run() {
        const result = await agent.chat(
          'What is the CEO\\'s favorite pizza topping?',
        )
        return result
      },

      assertions: [
        { type: 'contains-any', params: { substrings: ['don\\'t know', 'not sure', 'no information', 'unable'] } },
        { type: 'not-empty', params: {} },
      ],
    }),

    defineTest({
      name: 'cites sources',
      description: 'Agent should cite sources when providing factual information.',

      async run() {
        const result = await agent.chat(
          'Tell me about the warranty coverage for our products.',
        )
        return result
      },

      assertions: [
        { type: 'semantic-similarity', params: { minScore: 0.6 } },
        { type: 'not-empty', params: {} },
      ],
    }),
  ],
})
`
}

function getEmptyTest(): string {
  return `import { defineSuite } from '@agentbench/core'

export default defineSuite({
  name: 'My Test Suite',
  description: 'Describe what this suite tests.',

  tests: [
    // Add your test cases here. Example:
    //
    // defineTest({
    //   name: 'should return a greeting',
    //   description: 'Agent responds with a friendly greeting.',
    //
    //   async run() {
    //     const result = await agent.chat('Hello!')
    //     return result
    //   },
    //
    //   assertions: [
    //     { type: 'not-empty', params: {} },
    //   ],
    // }),
  ],
})
`
}

// ── Agent Template ────────────────────────────────────────────────────────────

export function getAgentTemplate(
  _language: Language,
  template: TemplateKind,
  _srcDir: string,
): string {
  switch (template) {
    case 'hello-agent':
      return getHelloAgentImpl()
    case 'customer-support':
      return getCustomerSupportImpl()
    case 'rag-agent':
      return getRagAgentImpl()
    case 'empty':
      return getEmptyAgentImpl()
    default:
      return getHelloAgentImpl()
  }
}

function getHelloAgentImpl(): string {
  return `import { createAgent } from '@agentbench/core'

/**
 * Hello Agent — a simple conversational agent.
 *
 * This agent uses the default provider and model configured in
 * your agentbench.config.ts. It is the entry-point for test suites.
 */
export const agent = createAgent({
  name: 'HelloAgent',
  description: 'A friendly agent that answers questions and greets users.',

  systemPrompt: \`You are a helpful, friendly AI assistant named "HelloAgent".
You answer questions concisely and cheerfully.
Always introduce yourself when someone asks who you are.
Keep responses under 3 sentences unless the user asks for detail.\`,

  tools: [
    // Add tools here. Example:
    // {
    //   name: 'get_current_time',
    //   description: 'Get the current time in the user\\'s timezone.',
    //   handler: async () => new Date().toISOString(),
    // },
  ],

  options: {
    maxSteps: 10,
    timeout: 30000,
  },
})
`
}

function getCustomerSupportImpl(): string {
  return `import { createAgent } from '@agentbench/core'

/**
 * Customer Support Agent — handles inbound customer queries.
 */
export const agent = createAgent({
  name: 'CustomerSupportAgent',
  description: 'A professional support agent that handles refunds, returns, and general inquiries.',

  systemPrompt: \`You are a customer support agent for Acme Corp, an e-commerce company.
You help customers with:
- Order status and tracking
- Returns and refunds (within 30 days)
- Product questions
- Account issues

Be empathetic, professional, and concise. For legal or complex billing disputes, escalate
to a human agent by saying "Let me connect you with a specialist."

Return policy: 30-day returns. Digital products: refund only if not downloaded.
Shipping: 3-5 business days standard, 1-2 days express.
Warranty: 1 year on electronics, 90 days on accessories.\`,

  tools: [
    // Add tools for order lookup, refund processing, etc.
  ],

  options: {
    maxSteps: 10,
    timeout: 30000,
  },
})
`
}

function getRagAgentImpl(): string {
  return `import { createAgent } from '@agentbench/core'

/**
 * RAG Agent — Retrieval-Augmented Generation agent with a knowledge base.
 */
export const agent = createAgent({
  name: 'RagAgent',
  description: 'A RAG agent that answers questions using retrieved documents.',

  systemPrompt: \`You are a knowledgeable assistant with access to an internal knowledge base.
When answering questions:
- Retrieve relevant documents before responding.
- Cite specific document sections when applicable.
- If the knowledge base does not contain relevant information, say so honestly.
- Keep responses concise and well-structured.

The knowledge base contains company policies, product documentation, and FAQs.\`,

  tools: [
    // {
    //   name: 'search_knowledge_base',
    //   description: 'Search the internal knowledge base for relevant documents.',
    //   handler: async ({ query }: { query: string }) => {
    //     // Implement your RAG retrieval here
    //     return { documents: [] }
    //   },
    // },
  ],

  options: {
    maxSteps: 10,
    timeout: 30000,
  },
})
`
}

function getEmptyAgentImpl(): string {
  return `import { createAgent } from '@agentbench/core'

/**
 * Your agent — start here.
 *
 * Customize the system prompt, add tools, and configure
 * the agent to match your use-case.
 */
export const agent = createAgent({
  name: 'MyAgent',
  description: 'Describe what your agent does.',

  systemPrompt: \`You are a helpful AI assistant.\`,

  tools: [
    // Add your tools here.
  ],

  options: {
    maxSteps: 10,
    timeout: 30000,
  },
})
`
}

// ── Dataset Template ──────────────────────────────────────────────────────────

export function getDatasetTemplate(template: TemplateKind): string | null {
  switch (template) {
    case 'hello-agent':
      return `query,expectedContains
"Hello! Who are you?","agent"
"What is 2 + 2?","4"
"What is the capital of France?","Paris"
"Tell me a fun fact about space.","star"
"Summarise the plot of Romeo and Juliet.","love"
"How do I reset my password?","reset"
`
    case 'customer-support':
      return `query,expectedContains
"I received a damaged item in my order #12345. I want a refund.","refund"
"My package says delivered but I never got it.","track"
"I need to return a shirt that doesn\\'t fit.","return"
"Do you price match competitors?","price"
"What are your shipping options?","shipping"
"`
    case 'rag-agent':
      return `query,expectedContains
"What is the refund policy for digital products?","policy"
"Tell me about the warranty coverage.","warranty"
"How do I cancel my subscription?","cancel"
"What is the privacy policy?","data"
"How do I contact support?","contact"
"`
    case 'empty':
      return null
    default:
      return null
  }
}

// ── CI Workflow Template ──────────────────────────────────────────────────────

export function getCIWorkflowTemplate(): string {
  return `name: AgentBench

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am UTC

jobs:
  agentbench:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run AgentBench tests
        run: npx agentbench test
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}
          AGENTBENCH_API_URL: \${{ vars.AGENTBENCH_API_URL || 'http://localhost:3000/api/v1' }}

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentbench-report
          path: reports/
          retention-days: 30
`
}

// ── .gitignore Entries ────────────────────────────────────────────────────────

export function getGitignoreEntries(): string {
  return `
# AgentBench
.agentbench/
.env.agentbench
reports/
`
}

// ── Logo / Welcome Banner ─────────────────────────────────────────────────────

export function renderLogo(): string {
  const purple = chalk.hex('#6D28D9')
  const colors = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#A78BFA',
                  '#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'] as const
  const letters = ['A', 'g', 'e', 'n', 't', '•', 'B', 'e', 'n', 'c', 'h']
  const coloredLetters = letters
    .map((l, i) => chalk.bold.hex(colors[i])(l))
    .join('')

  return [
    purple('    ╔═════════════════════════════════════════╗'),
    `${purple('    ║')}    ${coloredLetters}${' '.repeat(12)}${purple('║')}`,
    `${purple('    ║')}    ${chalk.gray('Regression Testing for AI Agents')}${' '.repeat(7)}${purple('║')}`,
    purple('    ╚═════════════════════════════════════════╝'),
    '',
  ].join('\n')
}

// ── Provider label ────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  azure: 'Azure OpenAI',
  groq: 'Groq',
  mistral: 'Mistral',
  cohere: 'Cohere',
}

export function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider
}

// ── Success Message ───────────────────────────────────────────────────────────

export function renderSuccessMessage(
  projectName: string,
  template: TemplateKind,
  packageManager: string,
): string {
  const runCmd = packageManager === 'npm' ? 'npx' : packageManager

  return `
${chalk.green('✓')} Project ${chalk.bold(projectName)} is ready!

${chalk.bold('Quick start:')}

  ${chalk.gray('1.')} Configure your API keys:
     ${chalk.cyan('cat .env.agentbench')}

  ${chalk.gray('2.')} ${template === 'empty' ? 'Write your first test in tests/ and then r' : 'R'}un your tests:
     ${chalk.cyan(`${runCmd} agentbench test`)}

  ${chalk.gray('3.')} Start the dev server (for local eval):
     ${chalk.cyan(`${runCmd} agentbench dev`)}

  ${chalk.gray('4.')} View the test report:
     ${chalk.cyan(`${runCmd} agentbench report`)}

${chalk.bold('Project layout:')}
  ${chalk.gray('├──')} agentbench.config.ts    ${chalk.gray('— Your test configuration')}
  ${chalk.gray('├──')} src/agent.ts            ${chalk.gray('— Your agent implementation')}
  ${chalk.gray('├──')} tests/                  ${chalk.gray('— Test suites')}
  ${chalk.gray('├──')} dataset/               ${chalk.gray('— CSV datasets for parametrized tests')}
  ${chalk.gray('├──')} examples/              ${chalk.gray('— Example prompts and expected outputs')}
  ${chalk.gray('├──')} reports/               ${chalk.gray('— Test run reports')}
  ${chalk.gray('└──')} .agentbench/            ${chalk.gray('— Snapshots and internal state')}

${chalk.gray(`Docs: https://github.com/AgentBench/agentbench  •  Run \`${runCmd} agentbench --help\` for all commands`)}
`
}

// ── Convenience Wrappers (matching the SDK API surface) ────────────────────────

/**
 * Generate agentbench.config.ts content using a simplified config object.
 * This is the primary entry-point for the `init` command.
 */
export function getAgentBenchConfigTemplate(config: {
  name: string
  detectedProviders: string[]
  template: string
}): string {
  const primaryProvider = (config.detectedProviders[0] ?? 'openai') as Provider

  return getConfigTemplate({
    projectName: config.name,
    language: 'ts',
    provider: primaryProvider,
    includeCI: true,
    testDir: 'tests',
    srcDir: 'src',
    datasetDir: 'dataset',
    reportDir: 'report',
    examplesDir: 'examples',
  })
}

/**
 * Return the Hello Agent test suite template content.
 */
export function getHelloAgentTestTemplate(): string {
  return getTestTemplate({
    language: 'ts',
    template: 'hello-agent',
    testDir: 'tests',
    srcDir: 'src',
    datasetDir: 'dataset',
  })
}

/**
 * Return the Hello Agent source implementation template content.
 */
export function getHelloAgentSourceTemplate(): string {
  return getAgentTemplate('ts', 'hello-agent', 'src')
}

/**
 * Return the GitHub Actions CI workflow YAML content.
 */
export function getCITemplate(): string {
  return getCIWorkflowTemplate()
}

/**
 * Return the sample CSV dataset content for the given template kind.
 * Returns null for the 'empty' template.
 */
export function getDatasetTemplateForKind(template: string): string | null {
  return getDatasetTemplate(template as TemplateKind)
}
