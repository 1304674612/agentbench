export default function RunDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 bg-muted rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-7 w-48 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
          <div className="h-4 w-72 bg-muted rounded" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border bg-muted/50 px-4 py-2.5 flex gap-8">
            <div className="h-3 w-4 bg-muted rounded" />
            <div className="h-3 w-12 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded ml-auto" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-border">
              <div className="h-3 w-4 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Scores */}
      <div className="space-y-3">
        <div className="h-6 w-16 bg-muted rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded" />
              </div>
              <div className="h-2 bg-muted rounded-full" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
