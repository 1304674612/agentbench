/**
 * Notification Service
 *
 * Creates and manages in-app notifications with optional email delivery.
 * Notifications are stored in the Notification table.
 */

import type { Notification, NotificationType } from '@prisma/client'
import { db, json } from '@/shared/lib/db'
import { sendTransactionalEmail } from './email'

// ============================================================
// Create Notification
// ============================================================

/**
 * Create a notification for a user.
 *
 * Persists to the Notification table. If the user has email notifications
 * enabled (checked via SystemSetting), also sends an email.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<Notification> {
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link ?? null,
      metadata: metadata ? json(metadata) : undefined,
    },
  })

  // Optionally send email — check user preferences
  try {
    const shouldEmail = await shouldSendEmail(userId, type)
    if (shouldEmail) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      })
      if (user?.email) {
        // Map notification type to email template
        const template = notificationTypeToEmailTemplate(type)
        if (template) {
          await sendTransactionalEmail(user.email, template, {
            ...(metadata ?? {}),
            notification: { title, message },
          })
        }
      }
    }
  } catch (error) {
    // Don't fail notification creation for email errors
    console.error('[NOTIFICATIONS] Failed to send email:', error)
  }

  return notification
}

// ============================================================
// Read Operations
// ============================================================

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return result.count
}

/**
 * Get the number of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, isRead: false },
  })
}

/**
 * Get notifications for a user with pagination and filtering.
 */
export async function getNotifications(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  }
): Promise<Notification[]> {
  const { limit = 20, offset = 0, unreadOnly = false } = options ?? {}

  const where: { userId: string; isRead?: boolean } = { userId }
  if (unreadOnly) {
    where.isRead = false
  }

  return db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

/**
 * Get total notification count for a user.
 */
export async function getNotificationCount(userId: string, unreadOnly?: boolean): Promise<number> {
  const where: { userId: string; isRead?: boolean } = { userId }
  if (unreadOnly) {
    where.isRead = false
  }
  return db.notification.count({ where })
}

// ============================================================
// Email Preferences
// ============================================================

/**
 * Check whether the user wants email notifications for the given type.
 *
 * Reads from SystemSetting with key `notification_email_${userId}`,
 * which stores a JSON blob like `{ enabled: true, types: ["RUN_COMPLETED"] }`.
 * Falls back to sending email by default for all types.
 */
async function shouldSendEmail(userId: string, type: NotificationType): Promise<boolean> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: `notification_email_${userId}` },
    })
    if (!setting) return true // default: send email

    const value = setting.value as Record<string, unknown>
    if (value.enabled === false) return false

    // If specific types are configured, only send for those
    const allowedTypes = value.types as string[] | undefined
    if (allowedTypes && !allowedTypes.includes(type)) return false

    return true
  } catch {
    // If SystemSetting table doesn't exist or query fails, default to sending
    return true
  }
}

/**
 * Map a NotificationType to an EmailTemplate.
 */
function notificationTypeToEmailTemplate(
  type: NotificationType
): import('./email').EmailTemplate | null {
  switch (type) {
    case 'RUN_COMPLETED':
      return 'run_completed'
    case 'REGRESSION_DETECTED':
      return 'regression_detected'
    case 'USAGE_ALERT':
      return 'usage_alert'
    default:
      return null
  }
}
