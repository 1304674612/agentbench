import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'
import { getServerSession } from '@/shared/lib/auth-config'

// ============================================================
// GET /api/v1/settings — return user profile + settings
// ============================================================

export async function GET() {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        plan: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get projects owned by this user
    const projects = await db.project.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        plan: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user,
      projects,
    })
  } catch (error) {
    console.error('Failed to get settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/v1/settings — update user or project settings
// ============================================================

const updateSettingsSchema = z.object({
  // User profile updates
  name: z.string().min(1).max(100).optional(),

  // Project settings
  projectId: z.string().optional(),
  projectName: z.string().min(1).max(100).optional(),
  projectSettings: z.record(z.unknown()).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const updates: Record<string, unknown> = {}

    // Update user profile
    if (parsed.data.name) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name: parsed.data.name },
      })
      updates.name = parsed.data.name
    }

    // Update project settings
    if (parsed.data.projectId) {
      const project = await db.project.findUnique({
        where: { id: parsed.data.projectId },
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Check ownership
      if (project.ownerId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const projectData: Record<string, unknown> = {}

      if (parsed.data.projectName) {
        projectData.name = parsed.data.projectName
      }

      if (parsed.data.projectSettings) {
        // Merge with existing settings
        const existingSettings = (project.settings as Record<string, unknown>) ?? {}
        projectData.settings = {
          ...existingSettings,
          ...parsed.data.projectSettings,
        }
      }

      if (Object.keys(projectData).length > 0) {
        await db.project.update({
          where: { id: parsed.data.projectId },
          data: projectData as any,
        })
        updates.project = { id: parsed.data.projectId, ...projectData }
      }
    }

    return NextResponse.json({ success: true, updates })
  } catch (error) {
    console.error('Failed to update settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
