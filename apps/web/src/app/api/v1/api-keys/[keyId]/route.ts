import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { getServerSession } from '@/shared/lib/auth-config'

// ============================================================
// DELETE /api/v1/api-keys/[keyId] — revoke an API key
// ============================================================

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { keyId } = await params

    // Find the key and verify ownership
    const key = await db.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true, isRevoked: true },
    })

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (key.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (key.isRevoked) {
      return NextResponse.json({ error: 'API key is already revoked' }, { status: 400 })
    }

    // Revoke the key (soft delete)
    await db.apiKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    })

    return NextResponse.json({ success: true, message: 'API key revoked' })
  } catch (error) {
    console.error('Failed to revoke API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
