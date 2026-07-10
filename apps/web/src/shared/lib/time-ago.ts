import { formatRelativeTime } from './utils'

/**
 * Returns a human-readable relative time string (e.g., "3m ago", "just now").
 * Delegates to {@link formatRelativeTime}.
 */
export default function timeAgo(date: Date | string): string {
  return formatRelativeTime(date)
}
