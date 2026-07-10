/**
 * API Error Handler
 *
 * Typed error classes and a centralized `handleApiError` function that
 * converts any thrown error into a consistent JSON error response.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ============================================================
// ApiError Class
// ============================================================

export class ApiError extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

// ============================================================
// Error Factories
// ============================================================

export function notFound(message = 'Resource not found'): ApiError {
  return new ApiError(message, 404, 'NOT_FOUND')
}

export function badRequest(message = 'Bad request'): ApiError {
  return new ApiError(message, 400, 'BAD_REQUEST')
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(message, 401, 'UNAUTHORIZED')
}

export function forbidden(message = 'Forbidden'): ApiError {
  return new ApiError(message, 403, 'FORBIDDEN')
}

export function conflict(message = 'Resource already exists'): ApiError {
  return new ApiError(message, 409, 'CONFLICT')
}

export function internal(message = 'Internal server error'): ApiError {
  return new ApiError(message, 500, 'INTERNAL_ERROR')
}

export function tooManyRequests(message = 'Too many requests'): ApiError {
  return new ApiError(message, 429, 'TOO_MANY_REQUESTS')
}

// ============================================================
// Centralized Error Handler
// ============================================================

export function handleApiError(error: unknown): NextResponse {
  // Known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.flatten(),
      },
      { status: 400 }
    )
  }

  // Prisma known request errors (e.g., unique constraint violation)
  if (isPrismaError(error)) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with that value already exists', code: 'UNIQUE_CONSTRAINT' },
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }
  }

  // Unknown errors — log and return generic 500
  console.error('[api-error] Unhandled error:', error)
  return NextResponse.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

// ============================================================
// Helpers
// ============================================================

interface PrismaErrorShape {
  code?: string
  meta?: unknown
}

function isPrismaError(error: unknown): error is PrismaErrorShape {
  return typeof error === 'object' && error !== null && 'code' in error
}
