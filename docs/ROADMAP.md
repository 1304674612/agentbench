# AgentBench -- Roadmap

## Overview

AgentBench is on a mission to become the de facto standard for AI agent testing -- what Jest is to JavaScript, Playwright is to browsers, and Pytest is to Python.

This roadmap outlines the strategic path from the current v0.3.0 adoption release through v1.0.0, when AgentBench aims to be the industry standard.

**Version Map:**

```
v0.1.0          v0.2.0           v0.3.0           v0.4.0           v0.5.0           v1.0.0
  |               |                |                |                |                |
  +-- Alpha ------+-- Production --+-- Adoption ----+-- Ecosystem ---+-- Enterprise --+-- Standard --
```

---

## v0.3.0 -- "Adoption" (Current -- Q3 2026)

**Goal:** Make AgentBench the obvious first choice for AI agent testing by delivering a best-in-class developer experience.

### Key Deliverables

| # | Feature | Status |
|---|---------|--------|
| D1 | Redesigned `agentbench init` with interactive CLI, auto-detection, templates | Released |
| D2 | Zero-config `agentbench test` with watch mode, `--ui`, smart defaults | Released |
| D3 | 14 official examples (production quality) | Released |
| D4 | Documentation site (VitePress, 25+ pages, Diataxis structure) | Released |
| D5 | Brand refresh -- messaging, website hero, README, competitive positioning | Released |
| P1 | Provider interface redesign + auto-discovery | Released |
| P2 | Gemini provider | Released |
| P3 | DeepSeek provider | Released |
| P4 | Azure OpenAI provider | Released |
| P5 | OpenRouter provider | Released |
| P6 | Groq provider | Released |
| P7 | Ollama + vLLM + LM Studio providers | Released |
| P8 | Mistral + Cohere providers | Released |
| P9 | `@agentbench/provider-utils` shared package | Released |
| E1 | npm package publication (`npm install -g agentbench`) | Released |
| E2 | `npx agentbench` support (zero-install trial) | Released |
| DS1 | Dataset system -- import/export/validate/split/version/diff | Released |
| G1 | GitHub Actions workflow generation from `agentbench init` | Released |
| V1 | VS Code Extension v1.0 -- Run, Debug, CodeLens, Status Bar | Released |
| V2 | VS Code Trace Viewer webview | Released |
| B1 | Benchmark Marketplace -- types, CLI, search, install, run, publish | Released |
| B2 | Benchmark leaderboard + submission pipeline | Released |

### Success Criteria

- `npm install -g agentbench && agentbench init && agentbench test` works in under 5 minutes
- 500+ npm downloads/week
- 14 official examples, all passing CI
- Documentation site live at agentbench.dev
- 12+ providers supported
- VS Code extension published on marketplace
- Benchmark marketplace operational

---

## v0.4.0 -- "Ecosystem" (Target: Q4 2026)

**Goal:** Build the platform around AgentBench -- richer CI integrations, full dataset system, editor tooling, and a thriving benchmark marketplace.

### GitHub Integration

| # | Feature | Effort |
|---|---------|--------|
| G1 | GitHub Actions PR comments with regression detection, diff highlighting, cost tracking | 3 weeks |
| G2 | GitHub Checks API integration for native pass/fail check runs | 1 week |
| G3 | `agentbench/github-action@v0.4` marketplace action -- managed, versioned | 1 week |
| G4 | GitLab CI integration with merge request comments | 1 week |
| G5 | CircleCI orb for AgentBench | 1 week |

### Full Dataset System

| # | Feature | Effort |
|---|---------|--------|
| DS1 | HuggingFace Hub integration -- direct import/export, dataset hosting | 2 weeks |
| DS2 | OpenAI Evals format import -- run standard eval suites as AgentBench tests | 1 week |
| DS3 | LangSmith dataset migration tool -- import your LangSmith datasets | 1 week |
| DS4 | Dataset Dashboard UI -- list, search, import, split, version controls | 2 weeks |
| DS5 | Dataset visualization -- distribution charts, category breakdowns, quality scores | 1 week |
| DS6 | Dataset sharing -- publish datasets for community use | 1 week |

### VS Code Extension v2.0

| # | Feature | Effort |
|---|---------|--------|
| V3 | Test Explorer integration -- tree view of all tests with run/debug controls | 1 week |
| V4 | Inline snapshot management -- accept/reject snapshot changes in-editor | 1 week |
| V5 | Coverage gutter indicators -- green/red/yellow markers in the editor margin | 1 week |
| V6 | Test generation from trace -- "Generate test from this run" one-click | 1 week |
| V7 | Settings UI -- configure AgentBench from VS Code settings panel | 0.5 week |

### Benchmark Marketplace v2.0

