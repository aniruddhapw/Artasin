import { Resend } from "resend";
import { senderAddress, type EmailContent } from "@/lib/email";
import { enabledNewsletterConfig } from "@/lib/newsletter";

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
export function broadcastName(name: string): string {
  return name.length <= BROADCAST_NAME_LIMIT ? name : `${name.slice(0, BROADCAST_NAME_LIMIT - 1)}…`;
}

export type BroadcastResult = { sent: true; id?: string } | { sent: false; reason: string };

export async function sendBroadcast({ name, subject, html }: { name: string } & EmailContent): Promise<BroadcastResult> {
  const config = enabledNewsletterConfig();
  if (!config) {
    return { sent: false, reason: "not-configured" };
  }

  const { apiKey, segmentId, topicId } = config;
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

export interface SentBroadcast {
  id: string;
  status: string;
  sentAt: string | null;
}

/**
 * The broadcast with this name, if one has already gone out or is on its way.
 * Resend's own record is the authority, so a one-off announcement cannot be
 * sent twice even from two admin tabs or after a redeploy. Drafts don't count.
 */
export async function findSentBroadcast(name: string): Promise<SentBroadcast | null> {
  const config = enabledNewsletterConfig();
  if (!config) {
    return null;
  }
  const resend = new Resend(config.apiKey);
  const wanted = broadcastName(name);
  let after: string | undefined;
  // Newest first; an announcement this check guards is recent, so a few pages is plenty.
  for (let page = 0; page < 10; page += 1) {
    const { data, error } = await resend.broadcasts.list(after ? { limit: 100, after } : { limit: 100 });
    if (error) {
      throw new Error(error.message || "Could not list broadcasts");
    }
    const match = data?.data.find((broadcast) => broadcast.name === wanted && broadcast.status !== "draft");
    if (match) {
      return { id: match.id, status: match.status, sentAt: match.sent_at ?? null };
    }
    const last = data?.data.at(-1);
    if (!data?.has_more || !last) {
      return null;
    }
    after = last.id;
  }
  return null;
}
