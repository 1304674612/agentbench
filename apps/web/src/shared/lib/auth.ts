/**
 * Auth utilities for AgentBench.
 *
 * Production auth system — supports:
 * - NextAuth.js v5 session-based authentication
 * - API Key authentication for programmatic access
 * - Anonymous access for public read endpoints
 */

import type { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { auth, getServerSession } from '@/shared/lib/auth-config'
import { db } from '@/shared/lib/db'

// ============================================================
// API Key Validation
// ============================================================

/**
 * Validate an API key from the Authorization header.
 * Looks up the hashed key in the database.
 * Returns the associated user/project context if valid.
 */
export async function validateApiKey(apiKey: string): Promise<AuthContext | null> {
  const hashed = hashApiKey(apiKey)

  const record = await db.apiKey.findUnique({
    where: { key: hashed },
    include: { user: true, project: true },
  })

  if (!record || record.isRevoked) return null

  // Check expiration
  if (record.expiresAt && record.expiresAt < new Date()) return null

  // Update last used timestamp (fire and forget)
  db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch((error: unknown) => {
    console.error('[AUTH] Failed to update API key lastUsedAt:', error)
  })

  const scopeSet = new Set(record.scopes)
  const scopes: Array<'read' | 'write' | 'admin'> = []
  if (scopeSet.has('READ')) scopes.push('read')
  if (scopeSet.has('WRITE')) scopes.push('write')
  if (scopeSet.has('ADMIN')) scopes.push('admin')

  return {
    userId: record.userId ?? 'api-key-user',
    source: 'api_key',
    scopes: scopes.length > 0 ? scopes : ['read'],
  }
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

  // 2. Check for NextAuth.js session
  const session = await getServerSession()
  if (session?.user?.id) {
    const role = (session.user as { role?: string }).role ?? 'user'
    const scopes: Array<'read' | 'write' | 'admin'> = ['read', 'write']
    if (role === 'admin') scopes.push('admin')
    return {
      userId: session.user.id,
      source: 'session',
      scopes,
    }
  }

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
 * Next.js API route helper: authenticate and return context, or throw.
 */
export async function withAuth(req: NextRequest): Promise<AuthContext> {
  try {
    return await authenticateRequest(req)
  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError('Authentication failed', 401)
  }
}
