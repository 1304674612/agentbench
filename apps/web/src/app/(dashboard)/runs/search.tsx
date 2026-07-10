'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useTransition } from 'react'

export function RunsSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = useCallback(
    (value: string) => {
      startTransition(() => {
        if (value) {
          router.push(`/runs?q=${encodeURIComponent(value)}`)
        } else {
          router.push('/runs')
        }
      })
    },
    [router],
  )

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder="Search runs..."
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background pl-10 pr-8 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {defaultValue && (
        <button
          type="button"
          onClick={() => handleChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {isPending && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      )}
    </div>
  )
}
