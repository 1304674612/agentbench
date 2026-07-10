import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { createProjectSchema, paginationSchema } from '@/shared/lib/validations'
import { handleApiError } from '@/shared/lib/error-handler'

import { z } from 'zod'

const projectQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = createProjectSchema.parse(body)

    const project = await db.project.create({
      data: {
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return handleApiError(error)
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
    return handleApiError(error)
  }
}
