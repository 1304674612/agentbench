export const meta = {
  name: 'agentbench-v0.3.0-full-implementation',
  description: 'Implement all phases of AgentBench v0.3.0 in parallel across specialized subagents',
  phases: [
    { title: 'Foundation', detail: 'Version bumps, root configs, workspace setup' },
    { title: 'Config System', detail: '@agentbench/config package with defineConfig' },
    { title: 'CLI DX', detail: 'Redesigned init + test commands' },
    { title: 'Provider Ecosystem', detail: 'Provider interface, utils, new providers' },
    { title: 'Dataset System', detail: 'Dataset module, CLI, SDK, Prisma' },
    { title: 'Examples', detail: '14 official examples' },
    { title: 'GitHub Integration', detail: 'Actions, PR comment templates' },
    { title: 'VS Code Extension', detail: 'Full extension scaffold' },
    { title: 'Benchmarks + Docs', detail: 'Marketplace schemas, brand refresh, docs' },
    { title: 'Synthesis', detail: 'Final review, gitignore, exports, consistency check' }
  ]
}

// Phase 0: Foundation
phase('Foundation')

const foundation = await agent(
  "Update all package.json files in /Users/zhoujiankai/Desktop/AgentBench to version 0.3.0. " +
  "Update packages/core/src/index.ts VERSION constant to '0.3.0'. " +
  "Update apps/cli/src/index.ts .version() call to '0.3.0'. " +
  "Update root package.json description to: 'The Regression Testing Framework for AI Agents'. " +
  "Update pnpm-workspace.yaml to remove examples/* line. " +
  "Add keywords to root package.json: ai-agents, testing, regression-testing, agent-testing, llm-evaluation, ci-cd, developer-tools. " +
  "Read each file before editing. Use Edit tool for changes. Return a summary of all changes made.",
  { label: 'foundation' }
)

log('Foundation done: ' + foundation)

