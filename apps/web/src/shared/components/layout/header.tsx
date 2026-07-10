'use client'

import { Command, Moon, Search, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { NotificationDropdown } from '@/shared/components/notifications/notification-dropdown'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-6">
      {/* Breadcrumb / Page Title */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Dashboard</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            <Command className="inline h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Theme toggle */}
        {mounted && (
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* User avatar */}
        <div className="ml-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-medium text-primary">U</span>
        </div>
      </div>
    </header>
  )
}
