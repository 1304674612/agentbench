import { NextResponse } from 'next/server'
import { getServerSession } from '@/shared/lib/auth-config'
import { getUnreadCount } from '@/shared/lib/notifications'

/**
 * GET /api/v1/notifications/unread-count
 *
 * Returns the unread notification count for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await getUnreadCount(session.user.id)

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[notifications] Failed to get unread count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
