import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        // ownerId: from auth session (not required in alpha)
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') ?? undefined
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)

    const where: Record<string, unknown> = {}
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [projects, total] = await Promise.all([
      db.project.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
      }),
      db.project.count({ where }),
    ])

    return NextResponse.json({ projects, total, limit, offset })
  } catch (error) {
    console.error('Failed to list projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
