import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { directUrl } = await import("./migrate-on-deploy.js");

/**
 * Getting this wrong means migrations run over PgBouncer, which fails
 * intermittently and never says why — so the mapping is pinned rather than
 * trusted to a string replace nobody reads again.
 */
describe("directUrl", () => {
  it("drops the -pooler suffix from a Neon host", () => {
    assert.equal(
      directUrl("postgresql://u:p@ep-steep-shape-aeaxv6uj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"),
      "postgresql://u:p@ep-steep-shape-aeaxv6uj.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
    );
  });

  it("leaves an already-direct URL alone, so it is safe to apply twice", () => {
    const direct = "postgresql://u:p@ep-steep-shape-aeaxv6uj.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";
    assert.equal(directUrl(direct), direct);
    assert.equal(directUrl(directUrl(direct)), direct);
  });

  it("leaves a non-Neon URL alone", () => {
    const local = "postgresql://postgres:postgres@localhost:5432/artisan_exchange?schema=public";
    assert.equal(directUrl(local), local);
  });

  it("rewrites only the host, never a password that contains the same text", () => {
    assert.equal(
      directUrl("postgresql://user:a-pooler.secret@ep-abc-pooler.c-2.aws.neon.tech/db?sslmode=require"),
      "postgresql://user:a-pooler.secret@ep-abc.c-2.aws.neon.tech/db?sslmode=require"
    );
  });

  it("leaves a query parameter containing the same text alone", () => {
    const url = "postgresql://u:p@ep-abc.c-2.aws.neon.tech/db?application_name=my-pooler.job";
    assert.equal(directUrl(url), url);
  });

  it("returns a URL with no credentials untouched rather than guessing", () => {
    assert.equal(directUrl("not a url at all"), "not a url at all");
  });
});
