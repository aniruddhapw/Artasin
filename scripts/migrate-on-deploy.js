import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Applies pending migrations as part of a production build, so the schema can
 * never ship behind the code that expects it.
 *
 * Vercel does not run migrations. Every one so far has been applied by hand
 * afterwards, and the newsletter column was not — the deploy went out, every
 * query touching a User row failed on a column that did not exist yet, and
 * logging in returned a 500 until someone noticed. Running it here means a
 * migration that cannot be applied fails the build instead, which leaves the
 * previous deployment serving.
 *
 * Note this is one-way: rolling a deployment back does not roll the schema
 * back with it. Migrations still have to be written so the previous release
 * survives them — additive columns, no drops in the same release that stops
 * writing a field.
 */

/**
 * Neon serves the same database on two hostnames, the pooled one carrying a
 * `-pooler` suffix. The app wants the pooled one; migrations must not use it,
 * because PgBouncer's transaction mode breaks Prisma Migrate in ways that
 * never mention pooling — `prepared statement "s0" already exists` is the
 * usual one. Dropping the suffix yields the direct host, so this needs no
 * second secret to be configured and kept in step with the first.
 */
export function directUrl(url) {
  // Only the host is rewritten. A blanket replace would also reach into the
  // password, and a credential quietly mangled into one that almost works is
  // the worst possible failure for something that runs unattended at deploy.
  const at = url.lastIndexOf("@");
  if (at === -1) {
    return url;
  }
  const rest = url.slice(at + 1);
  const slash = rest.indexOf("/");
  const host = slash === -1 ? rest : rest.slice(0, slash);
  const tail = slash === -1 ? "" : rest.slice(slash);
  return `${url.slice(0, at + 1)}${host.replace("-pooler.", ".")}${tail}`;
}

function main() {
  // Only production. Preview builds have no database of their own to migrate,
  // and a local `next build` should never touch a remote one.
  if (process.env.VERCEL_ENV !== "production") {
    console.log(`[migrate] VERCEL_ENV=${process.env.VERCEL_ENV || "unset"} — skipping migrations.`);
    return 0;
  }

  const configured = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!configured) {
    console.error("[migrate] DATABASE_URL is not set for this production build.");
    return 1;
  }

  // Resolved from the project rather than looked up on PATH: this runs under
  // plain `node` from a build command, where node_modules/.bin is not
  // necessarily present, and "prisma: not found" at deploy time is a poor way
  // to discover that.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const prisma = path.join(root, "node_modules", ".bin", "prisma");

  const result = spawnSync(prisma, ["migrate", "deploy"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directUrl(configured) }
  });

  if (result.error) {
    console.error("[migrate] Could not run prisma:", result.error.message);
    return 1;
  }
  return result.status ?? 1;
}

// Importing this for its helper — the test does — must not run a migration.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
