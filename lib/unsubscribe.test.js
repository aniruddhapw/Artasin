import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";

const { createUnsubscribeToken, readUnsubscribeToken } = await import("./unsubscribe.js");

// Made fresh each run so no key-shaped string is ever committed.
const secret = crypto.randomBytes(32).toString("hex");
const otherSecret = crypto.randomBytes(32).toString("hex");
const userId = "test-user-1";

describe("unsubscribe tokens", () => {
  it("reads back the user it was made for", () => {
    const token = createUnsubscribeToken(userId, secret);
    assert.equal(readUnsubscribeToken(token, secret), userId);
  });

  it("is safe to put in a URL", () => {
    assert.match(createUnsubscribeToken(userId, secret), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  /** Otherwise anyone could unsubscribe anyone by guessing an id. */
  it("refuses a token pointed at a different user", () => {
    const [, sig] = createUnsubscribeToken("user-a", secret).split(".");
    const forged = `${Buffer.from("user-b").toString("base64url")}.${sig}`;
    assert.equal(readUnsubscribeToken(forged, secret), null);
  });

  it("refuses a token signed with another secret", () => {
    const token = createUnsubscribeToken("user-a", otherSecret);
    assert.equal(readUnsubscribeToken(token, secret), null);
  });

  it("refuses anything malformed", () => {
    for (const bad of [undefined, "", "no-dot", ".", "abc.", ".abc", "a.b.c"]) {
      assert.equal(readUnsubscribeToken(bad, secret), null, String(bad));
    }
  });
});
