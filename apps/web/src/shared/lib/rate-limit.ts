/**
 * Token Bucket Rate Limiter
 *
 * In-memory implementation using Map. Designed so Redis can be swapped in
 * later by implementing the same RateLimitStore interface.
 *
 * Default: 100 requests per minute per API key or IP.
 */

import type { NextRequest } from 'next/server'

// ============================================================
// Types
// ============================================================

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  maxRequests?: number
  /** Time window in milliseconds */
  windowMs?: number
}

interface Bucket {
  tokens: number
  resetAt: number
  lastRefill: number
}

/**
 * Store interface — implement this to swap in Redis or another backend.
 */
export interface RateLimitStore {
  get(key: string): Promise<Bucket | null>
  set(key: string, bucket: Bucket): Promise<void>
}

// ============================================================
// In-Memory Store
// ============================================================

class InMemoryStore implements RateLimitStore {
  private store = new Map<string, Bucket>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000)
    // Allow garbage collection of the interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  async get(key: string): Promise<Bucket | null> {
    const bucket = this.store.get(key)
    if (!bucket) return null
    return { ...bucket }
  }

  async set(key: string, bucket: Bucket): Promise<void> {
    this.store.set(key, { ...bucket })
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, bucket] of this.store.entries()) {
      if (bucket.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }

  /** For testing: clear all entries */
  _clear(): void {
    this.store.clear()
  }
}

// ============================================================
// Rate Limiter
// ============================================================

const DEFAULT_MAX_REQUESTS = 100
const DEFAULT_WINDOW_MS = 60_000 // 1 minute

let store: RateLimitStore = new InMemoryStore()

/**
 * Replace the rate limit store (e.g., with a Redis-backed implementation).
 */
export function setRateLimitStore(newStore: RateLimitStore): void {
  store = newStore
}

/**
 * Extract an identifier for rate limiting from the request.
 * Uses API key first, then falls back to IP address.
 */
function getClientId(req: NextRequest): string {
  // Try API key from Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return `key:${authHeader.slice(7)}`
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return `ip:${ip}`
}

/**
 * Core rate-limiting function.
 *
 * Applies a token bucket algorithm: each client gets `maxRequests` tokens
 * per `windowMs`. The bucket refills proportionally over time.
 */
export async function rateLimit(
  req: NextRequest,
  options?: RateLimitOptions
): Promise<RateLimitResult> {
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS
  const clientId = getClientId(req)
  const key = `rate_limit:${clientId}`
  const now = Date.now()

  let bucket = await store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    // New window — start with a full bucket minus 1
    const resetAt = now + windowMs
    bucket = { tokens: maxRequests - 1, resetAt, lastRefill: now }
    await store.set(key, bucket)
    return { allowed: true, remaining: bucket.tokens, resetAt }
  }

  // Refill tokens proportionally since last refill
  const elapsed = now - bucket.lastRefill
  const refillRate = maxRequests / windowMs
  const tokensToAdd = elapsed * refillRate
  bucket.tokens = Math.min(maxRequests, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens = Math.floor(bucket.tokens) - 1
    await store.set(key, bucket)
    return { allowed: true, remaining: bucket.tokens, resetAt: bucket.resetAt }
  }

  // No tokens left — rate limited
  return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
}

/**
 * Get the default rate limit headers for a response.
 */
export function getRateLimitHeaders(result: RateLimitResult, options?: RateLimitOptions): Record<string, string> {
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS
  return {
    'X-RateLimit-Limit': String(maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(result.resetAt),
  }
}
