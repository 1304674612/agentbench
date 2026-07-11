/**
 * CORS Configuration
 *
 * Centralized CORS handling for API routes. Reads allowed origins from
 * the `ALLOWED_ORIGINS` environment variable (comma-separated).
 *
 * Default: localhost + agentbench.dev
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Defaults
// ============================================================

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://agentbench.dev',
  'https://www.agentbench.dev',
]

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
const DEFAULT_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-API-Key']
const DEFAULT_MAX_AGE = '86400' // 24 hours

// ============================================================
// Helpers
// ============================================================

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
  if (envOrigins) {
    return envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  }
  return DEFAULT_ALLOWED_ORIGINS
}

function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

// ============================================================
// CORS Headers
// ============================================================

export function corsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()
  const allowedOrigin =
    origin && isOriginAllowed(origin, allowedOrigins) ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS.join(', '),
    'Access-Control-Max-Age': DEFAULT_MAX_AGE,
    Vary: 'Origin',
  }
}

// ============================================================
// CORS Options
// ============================================================

export interface CORSOptions {
  /** List of allowed origins. If omitted, reads from ALLOWED_ORIGINS env or uses defaults. */
  allowedOrigins?: string[]
  /** List of allowed HTTP methods. Defaults to GET,POST,PATCH,DELETE,OPTIONS. */
  allowedMethods?: string[]
}

// ============================================================
// Handler Wrapper
// ============================================================

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse

/**
 * Wrap an API route handler with CORS support.
 *
 * Automatically handles OPTIONS preflight requests and adds CORS headers
 * to all responses.
 */
export function withCORS(handler: ApiHandler, options?: CORSOptions): ApiHandler {
  return async function corsHandler(req: NextRequest, ...args: any[]): Promise<NextResponse> {
    const origin = req.headers.get('origin')
    const validOrigins = options?.allowedOrigins ?? getAllowedOrigins()

    // Handle preflight
    if (req.method === 'OPTIONS') {
      const headers = corsHeaders(origin ?? undefined)
      return new NextResponse(null, { status: 204, headers })
    }

    // Run handler
    const response = await handler(req, ...args)
    const headers = corsHeaders(origin ?? undefined)

    // Merge CORS headers into response
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value)
    }

    return response
  }
}
