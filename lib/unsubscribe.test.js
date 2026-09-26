import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { createUnsubscribeToken, readUnsubscribeToken } = await import("./unsubscribe.js");

const secret = "a-test-secret-that-is-long-enough";

describe("unsubscribe tokens", () => {
  it("reads back the user it was made for", () => {
    const token = createUnsubscribeToken("cmu8nhqkv000104jn4sb4nanj", secret);
    assert.equal(readUnsubscribeToken(token, secret), "cmu8nhqkv000104jn4sb4nanj");
  });

  it("is safe to put in a URL", () => {
    assert.match(createUnsubscribeToken("cmu8nhqkv000104jn4sb4nanj", secret), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  /** Otherwise anyone could unsubscribe anyone by guessing an id. */
  it("refuses a token pointed at a different user", () => {
    const [, sig] = createUnsubscribeToken("user-a", secret).split(".");
    const forged = `${Buffer.from("user-b").toString("base64url")}.${sig}`;
    assert.equal(readUnsubscribeToken(forged, secret), null);
  });

  it("refuses a token signed with another secret", () => {
    const token = createUnsubscribeToken("user-a", "some-other-secret-also-long-enough");
    assert.equal(readUnsubscribeToken(token, secret), null);
  });

  it("refuses anything malformed", () => {
    for (const bad of [undefined, "", "no-dot", ".", "abc.", ".abc", "a.b.c"]) {
      assert.equal(readUnsubscribeToken(bad, secret), null, String(bad));
    }
  });
});
