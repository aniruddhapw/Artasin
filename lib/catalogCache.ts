/**
 * The public catalogue (artworks, artists, their portfolios, blog posts and
 * reviews) changes rarely but is read on every page view, by people and
 * crawlers alike. Reading it from the database each time keeps the database
 * awake, and an awake database is what Neon bills for.
 *
 * So public pages read it through `catalog`, a stand-in for `prisma` whose
 * reads are kept in Next's data cache. lib/db.ts clears the cache whenever
 * anything writes to a catalogue table, so pages never show stale work; the
 * day-long expiry is only a backstop for writes made outside the app (a
 * script, the Neon console).
 *
 * Only for data anyone may see: per-visitor reads (their cart, their own
 * drafts) stay on `prisma`.
 */

import { unstable_cache } from "next/cache";
import { CATALOG_TAG, prisma } from "@/lib/db";

/** The models public pages read, and the only ones `catalog` offers. */
type CatalogModel = "artwork" | "artistProfile" | "blogPost" | "review";

const READS = new Set(["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"]);
const DAY = 60 * 60 * 24;
// A new deployment may read different fields, so it starts with its own entries.
const BUILD = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

const cachedRead = unstable_cache(
  async (model: CatalogModel, operation: string, args: unknown) => {
    const delegate = prisma[model] as unknown as Record<string, (args: unknown) => Promise<unknown>>;
    const read = delegate[operation];
    if (!read) {
      throw new Error(`catalog.${model}.${operation} is not a read`);
    }
    return read.call(delegate, args);
  },
  ["catalog", BUILD],
  { tags: [CATALOG_TAG], revalidate: DAY }
);

// The cache keeps JSON, which turns dates into strings; turn them back.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function reviveDates(value: unknown): unknown {
  if (typeof value === "string") {
    return ISO_DATE.test(value) ? new Date(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, reviveDates(item)]));
  }
  return value;
}

/**
 * `catalog.artwork.findMany(...)` and so on: the same calls and types as
 * `prisma`, served from the cache. (Decimal fields come back as strings; no
 * public page reads one.)
 */
export const catalog = new Proxy({} as Pick<typeof prisma, CatalogModel>, {
  get(_, model: string) {
    return new Proxy(
      {},
      {
        get(__, operation: string) {
          if (!READS.has(operation)) {
            throw new Error(`catalog.${model}.${operation} is not a cached read; use prisma`);
          }
          return async (args?: unknown) => reviveDates(await cachedRead(model as CatalogModel, operation, args ?? {}));
        }
      }
    );
  }
});
