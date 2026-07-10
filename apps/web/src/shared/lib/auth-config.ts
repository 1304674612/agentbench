/**
 * NextAuth.js v5 (Auth.js) configuration for AgentBench.
 *
 * Supports:
 * - Email + password (Credentials)
 * - GitHub OAuth (if AUTH_GITHUB_ID env var is set)
 * - Google OAuth (if AUTH_GOOGLE_ID env var is set)
 *
 * Session strategy: JWT, with userId & role augmented via callbacks.
 */

import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/shared/lib/db'
import type { User as PrismaUser } from '@prisma/client'

// ============================================================
// NextAuth Configuration
// ============================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const email = (credentials.email as string).toLowerCase().trim()
        const password = credentials.password as string

        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
          throw new Error('Account is suspended or banned')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.status === 'ACTIVE' ? 'user' : 'suspended',
        }
      },
    }),
    // Conditionally add OAuth providers
    ...(process.env.AUTH_GITHUB_ID ? [GitHub] : []),
    ...(process.env.AUTH_GOOGLE_ID ? [Google] : []),
  ],
  callbacks: {
    /**
     * Augment the JWT token with userId and role from the database.
     */
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id
        token.role = (user as { role?: string }).role ?? 'user'
      }

      // On first OAuth sign-in, store provider info
      if (account) {
        token.provider = account.provider
      }

      return token
    },

    /**
     * Augment the session with userId and role from the JWT token.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
})

// ============================================================
// Helpers
// ============================================================

/**
 * Get the server session. Equivalent to `auth()` but exported with
 * a familiar name for callers that already use this pattern.
 */
export const getServerSession = auth
