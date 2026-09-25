import { Resend } from "resend";
import { isUndeliverableEmail } from "./email.js";

/**
 * Mirrors a user into Resend's contact list so Broadcasts have somebody to go
 * to. Transactional mail does not use any of this — it addresses people
 * directly and must reach them whether or not they want a newsletter.
 *
 * Two systems hold a piece of the truth, deliberately:
 *
 *   - our `User.newsletterOptIn` is the record that permission was given, and
 *     the box the account page ticks;
 *   - Resend holds delivery state, including unsubscribes made from the
 *     hosted preference page, which is the only place a recipient can act.
 *
 * They drift when someone unsubscribes through Resend, because nothing tells
 * us. That is the safe direction — Resend stops sending and our copy is merely
 * stale — but it means our flag must never be read as "this person will
 * receive it", only as "this person agreed to receive it".
 */

/** Read at call time, not import time, so a deploy can change them. */
function config() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    segmentId: process.env.RESEND_SEGMENT_ID,
    topicId: process.env.RESEND_NEWSLETTER_TOPIC_ID
  };
}

/**
 * Contact syncing needs its own segment and topic on top of the API key that
 * transactional mail already uses, so it stays switched off — silently, the
 * way the console email provider does — until all three are set. Local dev and
 * preview deployments then touch nothing real.
 */
export function contactsEnabled() {
  const { apiKey, segmentId, topicId } = config();
  return Boolean(apiKey && segmentId && topicId);
}

export function subscriptionFor(newsletterOptIn) {
  return newsletterOptIn ? "opt_in" : "opt_out";
}

/**
 * Creates the contact if it is new, then sets the topic subscription either
 * way.
 *
 * Both calls run every time rather than branching on whether the contact
 * exists: `create` carries the name and segment, `topics.update` is the only
 * endpoint that can move a subscription, and a create for somebody already on
 * the list is an error we can ignore. Deciding between them would mean first
 * asking Resend whether the contact exists — a third round trip to save
 * nothing.
 */
export async function syncNewsletterContact({ email, firstName, lastName, newsletterOptIn }) {
  if (!contactsEnabled()) {
    return { synced: false, reason: "not-configured" };
  }
  // The same reserved domains that poison a batch send are not worth a row in
  // the contact list either.
  if (isUndeliverableEmail(email)) {
    return { synced: false, reason: "undeliverable" };
  }

  const { apiKey, segmentId, topicId } = config();
  const resend = new Resend(apiKey);
  const topics = [{ id: topicId, subscription: subscriptionFor(newsletterOptIn) }];

  try {
    await resend.contacts.create({
      email,
      firstName,
      lastName,
      unsubscribed: false,
      segments: [{ id: segmentId }],
      topics
    });
  } catch {
    // Already on the list. The subscription update below is what matters.
  }

  const { error } = await resend.contacts.topics.update({ email, topics });
  if (error) {
    throw new Error(error.message || "Failed to update Resend topic subscription");
  }
  return { synced: true, subscription: subscriptionFor(newsletterOptIn) };
}

/**
 * The signup and account routes call this instead of syncNewsletterContact.
 *
 * Losing a contact sync is recoverable — `npm run resend:sync` replays every
 * user — whereas failing the request the person actually made is not. So a
 * Resend outage must never be the reason an account cannot be created or a
 * preference cannot be saved.
 */
export async function syncNewsletterContactQuietly(user) {
  try {
    return await syncNewsletterContact(user);
  } catch (error) {
    console.error(`Resend contact sync failed for ${user.email}:`, error.message);
    return { synced: false, reason: "error" };
  }
}
