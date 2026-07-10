# Contributing to AgentBench

Thanks for your interest in contributing. AgentBench is a monorepo with 15 packages, a CLI, a web dashboard, and a VS Code extension. This guide covers everything you need to get started.

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 -- `npm install -g pnpm`
- **Docker** -- for PostgreSQL + Redis (optional, you can point at existing instances)
- **Git**

### Clone and Install

```bash
git clone git@github.com:1304674612/agentbench.git
cd agentbench
pnpm install
```

### Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose up -d

# Verify services are healthy
docker compose ps
```

### Initialize the Database

```bash
cp .env.example .env
pnpm db:generate    # Generate Prisma Client
pnpm db:push        # Push schema to database
```

### Start Development

```bash
pnpm dev            # Starts all packages in watch mode + web dashboard
```

The dashboard is available at `http://localhost:3000`.

### Run Tests

```bash
pnpm test           # Run all unit tests across packages
pnpm test:watch     # Watch mode
pnpm lint           # Biome linting
pnpm format         # Biome formatting
pnpm typecheck      # TypeScript strict mode check
```

## Monorepo Structure

```
agentbench/
├── packages/                    # 15 packages
│   ├── core/                    #   @agentbench/core -- Engine, types, runner, tracer, evaluator
│   ├── config/                  #   @agentbench/config -- defineConfig, Zod schemas
│   ├── provider-utils/          #   @agentbench/provider-utils -- Base classes for providers
│   ├── openai/                  #   @agentbench/openai
│   ├── anthropic/               #   @agentbench/anthropic
│   ├── gemini/                  #   @agentbench/gemini
│   ├── deepseek/                #   @agentbench/deepseek
│   ├── azure-openai/            #   @agentbench/azure-openai
│   ├── openrouter/              #   @agentbench/openrouter
│   ├── groq/                    #   @agentbench/groq
│   ├── ollama/                  #   @agentbench/ollama
│   ├── mcp/                     #   @agentbench/mcp
│   ├── langgraph/               #   @agentbench/langgraph
│   └── typescript-config/       #   @agentbench/typescript-config -- Shared tsconfig presets
├── apps/
│   ├── cli/                     #   agentbench-cli -- Commander.js + Ink CLI
│   └── web/                     #   agentbench-web -- Next.js dashboard
├── examples/                    #   14 official reference implementations
├── docs/                        #   Documentation (the files you are reading)
├── docker-compose.yml           #   PostgreSQL + Redis for local dev
├── pnpm-workspace.yaml          #   pnpm workspace config
├── biome.json                   #   Biome formatter + linter config
├── vitest.workspace.ts          #   Vitest workspace config
└── turbo.json                   #   Turborepo pipeline config
```

### Dependency Flow

```
@agentbench/core          ← No framework dependencies (pure TypeScript)
  ↑
@agentbench/provider-utils ← Depends on core
  ↑
@agentbench/openai, anthropic, gemini, deepseek, ...  ← Depends on provider-utils
  ↑
agentbench-cli             ← Depends on core + all provider packages
  ↑
agentbench-web             ← Depends on core
```

Changes to `@agentbench/core` affect everything. Run the full test suite before submitting a PR that touches core.

## How to Add a New Provider

### Step 1: Create the package

```bash
mkdir -p packages/my-provider/src
cd packages/my-provider
pnpm init
```

### Step 2: Implement the provider

Use `@agentbench/provider-utils` as your base. If your provider speaks the OpenAI API format (common for Ollama, vLLM, OpenRouter, Groq, LM Studio), extend `OpenAICompatibleProvider`:

