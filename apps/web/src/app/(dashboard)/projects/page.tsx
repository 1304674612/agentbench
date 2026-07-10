import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Organize your agent testing by project — manage runs, suites, and experiments per project.',
}

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Coming soon.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        <p>This module is under development.</p>
      </div>
    </div>
  )
}
