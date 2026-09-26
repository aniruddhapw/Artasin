import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { changesContent, resolveArtistStatus, statusTimestamps } = await import("./blogReview.js");

describe("resolveArtistStatus", () => {
  it("sends an artist's submission for review, never straight to the Journal", () => {
    assert.equal(resolveArtistStatus({ current: "DRAFT", requested: "PENDING_REVIEW" }), "PENDING_REVIEW");
  });

  it("treats a publish request from an old form as a submission", () => {
    assert.equal(resolveArtistStatus({ current: "DRAFT", requested: "PUBLISHED" }), "PENDING_REVIEW");
  });

  it("lets an admin publish directly", () => {
    assert.equal(resolveArtistStatus({ current: "DRAFT", requested: "PENDING_REVIEW", isAdmin: true }), "PUBLISHED");
  });

  /** The loophole review exists to close: approve something harmless, then rewrite it. */
  it("pulls a live post back into review when its content changes", () => {
    assert.equal(resolveArtistStatus({ current: "PUBLISHED", contentChanged: true }), "PENDING_REVIEW");
    assert.equal(
      resolveArtistStatus({ current: "PUBLISHED", requested: "PENDING_REVIEW", contentChanged: true }),
      "PENDING_REVIEW"
    );
  });

  it("leaves a live post live when a save changes nothing", () => {
    assert.equal(resolveArtistStatus({ current: "PUBLISHED", contentChanged: false }), "PUBLISHED");
    assert.equal(
      resolveArtistStatus({ current: "PUBLISHED", requested: "PENDING_REVIEW", contentChanged: false }),
      "PUBLISHED"
    );
  });

  it("lets an artist withdraw or take down their own post", () => {
    assert.equal(resolveArtistStatus({ current: "PENDING_REVIEW", requested: "DRAFT" }), "DRAFT");
    assert.equal(resolveArtistStatus({ current: "PUBLISHED", requested: "DRAFT" }), "DRAFT");
  });

  it("keeps a rejected post rejected until it is resubmitted", () => {
    assert.equal(resolveArtistStatus({ current: "REJECTED", contentChanged: true }), "REJECTED");
    assert.equal(resolveArtistStatus({ current: "REJECTED", requested: "PENDING_REVIEW" }), "PENDING_REVIEW");
  });

  it("starts a new post as a draft", () => {
    assert.equal(resolveArtistStatus({ current: undefined, requested: undefined }), "DRAFT");
  });
});

describe("changesContent", () => {
  const post = { title: "Ganesha", excerpt: null, body: "<p>Hi</p>", coverImageUrl: "a.jpg" };

  it("ignores fields the update leaves out or repeats", () => {
    assert.equal(changesContent(post, {}), false);
    assert.equal(changesContent(post, { title: "Ganesha", body: "<p>Hi</p>" }), false);
  });

  it("treats a cleared field and an empty one as the same", () => {
    assert.equal(changesContent(post, { excerpt: null }), false);
  });

  it("notices a changed title, body, excerpt or cover", () => {
    assert.equal(changesContent(post, { title: "Ganesha, for sale" }), true);
    assert.equal(changesContent(post, { excerpt: "₹21,000" }), true);
    assert.equal(changesContent(post, { coverImageUrl: null }), true);
  });
});

describe("statusTimestamps", () => {
  const now = new Date("2026-09-26T10:00:00Z");

  it("stamps a submission and clears the last review note", () => {
    assert.deepEqual(statusTimestamps({ current: "REJECTED", next: "PENDING_REVIEW", now }), {
      submittedAt: now,
      reviewNote: null
    });
  });

  it("sets publishedAt only the first time a post goes live", () => {
    assert.deepEqual(statusTimestamps({ current: "PENDING_REVIEW", next: "PUBLISHED", publishedAt: null, now }), {
      publishedAt: now
    });
    assert.deepEqual(
      statusTimestamps({ current: "PENDING_REVIEW", next: "PUBLISHED", publishedAt: new Date("2026-01-01"), now }),
      {}
    );
  });
});