```typescript
// packages/my-provider/src/index.ts
import { OpenAICompatibleProvider } from '@agentbench/provider-utils'

export class MyProvider extends OpenAICompatibleProvider {
  readonly id = 'my-provider'
  readonly name = 'My Provider'
  readonly version = '0.1.0'

  readonly capabilities = {
    streaming: true,
    reasoning: false,
    embeddings: false,
    toolCalling: true,
    vision: false,
    functionCalling: false,
    jsonMode: true,
    maxContextWindow: 128000,
    supportedModels: ['my-model-v1', 'my-model-v2'],
  }

  adaptParams(params: ChatCompletionParams): unknown {
    // Translate unified format to your provider's format
    return {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      // ... provider-specific fields
    }
  }

  adaptResponse(raw: unknown): ChatCompletionResult {
    // Translate your provider's response to unified format
    return {
      content: raw.choices[0].message.content,
      toolCalls: raw.choices[0].message.tool_calls?.map(tc => ({...})),
      finishReason: raw.choices[0].finish_reason,
      usage: {
        promptTokens: raw.usage.prompt_tokens,
        completionTokens: raw.usage.completion_tokens,
        totalTokens: raw.usage.total_tokens,
      },
    }
  }

  async countTokens(params: TokenCountParams): Promise<TokenCountResult> {
    // Implement token counting. Use tiktoken if your model uses the same tokenizer
    // as OpenAI, or provide a heuristic counter.
    const count = /* your counting logic */
    return { count }
  }

  calculateCost(usage: Usage, model: string): CostBreakdown {
    // Implement cost calculation based on your provider's pricing
    const inputCost = usage.promptTokens * PRICING[model].inputPerToken
    const outputCost = usage.completionTokens * PRICING[model].outputPerToken
    return { inputCost, outputCost, totalCost: inputCost + outputCost }
  }
}
```

If your provider uses a completely different API format, implement `AgentBenchProvider` directly (a larger interface with 7 methods -- see `packages/core/src/provider/interface.ts`).

### Step 3: Write tests

Create `packages/my-provider/src/__tests__/my-provider.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { MyProvider } from '../index'

describe('MyProvider', () => {
  it('should create a chat completion', async () => {
    const provider = new MyProvider()
    await provider.initialize({ baseUrl: '...' })
    const result = await provider.createChatCompletion({...})
    expect(result.content).toBeDefined()
  })

  it('should count tokens', async () => {
    const provider = new MyProvider()
    const result = await provider.countTokens({ messages: [...] })
    expect(result.count).toBeGreaterThan(0)
  })

  it('should calculate cost', () => {
    const provider = new MyProvider()
    const cost = provider.calculateCost(
      { promptTokens: 100, completionTokens: 50 },
      'my-model-v1'
    )
    expect(cost.totalCost).toBeGreaterThan(0)
  })
})
```

### Step 4: Register and document

Add your provider to the auto-discovery list in `packages/core/src/provider/registry.ts`, add it as a dependency of `agentbench-cli`, and create a README following the pattern in `packages/openai/README.md`.

## How to Add a New Evaluator / Judge

### Rule-Based Evaluator

Add a new evaluator to `packages/core/src/evaluator/rule-evaluator.ts`:

```typescript
export const ruleEvaluators: Record<string, RuleEvaluator> = {
  // ... existing evaluators

  myNewRule: {
    name: 'my_new_rule',
    description: 'Validates that the output meets my custom criteria',
    evaluate: (output: string, params: MyRuleParams): Score => {
      // Your evaluation logic
      const score = /* ... */
      return {
        dimension: 'custom',
        score,                          // 1-10
        passed: score >= threshold,
        details: { /* any extra info */ },
      }
    },
  },
}
```

Then register it in the assertion matchers so it is available via `expect(result).rule('myNewRule').passed()`.

### LLM Judge

Add a new quality dimension to `packages/core/src/evaluator/scoring/`:

```typescript
// packages/core/src/evaluator/scoring/my-dimension.ts
export async function evaluateMyDimension(
  output: string,
  expected: string,
  config: JudgeConfig
): Promise<Score> {
  const prompt = `
    You are evaluating an AI agent's output on the dimension of "my-dimension."
    ...
  `
  const judgeResult = await callJudgeModel(prompt, config)
  return {
    dimension: 'my-dimension',
    score: judgeResult.score,
    reasoning: judgeResult.reasoning,
    passed: judgeResult.score >= config.threshold,
  }
}
```

Register the dimension in `packages/core/src/evaluator/index.ts` so it becomes available via `expect(result).score('myDimension').toBeGreaterThan(N)`.

## How to Add a New Example

1. Create a new directory under `examples/`:
   ```bash
   mkdir -p examples/my-new-example/{src,tests,dataset}
   ```

