import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

// The console provider is chosen by env, so this has to be set before the
// module under test is imported.
process.env.EMAIL_PROVIDER = "console";

const { isUndeliverableEmail, sendBulkEmail, sendPersonalizedEmails } = await import("./email.js");

/**
 * The console provider logs one line per recipient, which is the only seam
 * available for asserting who actually reached the transport. That is the
 * thing worth pinning: Resend rejects an entire batch containing a single
 * reserved-domain address, so an address that gets this far costs every other
 * recipient their email.
 */
let logged = [];
const realLog = console.log;

beforeEach(() => {
  logged = [];
  console.log = (line) => {
    const match = /^\[email:console\] to=(\S+)/.exec(String(line));
    if (match) {
      logged.push(match[1]);
    }
  };
});

afterEach(() => {
  console.log = realLog;
});

describe("isUndeliverableEmail", () => {
  it("recognises the reserved domains a seeded database leaves behind", () => {
    for (const email of [
      "elena.rossi@example.com",
      "collector@example.com",
      "admin@example.com",
      "someone@example.net",
      "someone@host.test",
      "someone@host.invalid",
      "someone@localhost"
    ]) {
      assert.equal(isUndeliverableEmail(email), true, email);
    }
  });

  it("passes real addresses through, including ones that merely mention example", () => {
    for (const email of [
      "tanayaiche340@gmail.com",
      "notifications@artasin.in",
      "someone@example.co.in",
      "example@artasin.in"
    ]) {
      assert.equal(isUndeliverableEmail(email), false, email);
    }
  });

  it("does not throw on a missing address", () => {
    assert.equal(isUndeliverableEmail(undefined), false);
    assert.equal(isUndeliverableEmail(""), false);
  });
});

describe("sendBulkEmail", () => {
  it("keeps one demo account from costing every real recipient their email", async () => {
    const result = await sendBulkEmail(
      ["real@artasin.in", "elena.rossi@example.com", "other@gmail.com"],
      { subject: "A new post", html: "<p>hi</p>" }
    );

    assert.deepEqual(logged, ["real@artasin.in", "other@gmail.com"]);
    assert.deepEqual(result, { sent: 2, skipped: 1, failed: false });
  });

  it("does not call the provider when every address is undeliverable", async () => {
    const result = await sendBulkEmail(["a@example.com", "b@example.com"], {
      subject: "A new post",
      html: "<p>hi</p>"
    });

    assert.deepEqual(logged, []);
    assert.deepEqual(result, { sent: 0, skipped: 2, failed: false });
  });

  it("reports an empty list rather than returning nothing", async () => {
    assert.deepEqual(await sendBulkEmail([], { subject: "s", html: "h" }), {
      sent: 0,
      skipped: 0,
      failed: false
    });
  });
});

describe("sendPersonalizedEmails", () => {
  it("drops undeliverable addresses and counts only what was sent", async () => {
    const sent = await sendPersonalizedEmails([
      { to: "real@artasin.in", subject: "s", html: "h" },
      { to: "admin@example.com", subject: "s", html: "h" }
    ]);

    assert.deepEqual(logged, ["real@artasin.in"]);
    assert.equal(sent, 1);
  });

  it("returns zero without touching the provider when nothing is deliverable", async () => {
    assert.equal(await sendPersonalizedEmails([{ to: "a@example.com", subject: "s", html: "h" }]), 0);
    assert.deepEqual(logged, []);
  });
});
