# AgentBench Documentation (v0.5.1)

Welcome to the AgentBench documentation. AgentBench is the regression testing framework for AI agents -- replay, evaluate, assert, and catch regressions in CI.

This documentation follows the [Diataxis](https://diataxis.fr/) framework, organizing content by what it does for you.

## Origin Story

| Document | Description |
|----------|-------------|
| [Why Agent Testing](article-why-agent-testing.md) | "I tracked my time. Coding was 10%. Testing was 90%." — The story of why AgentBench exists |

## Tutorials

Step-by-step guides that teach you the basics by doing.

| Document | Description |
|----------|-------------|
| [Quick Start](GETTING_STARTED.md) | Install, init, and run your first test in 5 minutes |

## Core Concepts

Explanations that build understanding. Read these to understand *why* AgentBench works the way it does.

| Document | Description |
|----------|-------------|
| Agent Testing | Why agents need testing, and how AgentBench approaches it |
| Replay | How deterministic replay works, cross-model replay, and snapshot storage |
| Assertions | The chainable assertion DSL, 14 rule evaluators, and how to compose them |
| Evaluation | LLM-as-Judge, 8 quality dimensions, hybrid judging, and judge model selection |
| Coverage | Prompt, workflow, tool, and edge-case coverage dimensions |
| Snapshots | How snapshots work, when to update them, and diff reviewing |
| Non-Determinism | How AgentBench handles LLM non-determinism: retries, score thresholds, and seeds |
| [Architecture](ARCHITECTURE.md) | Full system architecture: packages, provider plugins, data flow |

## How-To Guides

Practical step-by-step instructions for accomplishing specific tasks.

| Document | Description |
|----------|-------------|
| Testing OpenAI Agents | How to test agents built with the OpenAI SDK |
| Testing Anthropic Agents | How to test agents built with the Anthropic SDK |
| CI/CD Integration | Set up AgentBench in your CI pipeline with examples for major providers |
| GitHub Actions | Deep dive into the GitHub Actions workflow, PR comments, and check runs |
| Custom Providers | Build and publish your own LLM provider plugin |
| Custom Judges | Create custom LLM judges for domain-specific quality dimensions |
| Dataset Management | Import, export, split, version, and diff test datasets |
| Migration | Migrate from earlier versions, or from other testing tools |

## Reference

Technical specifications and API documentation.

| Document | Description |
|----------|-------------|
| [CLI Reference](CLI_REFERENCE.md) | Every CLI command and flag: `init`, `test`, `replay`, `compare`, `dataset`, `snapshot` |
| [Configuration](v0.3/configuration.md) | All `defineConfig` options with defaults and descriptions |
| [Assertion DSL](v0.3/assertion-dsl.md) | Complete chainable assertion API reference |
| [REST API](API_REFERENCE.md) | All REST endpoints, request/response schemas, and authentication |
| [SDK Guide](SDK_GUIDE.md) | Programmatic API for TypeScript and Python |
| Types | Core TypeScript type definitions |
| Errors | Error codes, messages, and troubleshooting |

## Cookbook

Real-world recipes for common testing scenarios. Copy, adapt, and run.

| Recipe | Description |
|--------|-------------|
| Prompt Regression Detection | Catch regressions when you change system prompts |
| Model Migration Testing | Compare model performance when switching from GPT-4o to Claude |
| Cost Budget Enforcement | Set and enforce token and cost budgets per test |
| Safety Testing | Detect harmful outputs with safety judges and forbidden-tool assertions |
| A/B Experimentation | Run statistical experiments comparing two agent variants |
| Multi-Turn Conversation Testing | Test agents that maintain state across multiple turns |
| Streaming Response Testing | Assert on streaming behavior: time-to-first-token, partial output |

## Examples

Production-quality reference implementations. Each is a complete, runnable project.

| Example | Difficulty | What It Demonstrates |
|---------|-----------|---------------------|
| [Hello Agent](examples/index.md#hello-agent) | Beginner | Minimal setup, basic assertions, replay |
| [Customer Support Agent](examples/index.md#customer-support-agent) | Intermediate | Multi-turn, tool-calling, RAG, regression |
| [RAG Agent](examples/index.md#rag-agent) | Intermediate | Retrieval quality, grounding, context windows |
| [Tool-Calling Agent](examples/index.md#tool-calling-agent) | Intermediate | 8-tool orchestration, parallel calls, error handling |
| [SQL Agent](examples/index.md#sql-agent) | Intermediate | Text-to-SQL, schema awareness, injection safety |
| [Research Agent](examples/index.md#research-agent) | Advanced | Multi-step research, source verification, citations |
| [Code Review Agent](examples/index.md#code-review-agent) | Advanced | Code analysis, security review, false positives |
| [Coding Agent](examples/index.md#coding-agent) | Advanced | Code generation, edit-apply loop, test-driven |
| [MCP Agent](examples/index.md#mcp-agent) | Intermediate | MCP protocol, tool server testing |
| [OpenAI Agent SDK](examples/index.md#openai-agent-sdk) | Intermediate | OpenAI Agents SDK native integration |
| [LangGraph Agent](examples/index.md#langgraph-agent) | Advanced | State graphs, conditional routing, human-in-the-loop |
| [LlamaIndex Agent](examples/index.md#llamaindex-agent) | Intermediate | RAG with LlamaIndex, index-based retrieval |
| [CrewAI Agent](examples/index.md#crewai-agent) | Advanced | Multi-agent collaboration, role-based agents |
| [Multi-Agent Workflow](examples/index.md#multi-agent-workflow) | Advanced | Orchestration, handoffs, consensus, failure recovery |

See the [full Examples Index](examples/index.md) for details on each example.

## Project Info

| Document | Description |
|----------|-------------|
| [FAQ](FAQ.md) | Frequently asked questions |
| [Glossary](GLOSSARY.md) | Terminology used throughout AgentBench |
| [Roadmap](ROADMAP.md) | Version roadmap and upcoming features |
| [Contributing](CONTRIBUTING.md) | How to contribute to AgentBench |
| [Best Practices](BEST_PRACTICES.md) | Testing best practices for AI agents |
| [Deployment](DEPLOYMENT.md) | Production deployment guide |
| [Database Schema](SCHEMA.md) | Database table structure (Prisma) |

## External Resources

- [GitHub Repository](https://github.com/1304674612/agentbench)
- [Release Notes](https://github.com/1304674612/agentbench/releases)
- [Issue Tracker](https://github.com/1304674612/agentbench/issues)
- [README (English)](../README.md)
- [README (Chinese)](../README_CN.md)
- [Changelog](../CHANGELOG.md)

## Project Status

| Metric | Value |
|--------|-------|
| Version | v0.5.1 |
| Packages | 17 (up from 8 in v0.2.0) |
| Provider Support | 12+ (OpenAI, Anthropic, Gemini, DeepSeek, Azure, OpenRouter, Groq, Ollama, + more) |
| Official Examples | 14 production-quality reference implementations |
| API Endpoints | 40+ |
| CLI Commands | 15+ |
| TypeScript | 0 errors (strict mode) |