// Fan out phases 1-8 in parallel
const results = await parallel([
  // Phase 1: Config System
  async () => {
    phase('Config System')
    return agent(
      "Create a new package @agentbench/config at /Users/zhoujiankai/Desktop/AgentBench/packages/config/. " +
      "Create: package.json (version 0.3.0, name @agentbench/config, depends on zod), tsconfig.json extending @agentbench/typescript-config/base.json, " +
      "tsup.config.ts for building, and src/ directory with these files:\n\n" +
      "1. src/types.ts: Full TypeScript types for AgentBenchConfig with all sub-types (ProviderConfig, AgentConfig, TestConfig, AssertionDefaults, " +
      "ReplayConfig, EvaluationConfig, CoverageConfig, ReportConfig, CIConfig). Also export Zod schemas for validation.\n\n" +
      "2. src/defaults.ts: Smart defaults matching Jest/Vitest conventions (testDir: './tests', timeout: 30000, retry: 2, maxConcurrency: 4, " +
      "scoreThreshold: 7, maxTokens: 4096, maxLatency: 30000, judges: ['correctness','faithfulness','safety'], " +
      "judgeModel: 'openai/gpt-4o-mini', dimensions: ['prompt','workflow','tool','edge-case'], formats: ['terminal','json','html'], " +
      "ci provider: 'github-actions').\n\n" +
      "3. src/define-config.ts: Export defineConfig function that deep-merges user config with defaults. Type-safe — returns AgentBenchConfig.\n\n" +
      "4. src/loader.ts: Config resolution following Jest/Vitest pattern. Try agentbench.config.ts, then .js, .mjs, .json, then package.json 'agentbench' key, " +
      "then defaults. Export loadConfig(cwd?) and resolveConfigPath(cwd?) functions. Support async config functions. Deep merge with defaults.\n\n" +
      "5. src/index.ts: Barrel export of defineConfig, loadConfig, resolveConfigPath, defaults, all types, and Zod schemas.\n\n" +
      "Write complete, production-quality TypeScript code with proper JSDoc comments. Read any existing files before editing. Create all new files with Write tool.",
      { label: 'config-system' }
    )
  },

  // Phase 2: CLI DX
  async () => {
    phase('CLI DX')
    return agent(
      "Redesign the CLI developer experience in /Users/zhoujiankai/Desktop/AgentBench/apps/cli/. " +
      "Read existing files first: src/commands/init.ts, src/commands/test.ts, src/index.ts, src/lib/config.ts, src/lib/api.ts.\n\n" +
      "TASK A: Complete rewrite of src/commands/init.ts (currently 26 lines, barely functional). Create a full interactive onboarding:\n" +
      "- Welcome banner with ASCII art AgentBench logo\n" +
      "- Step 1: Project name (default: current dir), language (TS/JS), package manager\n" +
      "- Step 2: Scan env vars for API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, " +
      "AZURE_OPENAI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY). Show checkmark or X for each. Offer to configure missing ones.\n" +
      "- Step 3: Template selection (Hello Agent, Customer Support, RAG Agent, Empty)\n" +
      "- Step 4: Show directory defaults, offer customization\n" +
      "- Step 5: Generate all files: agentbench.config.ts, tests/hello-agent.test.ts, src/agent.ts, dataset/hello-agent.queries.csv, " +
      "examples/ dir, report/ dir, .agentbench/ dir, .github/workflows/agentbench.yml, .gitignore entry\n" +
      "- Success message with next steps and quick commands\n" +
      "- Support --yes, --template, --provider, --ci flags\n" +
      "- Use chalk for colors, ora for spinners. Make it beautiful.\n\n" +
      "TASK B: Enhance src/commands/test.ts:\n" +
      "- Add --watch flag (file watching with auto re-run using fs.watch)\n" +
      "- Add --coverage flag\n" +
      "- Add --replay flag (zero-cost testing with snapshots)\n" +
      "- Add --update-snapshots flag\n" +
      "- Format output like Jest/Vitest (clean, with per-test timing/tokens/cost)\n" +
      "- Show detailed assertion failures\n" +
      "- Exit code 1 on any failure\n\n" +
      "TASK C: Update src/index.ts: version to '0.3.0', better description.\n\n" +
      "TASK D: Create src/lib/templates.ts with template generators for Hello Agent test, agent files, config template, CI workflow YAML.\n\n" +
      "Write complete working code. Use Edit for existing files, Write for new files.",
      { label: 'cli-dx' }
    )
  },

  // Phase 3: Provider Ecosystem
  async () => {
    phase('Provider Ecosystem')
    return agent(
      "Build the provider plugin ecosystem in /Users/zhoujiankai/Desktop/AgentBench/packages/.\n\n" +
      "PART A: Create packages/provider-utils/ — the shared foundation for all providers:\n" +
      "- package.json: name @agentbench/provider-utils, version 0.3.0\n" +
      "- tsconfig.json extending base, tsup.config.ts for building\n" +
      "- src/types.ts: AgentBenchProvider interface (id, name, version, capabilities, createChatCompletion, createStreamingChatCompletion, " +
      "countTokens, calculateCost, initialize, healthCheck, dispose). ProviderCapabilities interface (streaming, reasoning, embeddings, " +
      "toolCalling, vision, functionCalling, jsonMode, maxContextWindow, supportedModels). All param/result types (ChatCompletionParams, " +
      "ChatCompletionResult, StreamChunk, TokenCountParams, TokenCountResult, CostBreakdown, ProviderConfig, HealthStatus).\n" +
      "- src/openai-compatible.ts: Abstract OpenAICompatibleProvider class. Handles HTTP fetch to /chat/completions. " +
      "Subclasses only override: id, name, capabilities, adaptParams, adaptResponse, countTokens, calculateCost. " +
      "This makes adding Ollama/vLLM/LM Studio/Groq/OpenRouter trivial.\n" +
      "- src/streaming.ts: SSE parsing utilities for streaming responses.\n" +
      "- src/token-counter.ts: tiktoken-based token counting with fallback heuristics.\n" +
      "- src/cost-calculator.ts: Pricing table for 50+ models, unified cost calculation.\n" +
      "- src/index.ts: Barrel export.\n\n" +
      "PART B: Create these provider packages (each with package.json, tsconfig.json, tsup.config.ts, src/index.ts):\n" +
      "1. packages/gemini/ — @agentbench/gemini. Uses @google/generative-ai pattern. Streaming, embeddings, vision, tool-calling.\n" +
      "2. packages/deepseek/ — @agentbench/deepseek. Extends OpenAICompatibleProvider. Reasoning models (deepseek-reasoner).\n" +
      "3. packages/azure-openai/ — @agentbench/azure-openai. Extends OpenAICompatibleProvider. Azure auth + endpoint construction.\n" +
      "4. packages/openrouter/ — @agentbench/openrouter. Extends OpenAICompatibleProvider. Multi-model pass-through.\n" +
      "5. packages/groq/ — @agentbench/groq. Extends OpenAICompatibleProvider. Ultra-fast inference.\n" +
      "6. packages/ollama/ — @agentbench/ollama. Extends OpenAICompatibleProvider. Local models, auto-detect instance.\n\n" +
      "PART C: Read and enhance existing providers:\n" +
      "- packages/openai/src/index.ts: Implement AgentBenchProvider interface from provider-utils. Add reasoning model support (o1, o3).\n" +
      "- packages/anthropic/src/index.ts: Implement AgentBenchProvider interface. Add extended thinking support.\n\n" +
      "Each provider should be MINIMAL — most logic is in the base class. Providers mainly define id, name, capabilities, model list, " +
      "and any minor adaptations needed. Write complete working code.",
      { label: 'provider-ecosystem' }
    )
  },

  // Phase 4: Dataset System
  async () => {
    phase('Dataset System')
    return agent(
      "Build the complete Dataset system in /Users/zhoujiankai/Desktop/AgentBench.\n\n" +
      "PART A: Create packages/core/src/dataset/ module:\n" +
      "- src/dataset/dataset-types.ts: DatasetMeta, DatasetItem (id, input, expected output/toolCalls/contains/notContains/schema/metadata), " +
      "DatasetFormat ('csv'|'json'|'jsonl'|'huggingface'|'openai-evals'|'deepeval'|'langsmith'), DatasetVersion, " +
      "ValidationReport (valid, errors, warnings), SplitResult, DiffResult.\n" +
      "- src/dataset/dataset.ts: Dataset class with static factory methods (fromCSV, fromJSON, fromJSONL, fromHuggingFace, fromOpenAIEvals, " +
      "fromDeepEval, fromLangSmith), instance methods (toCSV, toJSON, toJSONL, validate, split with stratification, sample, " +
      "createVersion, checkout, diff, items, meta, Symbol.asyncIterator). Each method is fully implemented, not stubbed.\n" +
      "- src/dataset/dataset.test.ts: Tests for loading CSV/JSON/JSONL, validation, split, sample, diff.\n" +
      "- src/dataset/index.ts: Barrel export.\n" +
      "- Update packages/core/src/index.ts to export dataset types and add './dataset' subpath.\n" +
      "- Update packages/core/package.json exports to add './dataset' entry.\n" +
      "- Update packages/core/tsup.config.ts if needed for new entry point.\n\n" +
      "PART B: Create CLI dataset commands at apps/cli/src/commands/dataset.ts:\n" +
      "- dataset import <path> [--name] [--format]\n" +
      "- dataset export <name> [--format] [--output] [--split]\n" +
      "- dataset validate <name>\n" +
      "- dataset split <name> [--train] [--test] [--validation] [--stratify]\n" +
      "- dataset sample <name> [--count] [--percentage] [--seed]\n" +
      "- dataset version <name> [--create] [--checkout] [--list]\n" +
      "- dataset diff <name> <version1> <version2>\n" +
      "- dataset compare <name1> <name2>\n" +
      "- dataset list\n" +
      "- dataset info <name>\n" +
      "Register in apps/cli/src/index.ts.\n\n" +
      "PART C: Read apps/web/prisma/schema.prisma, add these models at the end:\n" +
      "- Dataset: id, name, description?, format, version, author?, license?, tags, itemCount, schema JSON?, createdAt, updatedAt, " +
      "relations to DatasetItem[] and DatasetVersion[]\n" +
      "- DatasetItem: id, datasetId (FK), input, expected JSON?, metadata JSON?, order, createdAt\n" +
      "- DatasetVersion: id, datasetId (FK), version, itemCount, diff JSON?, createdAt; @@unique([datasetId, version])\n" +
      "Add optional datasetId to existing TestRun/Run model.\n\n" +
      "Write complete, production-quality code. Read existing files before editing.",
      { label: 'dataset-system' }
    )
  },

  // Phase 5: Examples
  async () => {
    phase('Examples')
    return agent(
      "Create 11 new official example projects under /Users/zhoujiankai/Desktop/AgentBench/examples/ to bring the total from 3 to 14.\n\n" +
      "Each example is a standalone project with: package.json, agentbench.config.ts, src/agent.ts, tests/ (2-5 test files), " +
      "dataset/ (CSV/JSON), .env.example, README.md.\n\n" +
      "Create these examples:\n\n" +
      "1. examples/hello-agent/ — Minimal starter. src/agent.ts (simple chat), tests/ (greeting.test.ts, factual.test.ts, replay.test.ts), 5 test cases.\n" +
      "2. examples/rag-agent/ — RAG agent. src/agent.ts + src/retriever.ts. Tests: retrieval-quality, grounding, context-window, latency-budget. 20 dataset queries.\n" +
      "3. examples/sql-agent/ — Text-to-SQL. src/agent.ts + src/db-schema.ts. Tests: select, join, aggregation, sql-injection, schema-awareness. schema.sql + seed.sql.\n" +
      "4. examples/coding-agent/ — Code generation. src/agent.ts with tools (write_file, run_test). Tests: code-generation, bug-fix, refactoring, test-driven. tasks.jsonl.\n" +
      "5. examples/tool-calling-agent/ — Complex tools. src/agent.ts + 10+ tools in src/tools.ts. Tests: tool-selection, parallel-tools, tool-ordering, error-handling, schema-adherence.\n" +
      "6. examples/mcp-agent/ — MCP protocol. src/agent.ts + src/mcp-server.ts. Tests: tool-discovery, resource-access, multi-server, lifecycle.\n" +
      "7. examples/langgraph-agent/ — LangGraph. src/graph.ts + src/nodes.ts + src/state.ts. Tests: workflow-paths, state-transitions, conditional-edges, human-in-loop.\n" +
      "8. examples/openai-agent-sdk/ — OpenAI Agents SDK. src/agent.ts with guardrails + handoffs. Tests: guardrail, handoff, tool-use, tracing.\n" +
      "9. examples/crewai-agent/ — CrewAI. src/crew.ts + src/agents.ts + src/tasks.ts. Tests: task-completion, agent-delegation, sequential, output-quality.\n" +
      "10. examples/llamaindex-agent/ — LlamaIndex. src/agent.ts + src/index.ts. Tests: query-engine, chat-engine, tool-integration, index-quality.\n" +
      "11. examples/multi-agent-workflow/ — Complex orchestration. src/orchestrator.ts + src/agents/*.ts. Tests: orchestration, handoff, consensus, concurrency, failure-recovery.\n\n" +
      "For EACH example, write REAL TypeScript code (not stubs). Each test file should use the AgentBench assertion DSL pattern. " +
      "Each README should follow the template: Quick Start, Architecture diagram (text), What This Tests table, Running, Replay, CI, Expected Output, Key Takeaways.\n\n" +
      "Also enhance README.md for the 3 existing examples (customer-support-agent, code-review-agent, research-agent) to match the new template.\n\n" +
      "This is the most important phase for adoption — every example must be complete, runnable, and beautiful.",
      { label: 'examples' }
    )
  },

  // Phase 6: GitHub Integration
  async () => {
    phase('GitHub Integration')
    return agent(
      "Build GitHub integration for AgentBench at /Users/zhoujiankai/Desktop/AgentBench.\n\n" +
      "PART A: Read and update .github/workflows/ci.yml to include an agentbench test step (after build, before/alongside existing tests).\n\n" +
      "PART B: Read .github/workflows/agentbench-ci.yml if it exists, or create it. Complete workflow:\n" +
      "- Triggers: pull_request (paths: src/agent/**, prompts/**, tools/**, agentbench.config.*, tests/**, dataset/**), push to main\n" +
      "- Jobs: agent-test on ubuntu-latest\n" +
      "- Steps: checkout, setup-node@20, npm ci, agentbench test --ci --json, upload-report artifact\n" +
      "- If secrets configured, also comment on PR with results\n\n" +
      "PART C: Create .github/actions/agentbench/ directory with action.yml:\n" +
      "- Composite action with inputs: mode, fail-on-regression, comment-on-pr, api keys for all providers\n" +
      "- Runs agentbench test --ci\n" +
      "- Optionally generates and posts PR comment using github-script\n\n" +
      "PART D: Create .github/actions/agentbench/comment-template.md:\n" +
      "Markdown template for PR comments with: Summary table (Score, Pass Rate, Latency, Tokens, Cost), " +
      "Regression Detection section (red box if found), Passing tests (collapsed), Failing tests (details), " +
      "Link to full report, AgentBench footer. Use GitHub markdown features (collapsible sections, tables, emoji, diffs).\n\n" +
      "Read existing files before editing. Write production-quality YAML and markdown.",
      { label: 'github-integration' }
    )
  },

  // Phase 7: VS Code Extension
  async () => {
    phase('VS Code Extension')
    return agent(
      "Create a complete VS Code extension at /Users/zhoujiankai/Desktop/AgentBench/vscode-extension/.\n\n" +
      "DIRECTORY STRUCTURE:\n" +
      "vscode-extension/\n" +
      "  package.json — Extension manifest\n" +
      "  tsconfig.json\n" +
      "  .vscodeignore\n" +
      "  README.md\n" +
      "  src/\n" +
      "    extension.ts — Activation entry point\n" +
      "    commands.ts — All 13 command registrations\n" +
      "    testRunner.ts — Spawns 'agentbench test --json', parses output\n" +
      "    traceViewer.ts — Webview panel provider for trace visualization\n" +
      "    codeLens.ts — CodeLens provider: Run | Debug | Replay above each test()\n" +
      "    statusBar.ts — Status bar item: 'AgentBench: checkmark X/Y'\n" +
      "    diagnostics.ts — Diagnostic collection from test failures\n" +
      "    treeView.ts — Sidebar tree: Run section, History, Test Suites, Coverage, Snapshots\n" +
      "    coverage.ts — Coverage visualization\n" +
      "    config.ts — Extension configuration\n" +
      "    types.ts — Shared types\n" +
      "\n" +
      "PACKAGE.JSON must include:\n" +
      "- name: agentbench-vscode, displayName: AgentBench, version 0.3.0\n" +
      "- activationEvents: onCommand:agentbench.*, onView:agentbench.*, workspaceContains:agentbench.config.*\n" +
      "- contributes.commands: 13 commands (runAllTests, runCurrentTest, runSuite, debugTest, replayLast, replaySelect, viewTrace, " +
      "compareRuns, showCoverage, updateSnapshots, createSnapshot, openDashboard, init)\n" +
      "- contributes.viewsContainers: activitybar panel with agentbench icon\n" +
      "- contributes.views: tree view with Run, History, Test Suites, Coverage, Snapshots\n" +
      "- contributes.configuration: agentbench.cliPath, agentbench.configPath, agentbench.autoRun\n" +
      "- contributes.keybindings: Ctrl+Shift+A R, Ctrl+Shift+A T\n" +
      "- engines.vscode: ^1.85.0\n\n" +
      "IMPLEMENTATION:\n" +
      "- extension.ts: Activates when agentbench.config.* found. Registers all providers (CodeLens, TreeView, StatusBar, Diagnostics).\n" +
      "- commands.ts: Each command handler. runAllTests calls testRunner, updates diagnostics and status bar.\n" +
      "- testRunner.ts: Uses child_process.spawn to run 'agentbench test --json'. Parses JSON output. Returns typed results.\n" +
      "- codeLens.ts: Regex-parses active document for test('name', ...) and suite('name', ...) calls. Returns CodeLens objects above each.\n" +
      "- statusBar.ts: Creates status bar item (alignment: Left, priority: 100). Updates text and color based on test results.\n" +
      "- diagnostics.ts: Creates vscode.DiagnosticCollection. Converts test failures to Diagnostic objects with range, message, severity.\n" +
      "- treeView.ts: TreeDataProvider implementations for Run/History/Suites/Coverage/Snapshots views. Each with getChildren, getTreeItem.\n" +
      "- traceViewer.ts: WebviewViewProvider. Generates HTML with inline CSS for trace timeline visualization.\n\n" +
      "Write complete, working TypeScript code. The extension should feel like Jest and Playwright extensions combined.",
      { label: 'vscode-extension' }
    )
  },

  // Phase 8: Benchmarks + Docs + Brand
  async () => {
    phase('Benchmarks + Docs')
    return agent(
      "Complete the Benchmark Marketplace types, Documentation, and Brand refresh for AgentBench at /Users/zhoujiankai/Desktop/AgentBench.\n\n" +
      "PART A: Benchmark types — Create packages/core/src/types/benchmark.ts:\n" +
      "- Benchmark (id, meta, suites, providers, dataset, baseline, leaderboard)\n" +
      "- BenchmarkMeta (name, slug, description, longDescription, version, author {name,email,url}, license, category, tags, " +
      "difficulty 'beginner'|'intermediate'|'advanced'|'expert', readme, homepage, repository, icon, createdAt, updatedAt, " +
      "downloads, rating, ratingsCount, status 'draft'|'pending_review'|'published'|'deprecated')\n" +
      "- BenchmarkCategory: 'customer-support'|'medical'|'finance'|'coding'|'sql'|'writing'|'research'|'rag'|'mcp'|'tool-calling'|'agent-workflow'|'safety'|'multi-agent'|'general'\n" +
      "- BenchmarkSuite (name, description, testCount, weight, assertions)\n" +
      "- BenchmarkBaseline (agent, scores, metrics)\n" +
      "- LeaderboardEntry (rank, agent, author, overallScore, suiteScores, latency, cost, tokens, submittedAt, version, verified)\n" +
      "- BenchmarkSearchParams, BenchmarkPublishParams\n" +
      "- Update packages/core/src/types/index.ts to export benchmark types.\n\n" +
      "PART B: Benchmark CLI — Create apps/cli/src/commands/benchmark.ts:\n" +
      "- benchmark search <query> [--category] [--difficulty]\n" +
      "- benchmark info <slug>\n" +
      "- benchmark install <slug>\n" +
      "- benchmark run <slug> --agent <path>\n" +
      "- benchmark submit <slug> --run <id>\n" +
      "- benchmark publish <path>\n" +
      "- benchmark list\n" +
      "Register in apps/cli/src/index.ts.\n\n" +
      "PART C: Brand Refresh — Read and update README.md:\n" +
      "- New hero with one-liner positioning: 'The Regression Testing Framework for AI Agents'\n" +
      "- Quick start: npm install -g agentbench && agentbench init && agentbench test\n" +
      "- Add 'AgentBench is to AI Agents what Jest is to JavaScript' messaging\n" +
      "- Add competitive positioning section comparing to LangSmith, DeepEval, Promptfoo\n" +
      "- Add ecosystem section listing all providers\n" +
      "- Add examples section with all 14 examples\n" +
      "- Update badges and stats for v0.3.0\n\n" +
      "PART D: Update CHANGELOG.md — add v0.3.0 entry at top (placeholder with key features: DX redesign, 14 examples, " +
      "12+ providers, dataset system, GitHub integration, VS Code extension, benchmark marketplace, documentation site).\n\n" +
      "PART E: Create docs/ROADMAP.md with v0.3 through v1.0 roadmap from the design document.\n\n" +
      "Read existing files before editing. Write compelling, developer-focused content.",
      { label: 'benchmarks-docs-brand' }
    )
  }
])

