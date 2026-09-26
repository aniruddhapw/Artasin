import { Resend } from "resend";
import { senderAddress } from "./email.js";
import { newsletterConfig, newsletterEnabled } from "./newsletter.js";

/**
 * Sends a Broadcast: one message to a list Resend maintains, rather than to a
 * set of addresses we assembled ourselves.
 *
 * The difference is not the mechanism but who decides. A batch send goes to
 * whoever our query returned; a Broadcast goes to whoever is still subscribed,
 * which includes people who unsubscribed through Resend's own preference page
 * and never told us. For marketing mail that has to be the authority.
 */
// Resend refuses a Broadcast whose name is longer than this, and the whole
// send fails with it.
export const BROADCAST_NAME_LIMIT = 70;

/**
 * The name is only a label in Resend's dashboard, so a long one is cut to fit
 * rather than allowed to stop the email going out.
 */
export function broadcastName(name) {
  return name.length <= BROADCAST_NAME_LIMIT ? name : `${name.slice(0, BROADCAST_NAME_LIMIT - 1)}…`;
}

export async function sendBroadcast({ name, subject, html }) {
  if (!newsletterEnabled()) {
    return { sent: false, reason: "not-configured" };
  }

  const { apiKey, segmentId, topicId } = newsletterConfig();
  const resend = new Resend(apiKey);

  const { data, error } = await resend.broadcasts.create({
    name: broadcastName(name),
    segmentId,
    // Without this, Resend sends to every subscribed contact in the segment
    // and does not consult topic preferences at all — so an omitted topicId
    // silently mails the people who opted out. It is optional to the API and
    // mandatory to us.
    topicId,
    from: senderAddress(),
    subject,
    html,
    send: true
  });

  if (error) {
    throw new Error(error.message || "Failed to send broadcast");
  }
  return { sent: true, id: data?.id };
}
