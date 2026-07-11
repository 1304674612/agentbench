'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Play,
  FlaskConical,
  LayoutDashboard,
  GitCompare,
  Database,
  Zap,
  Camera,
  ShieldCheck,
  Settings,
  Key,
} from 'lucide-react'

interface SearchResult {
  title: string
  href: string
  icon: React.ElementType
  description: string
}

const staticResults: SearchResult[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Project overview and statistics',
  },
  { title: 'Runs', href: '/runs', icon: Play, description: 'Agent execution history' },
  {
    title: 'Tests',
    href: '/tests',
    icon: FlaskConical,
    description: 'Manage test suites and cases',
  },
  {
    title: 'Compare',
    href: '/compare',
    icon: GitCompare,
    description: 'Compare two runs side by side',
  },
  { title: 'Datasets', href: '/datasets', icon: Database, description: 'Manage test datasets' },
  {
    title: 'Experiments',
    href: '/experiments',
    icon: Zap,
    description: 'A/B test prompts and models',
  },
  { title: 'Snapshots', href: '/snapshots', icon: Camera, description: 'Manage replay snapshots' },
  { title: 'Coverage', href: '/coverage', icon: ShieldCheck, description: '4D coverage analysis' },
  { title: 'API Keys', href: '/settings/api-keys', icon: Key, description: 'Manage API keys' },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Account and project settings',
  },
]

export function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = query
    ? staticResults.filter(
        (r) =>
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.description.toLowerCase().includes(query.toLowerCase())
      )
    : staticResults

  useEffect(() => {
    setSelectedIndex(0)
    setQuery('')
  }, [open])

  const navigate = useCallback(
    (href: string) => {
      onClose()
      router.push(href)
    },
    [router, onClose]
  )

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        navigate(results[selectedIndex].href)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            autoFocus
            className="flex-1 bg-transparent px-3 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {results.map((item, i) => (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                i === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
