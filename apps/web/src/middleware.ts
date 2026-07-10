/**
 * AgentBench — Next.js Middleware
 *
 * Route protection using NextAuth.js v5:
 * - /dashboard/*  →  requires authentication (redirect to /signin)
 * - /api/v1/* write endpoints → requires authentication (returns 401)
 * - / (landing) and /api/auth/* → public access
 */

import { auth } from '@/shared/lib/auth-config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================
// Route matchers
// ============================================================

const PROTECTED_PREFIXES = ['/dashboard']
const API_WRITE_PREFIXES = ['/api/v1']
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon', '/signin', '/signup']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isApiWriteRoute(pathname: string): boolean {
  return API_WRITE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

// ============================================================
// Middleware
// ============================================================

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Protect dashboard routes — redirect to sign-in if unauthenticated
  if (isProtectedRoute(pathname)) {
    if (!req.auth) {
      const signInUrl = new URL('/signin', req.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next()
  }

  // Protect API v1 write endpoints
  if (isApiWriteRoute(pathname)) {
    const method = req.method
    const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    if (isWriteMethod && !req.auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }
    return NextResponse.next()
  }

  return NextResponse.next()
})

// ============================================================
// Config — which paths the middleware runs on
// ============================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
