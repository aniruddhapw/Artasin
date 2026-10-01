import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { verificationOutcome } = await import("./phoneVerificationOutcome.js");

describe("verificationOutcome", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const later = new Date("2026-10-01T12:20:00Z");
  const earlier = new Date("2026-10-01T11:00:00Z");
  const phone = "+919876543210";
  const code = { phone, expiresAt: later, usedAt: null };
  const user = { phone, phoneVerifiedAt: null };

  it("verifies a live code sent from the number it was made for", () => {
    assert.equal(verificationOutcome(code, user, phone, now), "verified");
  });

  it("won't verify from a different phone", () => {
    assert.equal(verificationOutcome(code, user, "+919999999999", now), "wrong-number");
  });

  it("won't verify once the account's number has changed", () => {
    assert.equal(verificationOutcome(code, { ...user, phone: "+919999999999" }, phone, now), "wrong-number");
  });

  it("names an expired code", () => {
    assert.equal(verificationOutcome({ ...code, expiresAt: earlier }, user, phone, now), "expired");
  });

  it("says so when the code was already used to verify this number", () => {
    assert.equal(verificationOutcome({ ...code, usedAt: earlier }, { ...user, phoneVerifiedAt: earlier }, phone, now), "already");
  });

  it("doesn't recognise a code it can't find", () => {
    assert.equal(verificationOutcome(null, null, phone, now), "unknown");
  });
});
