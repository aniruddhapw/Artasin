import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { revalidateTag } from "next/cache";

/** The cache tag on public catalogue reads (lib/catalogCache.ts). */
export const CATALOG_TAG = "catalog";

/** Tables whose writes can change what a public page shows. */
const CATALOG_MODELS: ReadonlySet<string> = new Set([
  "Artwork",
  "ArtworkMedia",
  "ArtistProfile",
  "ArtistPromoPhoto",
  "PortfolioPiece",
  "BlogPost",
  "Review",
  // Reviews show the buyer's name.
  "User"
]);
const WRITES: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany"
]);

/**
 * Drops every cached catalogue read, so the next page view reads afresh.
 * Does nothing outside a request (scripts, tests) or where Next forbids it
 * (while a page renders).
 */
function refreshCatalog(): void {
  try {
    revalidateTag(CATALOG_TAG, { expire: 0 });
  } catch {
    // No request, no cache to clear.
  }
}

function createClient() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/artisan_exchange?schema=public";
  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  }).$extends({
    // Any write to a catalogue table clears the public pages' cached reads.
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (CATALOG_MODELS.has(model) && WRITES.has(operation)) {
            refreshCatalog();
          }
          return result;
        }
      }
    }
  });
}

// One client per process; in development, hot reloads would otherwise open
// a new connection pool on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
