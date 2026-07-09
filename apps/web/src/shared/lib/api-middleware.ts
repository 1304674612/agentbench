/**
 * API Route Middleware
 *
 * Drop-in auth wrapper for Next.js API route handlers.
 *
 * @example
 * ```typescript
 * import { withApiAuth, requireWrite } from '@/shared/lib/api-middleware'
 *
 * export const POST = withApiAuth(async (req, ctx) => {
 *   requireWrite(ctx.auth)
 *   // ... your handler logic
 * }, { requireWrite: true })
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requireWrite, requireAdmin, AuthError, type AuthContext } from './auth'

export interface ApiContext {
  auth: AuthContext
}

export interface AuthOptions {
  /** Require write access (for POST/PATCH/DELETE) */
  requireWrite?: boolean
  /** Require admin access */
  requireAdmin?: boolean
}

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
          { error: err.message },
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

export { requireWrite, requireAdmin, AuthError }
export type { AuthContext }
