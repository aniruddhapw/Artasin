import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { checkoutOpen } = await import("./checkoutGate.js");

describe("checkoutOpen", () => {
  it("is closed on production while payments are manual, set or not", () => {
    assert.equal(checkoutOpen({ VERCEL_ENV: "production" }), false);
    assert.equal(checkoutOpen({ VERCEL_ENV: "production", PAYMENT_PROVIDER: "manual" }), false);
  });

  it("opens on production once a real provider is configured", () => {
    assert.equal(checkoutOpen({ VERCEL_ENV: "production", PAYMENT_PROVIDER: "razorpay" }), true);
  });

  it("stays open for development and the dev site, so checkout can be tested there", () => {
    assert.equal(checkoutOpen({}), true);
    assert.equal(checkoutOpen({ VERCEL_ENV: "preview" }), true);
    assert.equal(checkoutOpen({ VERCEL_ENV: "preview", PAYMENT_PROVIDER: "manual" }), true);
  });
});
