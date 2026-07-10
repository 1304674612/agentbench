'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export interface Column<T> {
  header: string
  accessor: string
  sortable?: boolean
  className?: string
  headerClassName?: string
  cell?: (item: T) => React.ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowHref?: (item: T) => string
  rowKey?: (item: T) => string
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowHref,
  rowKey,
  emptyMessage = 'No data available.',
  className = '',
}: DataTableProps<T>) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDirection('asc')
      }
    },
    [sortKey]
  )

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (aVal == null) return 1
        if (bVal == null) return -1
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortDirection === 'asc' ? comparison : -comparison
      })
    : data

  const handleRowClick = useCallback(
    (item: T) => {
      if (rowHref) {
        const href = rowHref(item)
        router.push(href)
      }
    },
    [router, rowHref]
  )

  if (data.length === 0) {
    return (
      <div className={`rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm ${className}`}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.accessor}
                className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${col.headerClassName ?? ''}`}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.accessor)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.header}
                    {sortKey === col.accessor ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedData.map((item, index) => (
            <tr
              key={rowKey ? rowKey(item) : index}
              className={`hover:bg-muted/30 transition-colors ${rowHref ? 'cursor-pointer' : ''}`}
              onClick={rowHref ? () => handleRowClick(item) : undefined}
              onKeyDown={
                rowHref
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRowClick(item)
                      }
                    }
                  : undefined
              }
              tabIndex={rowHref ? 0 : undefined}
              role={rowHref ? 'link' : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.accessor}
                  className={`px-4 py-3 ${col.className ?? ''}`}
                >
                  {col.cell ? col.cell(item) : String((item as Record<string, unknown>)[col.accessor] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
