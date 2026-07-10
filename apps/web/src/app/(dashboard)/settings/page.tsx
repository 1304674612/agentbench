import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account, API keys, and project settings.',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and project settings.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        <p>Settings dashboard coming soon.</p>
      </div>
    </div>
  )
}