// Phase 9: Synthesis
phase('Synthesis')

const synthesis = await agent(
  "Synthesize the AgentBench v0.3.0 implementation at /Users/zhoujiankai/Desktop/AgentBench. " +
  "Check all work done in parallel phases:\n\n" +
  "Phase 1 (Config): " + (results[0] || 'pending') + "\n" +
  "Phase 2 (CLI DX): " + (results[1] || 'pending') + "\n" +
  "Phase 3 (Providers): " + (results[2] || 'pending') + "\n" +
  "Phase 4 (Datasets): " + (results[3] || 'pending') + "\n" +
  "Phase 5 (Examples): " + (results[4] || 'pending') + "\n" +
  "Phase 6 (GitHub): " + (results[5] || 'pending') + "\n" +
  "Phase 7 (VS Code): " + (results[6] || 'pending') + "\n" +
  "Phase 8 (Benchmarks+Docs): " + (results[7] || 'pending') + "\n\n" +
  "YOUR TASKS:\n" +
  "1. Update .gitignore to add: .agentbench/, report/, *.snap\n" +
  "2. Verify pnpm-workspace.yaml lists all new packages (config, provider-utils, gemini, deepseek, azure-openai, openrouter, groq, ollama) under packages/*\n" +
  "3. Verify packages/core/src/index.ts exports all new modules (config types, dataset, benchmark types)\n" +
  "4. Verify packages/core/package.json exports include dataset subpath\n" +
  "5. Create docs/v0.3/STATUS.md with a checklist of all v0.3.0 implementation items and their status\n" +
  "6. Check for any missing files or inconsistencies across the phases\n\n" +
  "Read existing files before editing. Return a comprehensive final summary of the entire v0.3.0 implementation.",
  { label: 'synthesis' }
)

log('Final synthesis: ' + synthesis)
return synthesis
