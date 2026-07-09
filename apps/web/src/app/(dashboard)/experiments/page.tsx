import Link from 'next/link'
import { db } from '@/shared/lib/db'
import { FlaskConical, Plus, Beaker, Layers, Gauge } from 'lucide-react'

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-border',
  RUNNING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default async function ExperimentsPage() {
  const experiments = await db.experiment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true } },
      variants: { select: { name: true, config: true } },
      _count: { select: { runs: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            A/B test prompts, models, and configurations with statistical rigor.
          </p>
        </div>
        <Link
          href="/experiments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Experiment
        </Link>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <FlaskConical className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No experiments yet</p>
          <p className="text-xs text-muted-foreground/70">
            Create an A/B experiment to compare prompts, models, or configurations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp: { id: string; name: string; status: string; conclusion?: string | null; config: unknown; project: { name: string }; variants: Array<{ name: string; config: unknown }>; _count: { runs: number } }) => {
            const config = exp.config as Record<string, unknown>
            const metrics = (config.metrics ?? []) as Array<{ name: string }>
            return (
              <div key={exp.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-sm">{exp.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{exp.project.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyles[exp.status] ?? statusStyles.DRAFT}`}>
                      {exp.status.toLowerCase()}
                    </span>
                    {exp.conclusion && (
                      <span className="text-[10px] text-muted-foreground">
                        {exp.conclusion === 'WINNER_A' ? '🏆 A wins' : exp.conclusion === 'WINNER_B' ? '🏆 B wins' : exp.conclusion === 'TIE' ? '🤝 Tie' : '🔬 Inconclusive'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3">
                  <div className="grid gap-3 sm:grid-cols-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Beaker className="h-3 w-3" />
                      {exp.variants.length} variants
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-3 w-3" />
                      {exp._count.runs} runs
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      {metrics.length} metrics
                    </div>
                  </div>

                  {/* Variant previews */}
                  <div className="grid gap-2 sm:grid-cols-2 mt-3">
                    {exp.variants.map((v: { name: string; config: unknown }) => {
                      const vc = v.config as Record<string, unknown>
                      return (
                        <div key={v.name} className="rounded-lg border border-border bg-muted/30 p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold bg-foreground text-background rounded-full w-4 h-4 inline-flex items-center justify-center">
                              {v.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {vc.model ? `Model: ${vc.model}` : ''}
                              {vc.temperature !== undefined ? ` · T=${String(vc.temperature)}` : ''}
                            </span>
                          </div>
                          {Boolean(vc.systemPrompt) && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {String(vc.systemPrompt ?? '').slice(0, 120)}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
