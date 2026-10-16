import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One client per process; in development, hot reloads would otherwise open
// a new connection pool on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/artisan_exchange?schema=public";
const adapter = new PrismaPg(databaseUrl);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
