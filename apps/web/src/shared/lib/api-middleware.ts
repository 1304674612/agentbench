/**
 * API Route Middleware
 *
 * Drop-in wrappers for Next.js API route handlers.
 * Provides authentication, rate limiting, and request logging.
 *
 * @example
 * ```typescript
 * import { withApiAuth, requireWrite, withRateLimit } from '@/shared/lib/api-middleware'
 *
 * export const POST = withRateLimit(withApiAuth(async (req, ctx) => {
 *   requireWrite(ctx.auth)
 *   // ... your handler logic
 * }, { requireWrite: true }))
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requireWrite, requireAdmin, AuthError, type AuthContext } from './auth'
import { rateLimit, getRateLimitHeaders, type RateLimitOptions } from './rate-limit'

export interface ApiContext {
  auth: AuthContext
}

export interface AuthOptions {
  /** Require write access (for POST/PATCH/DELETE) */
  requireWrite?: boolean
  /** Require admin access */
  requireAdmin?: boolean
}

// ============================================================
// Authentication Middleware
// ============================================================

/**
 * Wrap an API handler with authentication.
 *
 * Extracts auth from the request and passes it to the handler via `ctx.auth`.
 * Returns 401/403 on auth failure.
 */
export function withApiAuth<T extends { params?: unknown }>(
  handler: (req: NextRequest, ctx: T & ApiContext) => Promise<NextResponse> | NextResponse,
  options?: AuthOptions,
) {
  return async function authenticatedHandler(
    req: NextRequest,
    routeCtx?: T,
  ): Promise<NextResponse> {
    try {
      const auth = await authenticateRequest(req)

      if (options?.requireWrite) requireWrite(auth)
      if (options?.requireAdmin) requireAdmin(auth)

      const ctx = { ...(routeCtx ?? {}), auth } as T & ApiContext
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
          },
          { status: err.statusCode },
        )
      }
      console.error('Unhandled auth error:', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Quick auth check — use inside existing route handlers.
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const auth = await checkAuth(req)
 *   requireWrite(auth)
 *   // ... handler logic
 * }
 * ```
 */
export async function checkAuth(req: NextRequest): Promise<AuthContext> {
  return authenticateRequest(req)
}

// ============================================================
// Rate Limiting Middleware
// ============================================================

/**
 * Apply rate limiting to a request.
 * Returns the rate limit result. Does NOT send a response — the caller
 * decides what to do when the limit is exceeded.
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const limit = await applyRateLimit(req)
 *   if (!limit.allowed) {
 *     return NextResponse.json(
 *       { error: 'Too Many Requests', retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000) },
 *       { status: 429, headers: getRateLimitHeaders(limit) }
 *     )
 *   }
 *   // ... handler logic
 * }
 * ```
 */
export async function applyRateLimit(
  req: NextRequest,
  options?: RateLimitOptions,
) {
  return rateLimit(req, options)
}

/**
 * Wrap a handler with rate limiting.
 *
 * Automatically returns 429 when the rate limit is exceeded.
 * The `options` are used for both the rate limiter and rate-limit response headers.
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(async (req) => {
 *   // ... handler logic
 * }, { maxRequests: 50 })
 * ```
 */
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  options?: RateLimitOptions,
) {
  return async function rateLimitedHandler(
    req: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> {
    const result = await rateLimit(req, options)

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too Many Requests', retryAfter },
        {
          status: 429,
          headers: getRateLimitHeaders(result, options),
        },
      )
    }

    const response = await handler(req, ...args)

    // Add rate limit headers to success responses
    const headers = getRateLimitHeaders(result, options)
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }

    return response
  }
}

// ============================================================
// Request Logging Middleware
// ============================================================

/**
 * Wrap a handler with request logging.
 * Logs method, path, status code, and duration in ms with timestamps.
 */
export function withLogging(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
) {
  return async function loggingHandler(
    req: NextRequest,
    ...args: any[]
  ): Promise<NextResponse> {
    const start = Date.now()
    const method = req.method
    const url = new URL(req.url)
    const path = url.pathname

    let response: NextResponse
    try {
      response = await handler(req, ...args)
    } catch (err) {
      const duration = Date.now() - start
      console.log(
        `[${new Date().toISOString()}] ${method} ${path} 500 ${duration}ms (error)`,
      )
      throw err
    }

    const duration = Date.now() - start
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} ${response.status} ${duration}ms`,
    )

    return response
  }
}

// ============================================================
// Combined Middleware
// ============================================================

/**
 * Standard API handler stack: logging + rate limiting.
 * Use this for public read endpoints.
 *
 * @example
 * ```typescript
 * export const GET = withStandardMiddleware(async (req) => {
 *   // ... handler logic
 * })
 * ```
 */
export function withStandardMiddleware(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  rateLimitOptions?: RateLimitOptions,
) {
  return withLogging(withRateLimit(handler, rateLimitOptions))
}

export { requireWrite, requireAdmin, AuthError }
export type { AuthContext }
