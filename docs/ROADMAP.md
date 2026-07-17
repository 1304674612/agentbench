# AgentBench -- Roadmap

## Overview

AgentBench is on a mission to become the de facto standard for AI agent testing -- what Jest is to JavaScript, Playwright is to browsers, and Pytest is to Python.

**Version Map:**

```
v0.1.0       v0.2.0        v0.3.0        v0.4.0        v0.5.0        v0.5.1        v1.0.0
  |            |             |             |             |             |             |
  +-- Alpha ---+-- Production-+- Adoption --+-- Ecosystem-+- Methodology-+- Reliability-+- Standard --
```

---

## v0.5.1 -- "Reliability" (Current -- Q3 2026)

**Goal:** Production-grade code quality, comprehensive testing infrastructure, and statistical rigor in experiments.

### Key Deliverables

| # | Feature | Status |
|---|---------|--------|
| Q1 | Interface Segregation — split StorageAdapter into domain interfaces | ✅ Released |
| Q2 | N+1 query fix — batch trace step persistence | ✅ Released |
| Q3 | Magic number elimination — scoring constants | ✅ Released |
| Q4 | Type safety — reduce unsafe casts, isolate serialization boundaries | ✅ Released |
| Q5 | Statistics — Mann-Whitney U, power analysis, Bonferroni correction | ✅ Released |
| Q6 | Provider tests — DeepSeek, Groq, OpenAI, Anthropic, Gemini | ✅ Released |
| Q7 | Provider consistency contract test suite | ✅ Released |
| Q8 | Vitest coverage — all 15 packages + workspace config | ✅ Released |
| Q9 | CI improvements — Node.js 20/22 matrix, pnpm caching | ✅ Released |
| Q10 | DB index optimization — composite indexes on runs and scores | ✅ Released |
| Q11 | Prisma initial migration — version-controlled schema | ✅ Released |
| Q12 | BullMQ Worker — async run/notification/report processing | ✅ Released |
| Q13 | LangGraph state graph tracing — node-level timing + routing | ✅ Released |
| Q14 | Scoring bug fix — TOOL_USAGE_PROMPT overlapping ranges | ✅ Released |
| Q15 | Groq provider — explicit adaptResponse + countTokens | ✅ Released |

### Success Criteria

- 6/13 provider packages have test coverage (was 1/13)
- 15 packages have vitest coverage config (was 3)
- 5 statistical tests available (was 2)
- 17 `as unknown as` casts remaining, all isolated and documented
- All changes pushed, documented, and released

---

## v0.5.0 -- "Methodology" (Released -- Q2 2026)

**Goal:** Teach developers how to test AI agents well — not just a tool, a mental model.

### Key Deliverables

| # | Feature | Status |
|---|---------|--------|
| M1 | Agent Testing Pyramid — 3-layer strategy document | Released |
| M2 | 8 Agent Testing Anti-Patterns with concrete fixes | Released |
| M3 | GitHub Marketplace Action — zero-config CI | Released |
| M4 | Dashboard Failure Guidance — 26 assertion-specific suggestions | Released |
| M5 | Dashboard Quality Trends — SVG charts for scores over time | Released |
| M6 | Ecosystem Integration Guides — Vercel AI SDK, Claude Code, LangChain | Released |
| M7 | Testing Methodology section in README | Released |

---

## v0.4.0 -- "Ecosystem" (Released -- Q2 2026)

**Goal:** Zero-to-green in 30 seconds. Fastest onboarding in the AI agent testing space.

### Key Deliverables

| # | Feature |
|---|---------|
| E1 | `agentbench init --quick` — 30s from install to green tests |
| E2 | `createAgent` / `defineSuite` / `defineTest` declarative API |
| E3 | Test runner with symlink fallback strategy |
| E4 | Visual test tree with status badges, coverage, and trends |

---

## v0.3.0 -- "Adoption" (Released -- Q1 2026)

