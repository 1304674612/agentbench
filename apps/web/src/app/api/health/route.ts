import { NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'

export async function GET() {
  const checks: {
    status: string
    version: string
    timestamp: string
    checks: {
      database: string
      redis: string
      databaseError?: string
    }
  } = {
    status: 'ok',
    version: '0.3.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unchecked',
    },
  }

  // Check database connectivity
  try {
    await db.$queryRaw`SELECT 1`
    checks.checks.database = 'ok'
  } catch (error) {
    console.error('[HEALTH] Database connectivity check failed:', error)
    checks.checks.database = 'error'
    checks.checks.databaseError = error instanceof Error ? error.message : 'Unknown database error'
    checks.status = 'degraded'
  }

  const statusCode = checks.status === 'ok' ? 200 : 503
  return NextResponse.json(checks, { status: statusCode })
}
