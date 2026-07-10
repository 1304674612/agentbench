import type { NotificationType } from '@prisma/client'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withApiAuth, type ApiContext } from '@/shared/lib/api-middleware'
import { handleApiError } from '@/shared/lib/error-handler'
import {
  createNotification,
  getNotificationCount,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '@/shared/lib/notifications'

// ============================================================
// Validation Schemas
// ============================================================

const createNotificationBodySchema = z.object({
  userId: z.string(),
  type: z.enum([
    'SYSTEM',
    'BILLING',
    'SECURITY',
    'RUN_COMPLETED',
    'REGRESSION_DETECTED',
    'USAGE_ALERT',
  ] as const),
  title: z.string().min(1).max(256),
  message: z.string().min(1).max(5000),
  link: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const readBodySchema = z.object({
  action: z.enum(['mark_read', 'mark_all_read']),
  notificationId: z.string().optional(),
})

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

// ============================================================
// GET — List notifications for authenticated user
// ============================================================

export const GET = withApiAuth(async (req: NextRequest, ctx: ApiContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const params = Object.fromEntries(searchParams.entries())
    const parsed = querySchema.safeParse(params)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { limit, offset, unreadOnly } = parsed.data

    const [notifications, total] = await Promise.all([
      getNotifications(ctx.auth.userId, { limit, offset, unreadOnly }),
      getNotificationCount(ctx.auth.userId, unreadOnly),
    ])

    return NextResponse.json({ notifications, total, limit, offset })
  } catch (error) {
    return handleApiError(error)
  }
})

// ============================================================
// POST — Create a notification (internal/system use)
// ============================================================

export const POST = withApiAuth(async (req: NextRequest, _ctx: ApiContext) => {
  try {
    const body = await req.json()
    const parsed = createNotificationBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, type, title, message, link, metadata } = parsed.data

    const notification = await createNotification(
      userId,
      type as NotificationType,
      title,
      message,
      link,
      metadata as Record<string, unknown> | undefined
    )

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}, { requireWrite: true })

// ============================================================
// PATCH — Mark notifications as read
// ============================================================

export const PATCH = withApiAuth(async (req: NextRequest, ctx: ApiContext) => {
  try {
    const body = await req.json()
    const parsed = readBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action, notificationId } = parsed.data

    if (action === 'mark_all_read') {
      const count = await markAllAsRead(ctx.auth.userId)
      return NextResponse.json({ markedRead: count })
    }

    if (action === 'mark_read' && notificationId) {
      await markAsRead(notificationId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'notificationId is required for mark_read action' },
      { status: 400 }
    )
  } catch (error) {
    return handleApiError(error)
  }
})
