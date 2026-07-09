import Link from 'next/link'
import { db } from '@/shared/lib/db'
import { Camera, Wrench, MessageSquare, Activity } from 'lucide-react'
import { formatRelativeTime } from '@/shared/lib/utils'

export default async function SnapshotsPage() {
  const snapshots = await db.snapshot.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      project: { select: { id: true, name: true } },
      run: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Snapshots</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saved agent states for replay and comparison.
        </p>
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Camera className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No snapshots yet</p>
          <p className="text-xs text-muted-foreground/70">
            Snapshots are created automatically when you run tests, or manually via the CLI.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Project</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Run</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Details</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {snapshots.map((s: { id: string; name: string; description?: string | null; type: string; data: unknown; createdAt: Date; project: { name: string }; run?: { id: string; name: string } | null }) => {
                const data = s.data as Record<string, unknown>
                const tools = (data.tools as Array<unknown>) ?? []
                const ctx = (data.context ?? {}) as Record<string, unknown>
                const msgs = (ctx.messages as Array<unknown>) ?? []
                const model = (data.model ?? {}) as { name?: string; provider?: string }
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          s.type === 'AUTO' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : s.type === 'CI' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {s.type.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.project.name}</td>
                    <td className="px-4 py-2.5">
                      {s.run ? (
                        <Link href={`/runs/${s.run.id}`} className="text-xs font-mono text-blue-400 hover:underline">
                          {s.run.name.slice(0, 20)}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> {tools.length} tools</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {msgs.length} msgs</span>
                        {model.name && (
                          <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> {String(model.name)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {s.createdAt ? formatRelativeTime(s.createdAt) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
