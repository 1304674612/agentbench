import Link from 'next/link'
import { ArrowRight, Play, CheckCircle2, Zap, BarChart3, Shield, Terminal, Code2, Layers, Github } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span className="font-bold text-lg">AgentBench</span>
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">v0.1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/1304674612/agentbench" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Github className="h-4 w-4" /> GitHub
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">
              Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Phase 6 complete — v0.1.0 now available
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Regression Testing
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            for AI Agents
          </span>
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
          AgentBench brings the rigor of software testing — replay, evaluate, compare, assert,
          regression test — to the world of AI agents. Think <strong>Playwright + Jest + LangSmith</strong>,
          purpose-built for agent developers.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/10">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="https://github.com/1304674612/agentbench" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors">
            <Github className="h-4 w-4" /> View on GitHub
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need to ship with confidence</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
          AgentBench gives you the same testing rigor for your AI agents that you expect for your code.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border p-6 hover:border-foreground/10 transition-colors">
              <div className="rounded-lg bg-muted w-fit p-2.5 mb-4">
                <f.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Code Demo */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-4">Write tests like you write code</h2>
        <p className="text-muted-foreground text-center mb-10">
          A familiar, chained assertion DSL — no new syntax to learn.
        </p>
        <div className="rounded-xl border border-border bg-[#0d0d0d] overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-xs text-muted-foreground ml-2">test.ts</span>
          </div>
          <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
            <code>{`import { expect } from '@agentbench/core'

const result = await expect(runResult)
  .status().toBeCompleted()
  .tool("search").toBeCalled()
  .tool("search").toBeCalledWith({
    query: "refund policy"
  })
  .output().toContain("30 days")
  .output().toMatchRegex(/refund.*policy/i)
  .tokens().toBeLessThan(4096)
  .latency().toBeLessThan(5000)
  .score("correctness").toBeGreaterThan(7)
  .score("safety").toBeGreaterThan(8)
  .run()

console.log(\`\${result.passed} passed, \${result.failed} failed\`)`}</code>
          </pre>
        </div>
      </section>

      {/* CLI Demo */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-4">Or use the CLI</h2>
        <p className="text-muted-foreground text-center mb-10">Run tests from your terminal — perfect for CI/CD.</p>
        <div className="rounded-xl border border-border bg-[#0d0d0d] overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">terminal</span>
          </div>
          <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
            <code>{`$ agentbench test --project my-agent --grep "customer-support" --verbose

⚡ Running tests...
  Suites: 3
  Test cases: 12

  ✓ greeting: 5/5 passed (2340ms)
  ✓ refund_check: 4/4 passed (1890ms)
  ✗ escalation: 2/3 passed (3200ms)
     └ tool_not_called("hallucinate") failed

────────────────────────────────────────────────────────────
Test Results
  ✓ 10 passed
  ✗ 1 failed
  ⚠ 0 errors
  Total: 12 test(s)`}</code>
          </pre>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-border text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to stop guessing?</h2>
        <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
          Ship your AI agents with the same confidence you ship your code. Open source, Apache 2.0 licensed.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors shadow-lg shadow-foreground/10">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="https://github.com/1304674612/agentbench" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors">
            <Github className="h-4 w-4" /> Star on GitHub
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>Apache 2.0 © AgentBench — Built with ❤️ for the AI agent community</p>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Play,
    title: 'Agent Runner + Tracer',
    desc: 'Execute agents and capture every LLM call, tool invocation, and response with full timing and token data.',
  },
  {
    icon: CheckCircle2,
    title: 'Evaluation Engine',
    desc: '14 rule-based evaluators + LLM-as-Judge across 8 quality dimensions — correctness, safety, faithfulness, and more.',
  },
  {
    icon: Terminal,
    title: 'Assertion DSL',
    desc: 'expect().tool().tokens().latency().output().score().run() — test your agents with the same fluency as Jest.',
  },
  {
    icon: Zap,
    title: 'Replay & Diff',
    desc: 'Deterministic and cross-model replay. Side-by-side comparison of outputs, metrics, and execution paths.',
  },
  {
    icon: BarChart3,
    title: 'A/B Experiments',
    desc: 'Statistically rigorous comparison with Welch\'s t-test, bootstrap confidence intervals, and Cohen\'s d effect size.',
  },
  {
    icon: Code2,
    title: 'Multi-SDK Support',
    desc: 'Native wrappers for OpenAI, Anthropic, and MCP. Generic adapter for LangGraph, CrewAI, and custom agents.',
  },
]