| # | Feature | Effort |
|---|---------|--------|
| B3 | Benchmark validation pipeline -- automated schema + dataset + runnability checks | 2 weeks |
| B4 | Human review queue for first-time publishers | 1 week |
| B5 | Benchmark Dashboard UI -- search, browse, install, leaderboard, reviews | 2 weeks |
| B6 | Star ratings, reviews, and comments on benchmarks | 1 week |
| B7 | Benchmark versioning -- update a published benchmark, notify users | 1 week |
| B8 | Category and difficulty curation -- editorial quality standards | 1 week |
| B9 | "Run on Cloud" button -- run benchmarks on AgentBench infrastructure | 2 weeks |

### Provider Ecosystem

| # | Feature | Effort |
|---|---------|--------|
| P10 | Provider validation test suite -- ensure all providers pass same integration tests | 1 week |
| P11 | Custom provider development guide + template repo | 1 week |
| P12 | Verified provider badge for community providers that pass integration tests | 0.5 week |
| P13 | Provider registry on agentbench.dev -- browse and install community providers | 1 week |

### Success Criteria

- GitHub Actions workflow used by 50+ repos
- VS Code extension rated 4+ stars
- 20+ community benchmarks published
- Dataset system supports all 7 formats (CSV, JSON, JSONL, HuggingFace, OpenAI Evals, DeepEval, LangSmith)
- 100+ community provider installs

---

## v0.5.0 -- "Enterprise" (Target: Q1 2027)

**Goal:** Team collaboration, cloud offering, and enterprise features -- making AgentBench viable for organizations of any size.

### Team Workspaces

| # | Feature | Effort |
|---|---------|--------|
| T1 | Team workspaces -- shared projects, runs, datasets, benchmarks | 3 weeks |
| T2 | Role-based access control -- Admin, Editor, Viewer roles with granular permissions | 2 weeks |
| T3 | Team dashboard -- aggregate metrics, trends, and team-level pass rates | 2 weeks |
| T4 | Activity feed -- who ran what, when, with what result | 1 week |
| T5 | Team API keys -- scoped to specific projects and actions | 1 week |

### AgentBench Cloud

| # | Feature | Effort |
|---|---------|--------|
| C1 | AgentBench Cloud -- hosted dashboard, no self-hosting required | 4 weeks |
| C2 | Cloud runners -- execute tests on AgentBench-managed infrastructure | 3 weeks |
| C3 | Usage-based pricing + billing via Stripe | 2 weeks |
| C4 | Usage dashboards -- test count, token consumption, cost over time | 1 week |
| C5 | Cloud provider secrets management -- store API keys securely | 1 week |

### Enterprise Features

| # | Feature | Effort |
|---|---------|--------|
| A1 | Audit logging -- every action recorded with actor, timestamp, and diff | 1 week |
| A2 | SSO -- SAML and OIDC support for enterprise identity providers | 2 weeks |
| A3 | SOC 2 compliance program initiation | 4 weeks |
| A4 | Enterprise SLA with 99.9% uptime guarantee and priority support | Ongoing |
| A5 | Dedicated cloud instances -- single-tenant deployment | 2 weeks |

### Integrations

| # | Feature | Effort |
|---|---------|--------|
| W1 | Webhook system -- Slack, Discord, Microsoft Teams, email notifications | 2 weeks |
| W2 | Scheduled test runs -- cron-based recurring test execution | 1 week |
| W3 | Linear/Jira integration -- create issues automatically on regressions | 1 week |
| W4 | Datadog/New Relic metrics export -- send AgentBench metrics to your observability stack | 1 week |

### Success Criteria

- 50+ paying cloud customers
- 10+ enterprise deployments (SSO, audit logs, SLA)
- 99.9% cloud uptime
- NPS score of 50+

---

## v1.0.0 -- "Standard" (Target: Q3 2027)

**Goal:** AgentBench is the de facto standard for AI agent testing -- the tool developers reach for first, the benchmark that defines quality, and the foundation of the AI agent testing ecosystem.

### Platform Maturity

| # | Feature |
|---|---------|
| M1 | Stable v1 REST API contract -- no breaking changes without a major version bump |
| M2 | Stable v1 TypeScript SDK API -- full semantic versioning guarantees |
| M3 | Official Python SDK v1.0 -- feature parity with TypeScript SDK |
| M4 | Long-term support (LTS) releases -- 12-month support window per major version |
| M5 | Backward compatibility guarantee -- tests written for v1.0 run on all v1.x releases |

### Benchmark Hub

| # | Feature |
|---|---------|
| M6 | Curated, verified benchmarks with industry-standard status |
| M7 | "AgentBench Certified" badge for agents that pass official benchmarks |
| M8 | Annual State of AI Agent Quality report based on benchmark data |
| M9 | Industry-specific benchmark suites: healthcare, finance, legal, education |
| M10 | Benchmark governance committee -- community + industry representatives |

### Plugin Marketplace

