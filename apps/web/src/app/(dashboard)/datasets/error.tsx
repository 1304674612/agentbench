'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DatasetsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Failed to load datasets</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90">
        <RefreshCw className="h-4 w-4" /> Try Again
      </button>
    </div>
  )
}
