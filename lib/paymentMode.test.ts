import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveProviderName, isOfflinePayments } from "./paymentMode";

describe("effectiveProviderName", () => {
  it("turns manual into offline on production, whether it was set or left unset", () => {
    assert.equal(effectiveProviderName({ VERCEL_ENV: "production" }), "offline");
    assert.equal(effectiveProviderName({ VERCEL_ENV: "production", PAYMENT_PROVIDER: "manual" }), "offline");
  });

  it("leaves a real provider alone, which is how Razorpay switches this off", () => {
    assert.equal(effectiveProviderName({ VERCEL_ENV: "production", PAYMENT_PROVIDER: "razorpay" }), "razorpay");
    assert.equal(isOfflinePayments({ VERCEL_ENV: "production", PAYMENT_PROVIDER: "razorpay" }), false);
  });

  it("keeps manual for development and the dev site so checkout can be tested there", () => {
    assert.equal(effectiveProviderName({}), "manual");
    assert.equal(effectiveProviderName({ VERCEL_ENV: "preview" }), "manual");
  });

  it("lets offline be chosen explicitly anywhere", () => {
    assert.equal(effectiveProviderName({ PAYMENT_PROVIDER: "offline" }), "offline");
    assert.equal(isOfflinePayments({ VERCEL_ENV: "preview", PAYMENT_PROVIDER: "offline" }), true);
  });
});
