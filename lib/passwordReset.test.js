import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { resetLinkProblem } = await import("./passwordReset.js");

describe("resetLinkProblem", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  const later = new Date("2026-09-26T12:30:00Z");
  const earlier = new Date("2026-09-26T11:30:00Z");

  it("accepts an unused link inside its hour", () => {
    assert.equal(resetLinkProblem({ usedAt: null, expiresAt: later }, now), null);
  });

  it("names a link it can't find", () => {
    assert.equal(resetLinkProblem(null, now), "invalid");
  });

  /**
   * Checked before expiry: once a password has been changed, "sign in" is
   * the useful answer even for an old link, and "request a new one" is not.
   */
  it("says a used link was used, even if it has since expired", () => {
    assert.equal(resetLinkProblem({ usedAt: earlier, expiresAt: later }, now), "used");
    assert.equal(resetLinkProblem({ usedAt: earlier, expiresAt: earlier }, now), "used");
  });

  it("says an unused link past its hour has expired", () => {
    assert.equal(resetLinkProblem({ usedAt: null, expiresAt: earlier }, now), "expired");
  });
});
