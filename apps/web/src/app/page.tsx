import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Zap,
  BarChart3,
  Shield,
  Terminal,
  Code2,
  Github,
  ExternalLink,
  BookOpen,
  FileText,
  Scale,
  Wrench,
  Gauge,
  Target,
  Layers,
  Sparkles,
  Heart,
  RotateCcw,
  Camera,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'AgentBench — The Regression Testing Framework for AI Agents',
  description:
    'Replay, evaluate, compare, and assert — catch AI agent regressions before your users do. The Verification Framework for AI Agents.',
  openGraph: {
    title: 'AgentBench — The Regression Testing Framework for AI Agents',
    description:
      'Replay, evaluate, compare, and assert — catch AI agent regressions before your users do.',
    images: ['/api/og?title=AgentBench+Landing'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentBench — The Regression Testing Framework for AI Agents',
    description:
      'Replay, evaluate, compare, and assert — catch AI agent regressions before your users do.',
    images: ['/api/og?title=AgentBench+Landing'],
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-indigo-500/20">
      {/* ================================================================
       *  NAVIGATION
       *  ============================================================== */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base">AgentBench</span>
            <span className="hidden sm:inline-flex text-[10px] font-medium bg-indigo-500/10 text-indigo-400 rounded-full px-2 py-0.5 border border-indigo-500/20">
              v0.5.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="https://github.com/1304674612/agentbench"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              <span className="hidden lg:inline">GitHub</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-all active:scale-95"
            >
              Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ================================================================
       *  HERO
       *  ============================================================== */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-24 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="absolute top-12 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-muted-foreground">
              Current release — <span className="text-emerald-400 font-medium">v0.5.0</span>
              {' · '}
              <span className="text-emerald-400 font-medium">391+ tests</span>
              {' · '}
              <span className="text-emerald-400 font-medium">0 TS errors</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            The{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Regression Testing
            </span>
            <br />
            Framework for AI Agents
          </h1>

          <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            AgentBench brings the same rigor you expect from your code to your AI agents.
            <strong> Playwright + Jest + LangSmith</strong>, purpose-built for the agent era.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/1304674612/agentbench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors active:scale-95"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </Link>
            <Link
              href="https://github.com/1304674612/agentbench/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-16 pt-8 border-t border-border">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold font-mono">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
       *  FEATURES
       *  ============================================================== */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">Everything you need to ship with confidence</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete toolkit for testing, evaluating, and monitoring your AI agents throughout
              the entire development lifecycle.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border p-6 hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] transition-all"
              >
                <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 w-fit p-3 mb-5 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-colors">
                  <f.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
       *  CODE DEMO
       *  ============================================================== */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Write assertions like you write tests</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A chainable, type-safe DSL that reads like English. No new syntax to learn — if you
              know Jest, you know AgentBench.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#08080a] overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50 bg-muted/10">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                tests/agent.test.ts
              </span>
              <span className="ml-auto text-[10px] text-emerald-400/70 font-medium">
                ✓ 10/10 passing
              </span>
            </div>
            <pre className="p-6 text-sm leading-6 overflow-x-auto">
              <code className="text-[#e5e5e5]">
                <span className="text-[#6366f1]">import</span>{' '}
                <span className="text-[#a5b4fc]">{'{ expect }'}</span>{' '}
                <span className="text-[#6366f1]">from</span>{' '}
                <span className="text-[#34d399]">'@agentbench/core'</span>
                {'\n\n'}
                <span className="text-[#6366f1]">const</span>{' '}
                <span className="text-[#f9a8d4]">result</span> ={' '}
                <span className="text-[#6366f1]">await</span>{' '}
                <span className="text-[#a78bfa]">expect</span>(runResult){'\n'}
                <span className="text-[#6366f1]"> .status()</span>.
                <span className="text-[#fbbf24]">toBeCompleted</span>(){' '}
                <span className="text-[#6b7280]">// 1. Agent finished successfully</span>
                {'\n'}
                <span className="text-[#6366f1]"> .tool</span>(
                <span className="text-[#34d399]">"search_docs"</span>).
                <span className="text-[#fbbf24]">toBeCalled</span>(){' '}
                <span className="text-[#6b7280]">// 2. Called the right tool</span>
                {'\n'}
                <span className="text-[#6366f1]"> .output</span>().
                <span className="text-[#fbbf24]">toContain</span>(
                <span className="text-[#34d399]">"30 天"</span>){' '}
                <span className="text-[#6b7280]">// 3. Output contains correct info</span>
                {'\n'}
                <span className="text-[#6366f1]"> .output</span>().
                <span className="text-[#fbbf24]">toMatchRegex</span>(
                <span className="text-[#e5e5e5]">/退款.*政策/i</span>){' '}
                <span className="text-[#6b7280]">// 4. Pattern validation</span>
                {'\n'}
                <span className="text-[#6366f1]"> .tokens</span>().
                <span className="text-[#fbbf24]">toBeLessThan</span>(
                <span className="text-[#f97316]">4096</span>){' '}
                <span className="text-[#6b7280]">// 5. Token budget respected</span>
                {'\n'}
                <span className="text-[#6366f1]"> .latency</span>().
                <span className="text-[#fbbf24]">toBeLessThan</span>(
                <span className="text-[#f97316]">5000</span>){' '}
                <span className="text-[#6b7280]">// 6. Under 5 seconds</span>
                {'\n'}
                <span className="text-[#6366f1]"> .score</span>(
                <span className="text-[#34d399]">"correctness"</span>).
                <span className="text-[#fbbf24]">toBeGreaterThan</span>(
                <span className="text-[#f97316]">7</span>){' '}
                <span className="text-[#6b7280]">// 7. Quality threshold</span>
                {'\n'}
                <span className="text-[#6366f1]"> .score</span>(
                <span className="text-[#34d399]">"safety"</span>).
                <span className="text-[#fbbf24]">toBeGreaterThan</span>(
                <span className="text-[#f97316]">8</span>){' '}
                <span className="text-[#6b7280]">// 8. Safety threshold</span>
                {'\n'}
                <span className="text-[#6366f1]"> .run</span>()
                {'\n\n'}
                <span className="text-[#6366f1]">if</span> (
                <span className="text-[#fca5a5]">!result.allPassed</span>) {'{\n'}
                {'  '}
                <span className="text-[#fca5a5]">process.exit</span>(
                <span className="text-[#f97316]">1</span>){'\n'}
                {'}'}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ================================================================
       *  CLI DEMO
       *  ============================================================== */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Or use the CLI — CI-ready from day one</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every command outputs structured data. Pipe to jq, redirect to files, or use in GitHub
              Actions.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Terminal */}
            <div className="rounded-2xl border border-border bg-[#08080a] overflow-hidden shadow-2xl shadow-black/50">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50 bg-muted/10">
                <span className="text-xs text-muted-foreground font-mono">
                  ~/projects/my-agent $
                </span>
              </div>
              <pre className="p-5 text-sm leading-6 overflow-x-auto">
                <code className="text-[#e5e5e5]">
                  <span className="text-[#a78bfa]">agentbench</span> test{'\n'}
                  {'  '}
                  <span className="text-[#6366f1]">--project</span> my-agent{'\n'}
                  {'  '}
                  <span className="text-[#6366f1]">--grep</span>{' '}
                  <span className="text-[#34d399]">"customer-support"</span>
                  {'\n'}
                  {'  '}
                  <span className="text-[#6366f1]">--verbose</span>
                  {'\n\n'}
                  <span className="text-[#6366f1]">⚡ Running tests...</span>
                  {'\n'}
                  <span className="text-[#6b7280]"> Suites: 3 · Test cases: 12</span>
                  {'\n\n'}
                  <span className="text-[#34d399]"> ✓</span> greeting{' '}
                  <span className="text-[#6b7280]">5/5 passed (2,340ms)</span>
                  {'\n'}
                  <span className="text-[#34d399]"> ✓</span> refund_check{' '}
                  <span className="text-[#6b7280]">4/4 passed (1,890ms)</span>
                  {'\n'}
                  <span className="text-[#f87171]"> ✗</span> escalation{' '}
                  <span className="text-[#f87171]">2/3 failed (3,200ms)</span>
                  {'\n'}
                  {'     '}
                  <span className="text-[#fbbf24]">└ tool_not_called("hallucinate") failed</span>
                  {'\n\n'}
                  <span className="text-[#6b7280]">──────────────────────────────────────</span>
                  {'\n'}
                  <span className="text-[#fca5a5]"> ✗ 1 failed</span>
                </code>
              </pre>
            </div>

            {/* Right: Quick command reference */}
            <div className="space-y-3">
              {cliCommands.map((cmd) => (
                <div
                  key={cmd.cmd}
                  className="rounded-xl border border-border p-4 hover:border-indigo-500/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <cmd.icon className="h-4 w-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <code className="text-sm font-semibold">{cmd.cmd}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{cmd.desc}</p>
                    </div>
                    <Link
                      href={`https://github.com/1304674612/agentbench/wiki/CLI-Reference#agentbench-${cmd.cmd.replace('agentbench ', '').split(' ')[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-auto"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
       *  ECOSYSTEM
       *  ============================================================== */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3">A growing ecosystem</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Native SDKs for every major LLM provider, with more on the way.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystem.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-2xl border border-border p-6 text-center hover:border-indigo-500/10 transition-colors"
              >
                <code className="text-sm font-bold text-indigo-400 bg-indigo-500/5 rounded-lg px-3 py-1.5 inline-block mb-4">
                  {pkg.name}
                </code>
                <p className="text-xs text-muted-foreground leading-relaxed">{pkg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
       *  CTA
       *  ============================================================== */}
      <section className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to stop{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              guessing
            </span>
            ?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
            Ship your AI agents with the same confidence you ship your code. Open source. Apache
            2.0. Built for the community.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Launch Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/1304674612/agentbench"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
       *  FOOTER
       *  ============================================================== */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">AgentBench</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Regression Testing Framework for AI Agents.
                <br />
                Apache 2.0 License.
              </p>
            </div>

            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="font-semibold text-xs mb-3 uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        target={l.href.startsWith('http') ? '_blank' : undefined}
                        rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
            <span>© 2026 AgentBench Contributors. Apache 2.0 Licensed.</span>
            <Link
              href="https://github.com/1304674612/agentbench"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">1304674612/agentbench</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ================================================================
// DATA
// ================================================================

const navLinks = [
  { label: 'Docs', href: 'https://github.com/1304674612/agentbench/wiki' },
  { label: 'API', href: 'https://github.com/1304674612/agentbench/wiki/API-Reference' },
  { label: 'CLI', href: 'https://github.com/1304674612/agentbench/wiki/CLI-Reference' },
  { label: 'Release', href: 'https://github.com/1304674612/agentbench/releases' },
]

const stats = [
  { value: '150+', label: 'TypeScript Files' },
  { value: '9', label: 'Packages' },
  { value: '20', label: 'API Endpoints' },
  { value: '391+', label: 'Unit Tests' },
  { value: '0', label: 'TS Errors' },
]

const features = [
  {
    icon: Play,
    title: 'Agent Runner & Tracer',
    desc: 'Execute agents and capture every LLM call, tool invocation, and response — with full timing, token, and cost data.',
  },
  {
    icon: CheckCircle2,
    title: 'Evaluation Engine',
    desc: '14 rule-based evaluators plus LLM-as-Judge across 8 quality dimensions: correctness, faithfulness, safety, and more.',
  },
  {
    icon: Terminal,
    title: 'Assertion DSL',
    desc: 'expect().tool().output().tokens().latency().score().run() — the most fluent way to test an AI agent.',
  },
  {
    icon: RotateCcw,
    title: 'Replay & Diff',
    desc: 'Deterministic and cross-model replay. Side-by-side comparison of outputs, metrics, and execution traces.',
  },
  {
    icon: BarChart3,
    title: 'A/B Experiments',
    desc: "Statistically rigorous agent comparison with Welch's t-test, bootstrap CIs, and Cohen's d effect size.",
  },
  {
    icon: Code2,
    title: 'Multi-SDK Support',
    desc: 'Native wrappers for OpenAI, Anthropic, and MCP. Generic adapter for LangGraph, CrewAI, and custom agents.',
  },
]

const cliCommands = [
  { cmd: 'agentbench run', desc: 'Execute an agent and capture its trace', icon: Play },
  { cmd: 'agentbench test', desc: 'Run a test suite with assertions', icon: CheckCircle2 },
  { cmd: 'agentbench evaluate', desc: 'Score a run against rules or LLM judges', icon: Gauge },
  { cmd: 'agentbench replay', desc: 'Replay with a different model or in batch', icon: RotateCcw },
  { cmd: 'agentbench compare', desc: 'Side-by-side comparison of two runs', icon: Layers },
  { cmd: 'agentbench snapshot', desc: 'Save and restore agent state', icon: Camera },
  { cmd: 'agentbench report', desc: 'Export reports in JSON/MD/HTML/JUnit', icon: FileText },
  { cmd: 'agentbench init', desc: 'Initialize a new AgentBench project', icon: Sparkles },
]

const ecosystem = [
  {
    name: '@agentbench/openai',
    desc: 'OpenAI wrapper with automatic tracing, token counting, and cost calculation.',
  },
  {
    name: '@agentbench/anthropic',
    desc: 'Anthropic Claude wrapper with streaming, system prompt, and tool use support.',
  },
  {
    name: '@agentbench/mcp',
    desc: 'MCP client for tool calls and resource access, with full tracing.',
  },
  {
    name: '@agentbench/langgraph',
    desc: 'Real LangGraph adapter — trace and evaluate your LangGraph agents.',
  },
  {
    name: '@agentbench/adapter',
    desc: 'Generic adapter for CrewAI, LlamaIndex, and custom agents.',
  },
  {
    name: 'agentbench (Python)',
    desc: 'Full Python SDK — Runner, Tracer, Assertion DSL, CLI. pip install agentbench.',
  },
]

const footerLinks = [
  {
    title: 'Documentation',
    links: [
      {
        label: 'Getting Started',
        href: 'https://github.com/1304674612/agentbench/wiki/Getting-Started',
      },
      {
        label: 'API Reference',
        href: 'https://github.com/1304674612/agentbench/wiki/API-Reference',
      },
      {
        label: 'CLI Reference',
        href: 'https://github.com/1304674612/agentbench/wiki/CLI-Reference',
      },
      { label: 'SDK Guide', href: 'https://github.com/1304674612/agentbench/wiki/SDK-Guide' },
      { label: 'FAQ', href: 'https://github.com/1304674612/agentbench/wiki/FAQ' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'GitHub Issues', href: 'https://github.com/1304674612/agentbench/issues' },
      { label: 'Discussions', href: 'https://github.com/1304674612/agentbench/discussions' },
      {
        label: 'Contributing',
        href: 'https://github.com/1304674612/agentbench/blob/main/CONTRIBUTING.md',
      },
      { label: 'Security', href: 'https://github.com/1304674612/agentbench/blob/main/SECURITY.md' },
      {
        label: 'Code of Conduct',
        href: 'https://github.com/1304674612/agentbench/blob/main/CODE_OF_CONDUCT.md',
      },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Release Notes', href: 'https://github.com/1304674612/agentbench/releases' },
      {
        label: 'Changelog',
        href: 'https://github.com/1304674612/agentbench/blob/main/CHANGELOG.md',
      },
      { label: 'Roadmap', href: 'https://github.com/1304674612/agentbench/wiki/Roadmap' },
      { label: 'License', href: 'https://github.com/1304674612/agentbench/blob/main/LICENSE' },
      { label: 'Architecture', href: 'https://github.com/1304674612/agentbench/wiki/Architecture' },
    ],
  },
]
