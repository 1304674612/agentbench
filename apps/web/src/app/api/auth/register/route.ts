/**
 * POST /api/auth/register
 *
 * Create a new user account.
 * Body: { name: string, email: string, password: string }
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/shared/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim()
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)

    await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
        plan: 'FREE',
      },
    })

    return NextResponse.json(
      { success: true, message: 'Account created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[REGISTER] Failed to create user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
