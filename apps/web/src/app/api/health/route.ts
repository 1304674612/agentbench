import { NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'

export async function GET() {
  const checks = {
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
  } catch {
    checks.checks.database = 'error'
    checks.status = 'degraded'
  }

  const statusCode = checks.status === 'ok' ? 200 : 503
  return NextResponse.json(checks, { status: statusCode })
}
