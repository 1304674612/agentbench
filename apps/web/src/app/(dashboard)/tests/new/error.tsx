'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function NewTestSuiteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Failed to load test suite form</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90">
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        <Link href="/tests" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted">
          Back to Tests
        </Link>
      </div>
    </div>
  )
}
