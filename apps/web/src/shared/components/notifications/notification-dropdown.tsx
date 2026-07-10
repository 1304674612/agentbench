'use client'

import type { Notification } from '@prisma/client'
import { Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/shared/lib/client-fetch'
import { NotificationItem } from './notification-item'

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      const data = await apiFetch<{ count: number }>('/api/v1/notifications/unread-count')
      setUnreadCount(data.count ?? 0)
    } catch {
      // Silently fail — non-critical
    }
  }, [session?.user?.id])

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const data = await apiFetch<{ notifications: Notification[] }>(
        '/api/v1/notifications',
        { params: { limit: '20', offset: '0' } },
      )
      setNotifications(data.notifications ?? [])
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Poll unread count
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // every 30s
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch full list when opening
  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Mark as read
    try {
      await apiFetch('/api/v1/notifications', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'mark_read',
          notificationId: notification.id,
        }),
      })
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }

    // Navigate if there's a link
    if (notification.link) {
      setOpen(false)
      router.push(notification.link)
    }
  }, [router])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await apiFetch('/api/v1/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }, [])

  const handleViewAll = useCallback(() => {
    setOpen(false)
    router.push('/notifications')
  }, [router])

  // Don't render if not authenticated
  if (!session?.user) {
    return (
      <button
        type="button"
        className={`rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${className ?? ''}`}
      >
        <Bell className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${open ? 'bg-accent text-foreground' : ''} ${className ?? ''}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl z-50 animate-in fade-in slide-in-from-top-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
