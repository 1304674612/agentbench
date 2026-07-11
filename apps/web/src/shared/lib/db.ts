import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Cast a plain object to Prisma's InputJsonValue type.
 * Prisma 6.x enforces strict JSON types; this helper suppresses TS errors for dynamic JSON data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function json<T = any>(value: T): any {
  return value as any
}