**Goal:** Make AgentBench the obvious first choice for AI agent testing.

### Key Deliverables

| # | Feature |
|---|---------|
| A1 | Redesigned `agentbench init` with interactive CLI, auto-detection, templates |
| A2 | Zero-config `agentbench test` with watch mode, `--ui`, smart defaults |
| A3 | 14 official examples (production quality) |
| A4 | Documentation site (VitePress, 25+ pages, Diataxis structure) |
| P1-9 | 12+ providers: OpenAI, Anthropic, Gemini, DeepSeek, Azure OpenAI, OpenRouter, Groq, Ollama, Mistral, Cohere, vLLM, LM Studio |
| E1-2 | npm publication + npx zero-install |
| DS1 | Dataset system — import/export/validate/split/version/diff |
| G1 | GitHub Actions workflow generation |
| V1-2 | VS Code Extension v1.0 — Run, Debug, CodeLens, Status Bar, Trace Viewer |
| B1-2 | Benchmark Marketplace + leaderboard |

---

## v1.0.0 -- "Standard" (Target: Q3 2027)

**Goal:** AgentBench is the de facto standard for AI agent testing.

### Platform Maturity

| # | Feature |
|---|---------|
| M1 | Stable v1 REST API — no breaking changes without major version bump |
| M2 | Stable v1 TypeScript SDK — full semantic versioning |
| M3 | Official Python SDK v1.0 — feature parity with TypeScript |
| M4 | Long-term support (LTS) releases — 12-month support window |
| M5 | Backward compatibility guarantee — v1.0 tests run on all v1.x |

### Benchmark Hub

| # | Feature |
|---|---------|
| M6 | Curated, verified benchmarks with industry-standard status |
| M7 | "AgentBench Certified" badge for agents passing official benchmarks |
| M8 | Annual State of AI Agent Quality report |
| M9 | Industry-specific benchmark suites: healthcare, finance, legal, education |

### Plugin Marketplace

| # | Feature |
|---|---------|
| M11 | Third-party judge plugins — custom LLM judges, domain-specific evaluators |
| M12 | Third-party reporter plugins — custom output formats, dashboards |
| M13 | Third-party provider plugins — community-maintained providers |
| M15 | Plugin SDK and development guide with templates |

### Enterprise

| # | Feature |
|---|---------|
| M21 | SOC 2 Type II certification |
| M22 | HIPAA compliance for healthcare deployments |
| M24 | Dedicated support with SLAs — 1-hour critical response |
| M25 | Custom deployment options — VPC, air-gapped, on-premises |

### Success Criteria

- 100,000+ npm downloads/week
- 5,000+ GitHub stars
- 200+ community benchmarks
- 50+ community plugins (judges, reporters, providers)
- 100+ enterprise customers
- "AgentBench tested" becomes a quality signal in the AI agent ecosystem

---

## Strategic Themes

1. **Developer Experience First** — Every feature starts with the CLI and the 5-minute test
2. **Progressive Disclosure** — Simple things simple, complex things possible
3. **Convention over Configuration** — Smart defaults that work out of the box
4. **Familiar Patterns** — Mirror Jest, Vitest, Playwright APIs wherever possible
5. **Open by Default** — Core is Apache 2.0. Cloud features are additive, not required
6. **Honest about Non-Determinism** — Score-based assertions, replay, statistical methods
7. **Ecosystem over Platform** — Providers, examples, benchmarks, plugins form a self-reinforcing network
8. **Dogfooding** — AgentBench is tested with AgentBench

---

## How to Contribute

- **Feature requests:** [GitHub Discussions](https://github.com/1304674612/agentbench/discussions)
- **Bug reports:** [GitHub Issues](https://github.com/1304674612/agentbench/issues)
- **RFCs:** Open an issue with the `rfc` label
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md)

---

> **Last Updated:** 2026-07-17
> **Document Version:** 3.0
> **Next Review:** Q4 2026
