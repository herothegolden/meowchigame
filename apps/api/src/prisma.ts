// apps/api/src/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Prisma singleton to avoid creating multiple clients
 * (important for Fastify dev/watch and serverless-style restarts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? [] : ["query", "error", "warn"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
