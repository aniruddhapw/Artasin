import { prisma } from "@/lib/db";

// This app runs on Vercel serverless functions, which don't share memory
// across invocations or regions — a plain in-process counter (a module-level
// Map, say) would only ever see a fraction of the traffic aimed at one route
// and let the rest through untouched. The database connection is already
// there for everything else, so the limiter piggybacks on it: one row per
// bucket, reset and incremented by a single atomic upsert so two concurrent
// requests can't both read the same count and both write the same increment.
async function hit(key, windowMs) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  const rows = await prisma.$queryRaw`
    INSERT INTO "RateLimitHit" ("key", "windowStart", "count")
    VALUES (${key}, ${now}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitHit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimitHit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitHit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimitHit"."windowStart" END
    RETURNING "count";
  `;

  // Cheap, unscheduled housekeeping: on roughly 1 in 200 hits, sweep out
  // buckets that expired a day or more ago so the table doesn't grow
  // forever. No cron job to configure, and correctness never depends on
  // this running — a skipped sweep just means a few stale rows linger.
  if (Math.random() < 0.005) {
    const staleCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    prisma.rateLimitHit.deleteMany({ where: { windowStart: { lt: staleCutoff } } }).catch(() => {});
  }

  return Number(rows[0].count);
}

function clientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Checks and records one hit against a rate limit bucket. Returns
 * { limited: false } if under the limit, or { limited: true, retryAfterSeconds }
 * if this request should be rejected.
 *
 * `key` should already identify the bucket (e.g. "login:ip:1.2.3.4" or
 * "login:email:name@example.com") — callers combine an action name with
 * whatever identifier makes sense (IP, email, or both) rather than this
 * helper guessing.
 */
export async function checkRateLimit(key, { max, windowMs }) {
  const count = await hit(key, windowMs);
  if (count > max) {
    return { limited: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  return { limited: false };
}

export function rateLimitKeyForIp(action, request) {
  return `${action}:ip:${clientIp(request)}`;
}

export function rateLimitKeyForValue(action, value) {
  return `${action}:v:${value}`;
}
