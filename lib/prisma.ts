import path from 'node:path'
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const localDbUrl = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV !== 'production' ? localDbUrl : undefined)

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required in production. Local SQLite fallback is development-only.')
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
