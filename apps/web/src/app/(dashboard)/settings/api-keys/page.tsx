import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Keys',
  description: 'Manage your API keys for programmatic access to AgentBench.',
}

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Api Keys</h1>
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
