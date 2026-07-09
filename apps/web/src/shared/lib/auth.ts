/**
 * Auth utilities for AgentBench.
 *
 * Alpha auth system — supports:
 * - API Key authentication for programmatic access
 * - Session-based auth via NextAuth.js (when configured)
 * - Anonymous access for public read endpoints
 *
 * In production, replace the `authenticateRequest` function
 * with NextAuth.js `getServerSession` + API key validation.
 */

import type { NextRequest } from 'next/server'
import crypto from 'node:crypto'

// ============================================================
// API Key Validation
// ============================================================

/**
 * Validate an API key from the Authorization header.
 * Returns the associated user/project context if valid.
 */
export async function validateApiKey(apiKey: string): Promise<AuthContext | null> {
  // Hash the provided key to look it up
  const hashed = hashApiKey(apiKey)

  // In production, look up in the database
  // const record = await db.apiKey.findUnique({ where: { key: hashed } })
  // if (!record || record.isRevoked) return null

  // For alpha, accept any key starting with "ab-"
  if (apiKey.startsWith('ab-')) {
    return {
      userId: 'api-key-user',
      source: 'api_key',
      scopes: ['read', 'write'],
    }
  }

  return null
}

// ============================================================
// Auth Context
// ============================================================

export interface AuthContext {
  userId: string
  source: 'session' | 'api_key' | 'anonymous'
  scopes: Array<'read' | 'write' | 'admin'>
}

/**
 * Extract and validate authentication from a request.
 *
 * Priority: API Key > Session Cookie > Anonymous
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  // 1. Check for API Key in Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7)
    const context = await validateApiKey(apiKey)
    if (context) return context
  }

  // 2. Check for session cookie (NextAuth.js integration point)
  // const session = await getServerSession()
  // if (session?.user) {
  //   return { userId: session.user.id, source: 'session', scopes: ['read', 'write'] }
  // }

  // 3. Anonymous — read-only access to public endpoints
  return {
    userId: 'anonymous',
    source: 'anonymous',
    scopes: ['read'],
  }
}

/**
 * Require write access. Throws if not authorized.
 */
export function requireWrite(context: AuthContext): void {
  if (!context.scopes.includes('write') && !context.scopes.includes('admin')) {
    throw new AuthError('Write access required', 403)
  }
}

/**
 * Require admin access. Throws if not authorized.
 */
export function requireAdmin(context: AuthContext): void {
  if (!context.scopes.includes('admin')) {
    throw new AuthError('Admin access required', 403)
  }
}

// ============================================================
// API Key Utilities
// ============================================================

/**
 * Generate a new API key with the "ab-" prefix.
 */
export function generateApiKey(): { raw: string; hashed: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('hex')
  const raw = `ab-${random}`
  const hashed = hashApiKey(raw)
  const prefix = raw.slice(0, 12)
  return { raw, hashed, prefix }
}

/**
 * Hash an API key for storage using SHA-256.
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// ============================================================
// Auth Error
// ============================================================

export class AuthError extends Error {
  public statusCode: number

  constructor(message: string, statusCode = 401) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
  }
}

/**
 * Next.js API route helper: authenticate and return context, or return 401 response.
 */
export async function withAuth(req: NextRequest): Promise<AuthContext> {
  try {
    return await authenticateRequest(req)
  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError('Authentication failed', 401)
  }
}
