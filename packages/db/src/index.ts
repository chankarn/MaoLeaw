// File: packages/db/src/index.ts
// Centralised Prisma client. Use this single instance across the API to avoid connection-pool exhaustion.
import { PrismaClient } from '@prisma/client';

declare global {

  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export * from '@prisma/client';
