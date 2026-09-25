import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const { sendBroadcast } = await import("./broadcasts.js");
const { senderAddress } = await import("./email.js");
const { newBlogPostEmail } = await import("./emails.js");

const KEYS = ["RESEND_API_KEY", "RESEND_SEGMENT_ID", "RESEND_NEWSLETTER_TOPIC_ID"];

afterEach(() => {
  for (const key of [...KEYS, "EMAIL_FROM"]) {
    delete process.env[key];
  }
});

describe("sendBroadcast", () => {
  it("does nothing when unconfigured, so local dev never reaches Resend", async () => {
    assert.deepEqual(await sendBroadcast({ name: "n", subject: "s", html: "h" }), {
      sent: false,
      reason: "not-configured"
    });
  });
});

describe("senderAddress", () => {
  it("resolves at call time so broadcasts and transactional mail agree", () => {
    assert.equal(senderAddress(), "ARTASIN <notifications@artasin.in>");
    process.env.EMAIL_FROM = "Studio <hello@artasin.in>";
    assert.equal(senderAddress(), "Studio <hello@artasin.in>");
  });
});

/**
 * A Broadcast that reached an inbox without an unsubscribe link would be the
 * whole reason for this migration undone, and it is invisible until it has
 * already been sent — so it is asserted here rather than trusted.
 */
describe("newBlogPostEmail", () => {
  const post = { title: "Monsoon Studies", slug: "monsoon-studies", excerpt: "Three weeks of rain." };

  it("carries the unsubscribe tag Resend replaces at send time", () => {
    assert.match(newBlogPostEmail(post, "Elena").html, /\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/);
  });

  it("greets by name with a fallback, since the list holds the name and we do not", () => {
    assert.match(newBlogPostEmail(post, "Elena").html, /\{\{\{contact\.first_name\|there\}\}\}/);
  });

  it("escapes the artist name and excerpt", () => {
    const html = newBlogPostEmail({ ...post, excerpt: "<script>x</script>" }, "A & B").html;
    assert.match(html, /A &amp; B/);
    assert.doesNotMatch(html, /<script>/);
  });
});
