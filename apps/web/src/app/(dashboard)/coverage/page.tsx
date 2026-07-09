import { db } from '@/shared/lib/db'
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react'

export default async function CoveragePage() {
  // Aggregate coverage from all projects
  const projects = await db.project.findMany({
    include: {
      runs: {
        include: { traceSteps: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  const coverageByProject = projects.map((p: { id: string; name: string; runs: Array<{ traceSteps: Array<{ type: string; toolName?: string | null }> }> }) => {
    const toolNames = new Set<string>()
    const workerPaths = new Set<string>()

    for (const run of p.runs) {
      for (const step of run.traceSteps as Array<{ type: string; toolName?: string | null }>) {
        if (step.type === 'TOOL_CALL' && step.toolName) toolNames.add(step.toolName)
      }
      const path = (run.traceSteps as Array<{ type: string }>).map((s: { type: string }) => s.type).join(' → ')
      workerPaths.add(path)
    }

    const toolCov = toolNames.size > 0 ? 100 : 0
    const pathCov = p.runs.length > 0 ? Math.min(100, Math.round((workerPaths.size / p.runs.length) * 100)) : 0
    const overall = Math.round((toolCov + pathCov + 0) / 3)

    return {
      id: p.id,
      name: p.name,
      runCount: p.runs.length,
      toolCount: toolNames.size,
      pathCount: workerPaths.size,
      toolCoverage: toolCov,
      pathCoverage: pathCov,
      overall,
    }
  })

  const totalRuns = projects.reduce((s: number, p: { runs: Array<unknown> }) => s + p.runs.length, 0)
  const avgCoverage = coverageByProject.length > 0
    ? Math.round(coverageByProject.reduce((s: number, p: { overall: number }) => s + p.overall, 0) / coverageByProject.length)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Coverage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test coverage across prompt, workflow, tool, and edge-case dimensions.
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Shield className="h-4 w-4" />
            Overall Coverage
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{avgCoverage}%</span>
            <span className="text-xs text-muted-foreground mb-1">across {coverageByProject.length} projects</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            Total Runs
          </div>
          <div className="text-3xl font-bold">{totalRuns}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <AlertTriangle className="h-4 w-4" />
            Uncovered Paths
          </div>
          <div className="text-3xl font-bold">{coverageByProject.filter((p: { overall: number }) => p.overall < 50).length}</div>
          <div className="text-xs text-muted-foreground">projects below 50%</div>
        </div>
      </div>

      {/* Project Coverage */}
      {coverageByProject.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No coverage data yet. Run some agents to start collecting coverage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {coverageByProject.map((p: { id: string; name: string; runCount: number; toolCount: number; pathCount: number; toolCoverage: number; pathCoverage: number; overall: number }) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.runCount} runs · {p.toolCount} tools · {p.pathCount} unique paths</p>
                </div>
                <span className={`text-lg font-bold ${p.overall >= 70 ? 'text-emerald-400' : p.overall >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {p.overall}%
                </span>
              </div>

              {/* Dimension bars */}
              <div className="space-y-3">
                <DimensionBar label="Tool Coverage" pct={p.toolCoverage} color="bg-emerald-500" />
                <DimensionBar label="Workflow Coverage" pct={p.pathCoverage} color="bg-blue-500" />
                <DimensionBar label="Edge Case Coverage" pct={0} color="bg-amber-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Suggestions
        </h3>
        <div className="space-y-2">
          {totalRuns === 0 && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Run at least one agent to begin collecting coverage data.</span>
            </div>
          )}
          {coverageByProject.filter((p: { pathCount: number }) => p.pathCount <= 1).length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">Some projects have only a single execution path. Add error-handling and alternative-tool test cases.</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <span className="text-muted-foreground">Define edge cases (empty input, timeout, unicode) to get edge coverage metrics.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DimensionBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-mono">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 4)}%`, opacity: pct > 0 ? 1 : 0.3 }}
        />
      </div>
    </div>
  )
}
