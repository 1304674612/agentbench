export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-lg" />
      <div className="h-4 w-72 bg-muted rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-5 space-y-3">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-12 bg-muted rounded" />
                <div className="flex-1 h-2 bg-muted rounded-full" />
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border p-5 space-y-3">
          <div className="h-5 w-36 bg-muted rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-muted" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
