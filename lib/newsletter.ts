/**
 * Settings shared by the two halves of the newsletter: the contact list users
 * are mirrored into, and the Broadcasts sent to it. Both need the same three
 * values, and an "is this on?" check that disagreed between them would mean
 * collecting subscribers nobody sends to, or the reverse.
 *
 * Read at call time rather than import time so a deploy can change them.
 */
export interface NewsletterConfig {
  apiKey: string;
  segmentId: string;
  topicId: string;
}

export function newsletterConfig(): Partial<NewsletterConfig> {
  return {
    apiKey: process.env.RESEND_API_KEY,
    segmentId: process.env.RESEND_SEGMENT_ID,
    topicId: process.env.RESEND_NEWSLETTER_TOPIC_ID
  };
}

/**
 * The newsletter needs its own segment and topic on top of the API key that
 * transactional mail already uses, so it stays switched off — silently, the
 * way the console email provider does — until all three are set. Local dev and
 * preview deployments then touch nothing real.
 */
export function newsletterEnabled(): boolean {
  return enabledNewsletterConfig() !== null;
}

/** All three settings, or null while the newsletter is switched off. */
export function enabledNewsletterConfig(): NewsletterConfig | null {
  const { apiKey, segmentId, topicId } = newsletterConfig();
  return apiKey && segmentId && topicId ? { apiKey, segmentId, topicId } : null;
}
