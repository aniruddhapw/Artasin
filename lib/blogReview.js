/**
 * Journal posts are read by collectors as Artasin's own voice, so an admin
 * checks each one before it goes live. Artists write and submit; admins
 * approve or send it back with a note.
 *
 *   DRAFT ──submit──▶ PENDING_REVIEW ──approve──▶ PUBLISHED
 *     ▲                   │     ▲                     │
 *     └────withdraw───────┘     └──edit (live post)───┘
 *                         └──reject──▶ REJECTED ──submit──▶ PENDING_REVIEW
 *
 * Editing a live post sends it back for review. Otherwise a harmless post
 * could be approved and then rewritten into anything.
 */

export const CONTENT_FIELDS = ["title", "excerpt", "body", "coverImageUrl"];

/** True when the update would change anything a reader sees. */
export function changesContent(post, input) {
  return CONTENT_FIELDS.some((field) => input[field] !== undefined && (input[field] ?? null) !== (post[field] ?? null));
}

/**
 * The status an artist's save leaves the post in.
 *
 * `requested` is what the artist asked for: "DRAFT" to keep it private or take
 * it down, "PENDING_REVIEW" to submit it, or undefined for a plain save.
 * "PUBLISHED" is accepted as a request to submit, for a form loaded before
 * review existed. Admins skip the queue.
 */
export function resolveArtistStatus({ current, requested, contentChanged, isAdmin }) {
  if (requested === "DRAFT") {
    return "DRAFT";
  }
  if (requested === "PENDING_REVIEW" || requested === "PUBLISHED") {
    if (isAdmin) return "PUBLISHED";
    // Re-saving a live post unchanged leaves it live.
    if (current === "PUBLISHED" && !contentChanged) return "PUBLISHED";
    return "PENDING_REVIEW";
  }
  if (current === "PUBLISHED" && contentChanged && !isAdmin) {
    return "PENDING_REVIEW";
  }
  return current ?? "DRAFT";
}

/** The fields to write for a status change, beyond the status itself. */
export function statusTimestamps({ current, next, publishedAt, now = new Date() }) {
  const data = {};
  if (next === "PENDING_REVIEW" && current !== "PENDING_REVIEW") {
    data.submittedAt = now;
    // A fresh submission answers the last review; the note has served its purpose.
    data.reviewNote = null;
  }
  // Set the first time a post goes live and never moved, so republishing
  // doesn't reorder a chronological feed.
  if (next === "PUBLISHED" && !publishedAt) {
    data.publishedAt = now;
  }
  return data;
}