| # | Feature |
|---|---------|
| M11 | Third-party judge plugins -- custom LLM judges, domain-specific evaluators |
| M12 | Third-party reporter plugins -- custom output formats, dashboards |
| M13 | Third-party provider plugins -- community-maintained providers |
| M14 | Plugin ratings, reviews, and verified badges |
| M15 | Plugin SDK and development guide with templates |

### Community and Ecosystem

| # | Feature |
|---|---------|
| M16 | Community recognition program -- maintainers, champions, ambassadors |
| M17 | Conference talks, workshops, and university partnerships |
| M18 | AgentBench Certified -- professional certification for AI agent testing |
| M19 | Annual AgentBench Conference -- community gathering |
| M20 | Open source governance -- RFC process, core maintainers, triagers |

### Enterprise

| # | Feature |
|---|---------|
| M21 | SOC 2 Type II certification |
| M22 | HIPAA compliance for healthcare deployments |
| M23 | FedRAMP authorization for government deployments |
| M24 | Dedicated support with SLAs -- 1-hour critical response |
| M25 | Custom deployment options -- VPC, air-gapped, on-premises |

### Success Criteria

- 100,000+ npm downloads/week
- 5,000+ GitHub stars
- 200+ community benchmarks
- 50+ community plugins (judges, reporters, providers)
- 100+ enterprise customers
- AgentBench becomes the default recommendation in AI agent documentation
- "AgentBench tested" becomes a quality signal in the AI agent ecosystem

---

## Strategic Themes

Across all versions, these themes guide our decisions:

### 1. Developer Experience First
Every feature starts with the CLI and the 5-minute test. If a feature cannot be demonstrated in 5 minutes, it needs simplification.

### 2. Progressive Disclosure
Simple things simple, complex things possible. A first-time user runs `agentbench init && agentbench test` and sees green. A power user configures custom judges, CI pipelines, and benchmark publishing.

### 3. Convention over Configuration
Smart defaults that work out of the box. Configuration files are optional. Environment variables are auto-detected. The tool adapts to the developer, not the other way around.

### 4. Familiar Patterns
Mirror Jest, Vitest, and Playwright APIs wherever possible. `test()` and `suite()` work like `describe()` and `it()`. `expect()` chains like Jest. Snapshots work like Jest snapshots. If a developer knows Jest, they already know 80% of AgentBench.

### 5. Open by Default
Core is Apache 2.0. Cloud features are additive, not required. You can use AgentBench entirely for free, self-hosted, with no account. The cloud offering adds convenience for teams, not lock-in for individuals.

### 6. Honest about Non-Determinism
Do not pretend LLMs are deterministic. Build tools that embrace non-determinism: score-based assertions instead of exact-match, replay for deterministic regression testing, statistical methods for A/B comparison.

### 7. Ecosystem over Platform
AgentBench succeeds when the ecosystem succeeds. Providers, examples, benchmarks, plugins -- these form a self-reinforcing network. The core platform exists to enable the ecosystem, not to capture it.

### 8. Dogfooding
AgentBench is tested with AgentBench. Every release runs through the full test suite. Regressions in AgentBench are caught by AgentBench. We use our own tool the way our users do.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM API instability breaks tests | Medium | High | Replay mode provides deterministic fallback; snapshots decouple testing from live APIs |
| Adoption slower than expected | Medium | High | Focus on DX; target existing Jest/Playwright users; "try in 5 minutes" onboarding |
| Competing standard emerges | Medium | Critical | Build ecosystem (examples, benchmarks, providers) to create network effects; open source eliminates switching cost |
| Maintenance burden of 12+ providers | High | Medium | Shared `provider-utils` base class; community-maintained provider model; automated integration tests |
| Breaking changes alienate early adopters | Low | High | Strict semver from v1.0; migration guides; deprecation warnings one version before removal |
| Marketplace quality or spam | Medium | Medium | Automated validation + human review for first-time publishers; rating and reporting systems |
| Scope creep | High | High | Strict milestone gating; v0.3 = DX only; v0.4 = Ecosystem; v0.5 = Enterprise; defer non-core features |
| LLM cost makes testing expensive | Medium | Medium | Replay mode (zero LLM cost); cheap judge models (gpt-4o-mini); cost tracking and budgeting tools |

---

## How to Contribute

This roadmap is a living document. It evolves based on community feedback, market changes, and lessons learned from real-world usage.

- **Feature requests:** Open a discussion on [GitHub Discussions](https://github.com/1304674612/agentbench/discussions)
- **Bug reports:** File an issue on [GitHub Issues](https://github.com/1304674612/agentbench/issues)
- **RFCs:** Major design proposals go through the RFC process -- open an issue with the `rfc` label
- **Contributing:** See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines

---

> **Last Updated:** 2026-07-10
> **Document Version:** 2.0
> **Next Review:** Q4 2026 (v0.4.0 planning)
