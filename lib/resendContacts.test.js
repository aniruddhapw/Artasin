import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const { contactsEnabled, subscriptionFor, syncNewsletterContact } = await import("./resendContacts.js");

const KEYS = ["RESEND_API_KEY", "RESEND_SEGMENT_ID", "RESEND_NEWSLETTER_TOPIC_ID"];

function configure(overrides = {}) {
  for (const key of KEYS) {
    process.env[key] = overrides[key] ?? `test-${key}`;
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    }
  }
}

afterEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

describe("contactsEnabled", () => {
  it("stays off until all three settings are present", () => {
    assert.equal(contactsEnabled(), false);
    for (const missing of KEYS) {
      configure({ [missing]: undefined });
      assert.equal(contactsEnabled(), false, `should be off without ${missing}`);
    }
    configure();
    assert.equal(contactsEnabled(), true);
  });
});

describe("subscriptionFor", () => {
  it("maps our boolean onto the two values Resend accepts", () => {
    assert.equal(subscriptionFor(true), "opt_in");
    assert.equal(subscriptionFor(false), "opt_out");
  });
});

describe("syncNewsletterContact", () => {
  const user = { email: "someone@artasin.in", firstName: "A", lastName: "B", newsletterOptIn: true };

  it("does nothing when unconfigured, so local dev never reaches Resend", async () => {
    assert.deepEqual(await syncNewsletterContact(user), { synced: false, reason: "not-configured" });
  });

  // The seeded demo accounts must not reach the contact list either. This is
  // asserted with the integration fully configured, because the point is that
  // the address is rejected before any network call is attempted — a test that
  // passed only because nothing was configured would prove nothing.
  it("refuses reserved-domain addresses before calling out", async () => {
    configure();
    for (const email of ["elena.rossi@example.com", "collector@example.com", "someone@localhost"]) {
      assert.deepEqual(
        await syncNewsletterContact({ ...user, email }),
        { synced: false, reason: "undeliverable" },
        email
      );
    }
  });
});
