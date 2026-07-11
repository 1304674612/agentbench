# Ecosystem Integrations

Guides for integrating AgentBench with popular AI frameworks, tools, and platforms. Each guide covers setup, writing tests, replay, and CI configuration.

| Guide | Description |
|-------|-------------|
| [Claude Code Custom Agents](claude-code-custom-agents.md) | Export Claude Code conversation history as test fixtures, replay to catch regressions after editing CLAUDE.md |
| [LangChain / CrewAI Integration](langchain-crewai-integration.md) | Wrap existing LangChain or CrewAI agents with `@agentbench/adapter` (3-5 lines of code) for regression testing |
| [Vercel AI SDK Integration](vercel-ai-sdk-integration.md) | Add zero-invasion AgentBench tests to Vercel AI SDK projects — `generateText`, `useChat`, streaming |

## Pattern

All integration guides follow the same structure:

1. **Why test this type of agent** — what breaks silently
2. **Setup** — packages to install, minimal wiring
3. **Writing tests** — agent-specific assertion patterns
4. **Replay** — how to capture and replay traces for zero-cost regression checks
5. **CI** — the GitHub Actions workflow snippet
