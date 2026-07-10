import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'
import { getServerSession } from '@/shared/lib/auth-config'
import { generateApiKey } from '@/shared/lib/auth'

// ============================================================
// GET /api/v1/api-keys — list user's API keys (masked)
// ============================================================

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await db.apiKey.findMany({
      where: {
        userId: session.user.id,
        isRevoked: false,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ apiKeys: keys })
  } catch (error) {
    console.error('Failed to list API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// POST /api/v1/api-keys — generate a new API key
// ============================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z
    .array(z.enum(['READ', 'WRITE', 'ADMIN']))
    .optional()
    .default(['READ', 'WRITE']),
  expiresAt: z.string().datetime().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createApiKeySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { raw, hashed, prefix } = generateApiKey()

    await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        key: hashed,
        prefix,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      },
    })

    // Return the raw key — only time it will be visible
    return NextResponse.json(
      {
        raw,
        prefix,
        name: parsed.data.name,
        message: 'Store this key securely. It will not be shown again.',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