2. Include these files:
   - `README.md` -- Follow the [example README template](examples/index.md)
   - `agentbench.config.ts` -- Configuration specific to this example
   - `src/agent.ts` -- The agent implementation
   - `tests/*.test.ts` -- At least 3 test suites, 8 test cases
   - `dataset/*.csv` -- At least 20 test inputs
   - `.env.example` -- Template for required API keys
   - `package.json` -- Minimal package.json with agentbench as devDependency

3. Ensure the example:
   - Passes `agentbench test` with 100% success
   - Demonstrates at least 3 different assertion types (tool, output, score, latency, tokens)
   - Includes a replay test suite
   - Has no hardcoded secrets (use `.env`)
   - Documents expected output in the README

4. Add the example to `docs/examples/index.md`.

## Code Standards

### TypeScript

- **Strict mode** everywhere -- `strict: true` in every `tsconfig.json`
- No `any` types without a comment explaining why
- Prefer `interface` over `type` for object shapes (except unions and mapped types)
- Use `readonly` for immutable properties
- Export types alongside their implementations

### Formatting and Linting

We use [Biome](https://biomejs.dev/) for formatting and linting:

```bash
pnpm lint          # Check for linting errors
pnpm format        # Auto-format all files
```

Configuration is in `biome.json` at the repo root.

### Testing

We use [Vitest](https://vitest.dev/) across all packages:

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

Guidelines:
- Test files live in `__tests__/` directories next to source files
- Name test files `*.test.ts`
- 1 test file per module
- Test behavior, not implementation
- Use descriptive test names: `it('should call the search tool when asked a question', ...)`
- Mock external APIs using `vi.mock()`
- Do not call real LLM APIs in unit tests -- use recorded fixtures

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add dataset module with multi-format support
fix(cli): resolve config loading issue on Windows
docs(readme): update quick start for v0.3.0
chore(deps): bump prisma to 5.15
```

Scopes: `core`, `cli`, `web`, `openai`, `anthropic`, `gemini`, `deepseek`, `azure-openai`, `openrouter`, `groq`, `ollama`, `mcp`, `langgraph`, `provider-utils`, `config`, `docs`, `examples`, `deps`, `ci`

## PR Process

1. **Fork** the repository
2. **Branch** from `main`: `feat/my-feature` or `fix/my-bug`
3. **Implement** your changes
4. **Test**: Run `pnpm test`, `pnpm lint`, `pnpm typecheck`
5. **Document**: Update relevant docs if you changed public APIs
6. **Open a PR** against `main`
7. **Wait for CI**: All checks must pass (lint, typecheck, test, build)
8. **Review**: Address reviewer feedback
9. **Merge**: A maintainer will squash-merge your PR

### PR Size Guidelines

- **Small** (< 200 lines): Bug fixes, small improvements -- quick review
- **Medium** (200-800 lines): New features, refactors -- expect discussion
- **Large** (> 800 lines): Split into multiple PRs if possible

### What Reviewers Look For

- Does the change have tests?
- Is the public API well-designed and documented?
- Does it follow existing patterns in the codebase?
- Does it handle errors gracefully?
- Does it work across all supported platforms (macOS, Linux, Windows)?
- Is it performant? (especially for hot paths like tracer and runner)

## Release Process

1. **Version bump**: Update version numbers in all `package.json` files (use `pnpm version:all`)
2. **Changelog**: Update `CHANGELOG.md` with all changes since the last release
3. **Tag**: `git tag v0.3.x`
4. **Push**: `git push --tags`
5. **Publish**: `pnpm publish:all` (publishes all packages to npm)
6. **GitHub Release**: Create a release on GitHub with changelog notes

Releases follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.3.x): Bug fixes, no API changes
- **Minor** (0.x.0): New features, backward-compatible
- **Major** (1.0.0): Breaking API changes

## Community Guidelines

### Code of Conduct

- Be respectful and constructive in all interactions
- Assume good intent in discussions
- Focus on the code and the problem, not the person
- Help others learn -- AgentBench is a tool for the community

### Where to Get Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions, ideas, and community support
- **Documentation**: Start with [INDEX.md](INDEX.md)

### Recognition

All contributors are listed in the README. Significant contributions (new providers, major features, sustained maintenance) earn write access to the repo.

---

[Back to Documentation Index](INDEX.md)
