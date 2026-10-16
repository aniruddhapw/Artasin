import type { Prisma, User } from "@prisma/client";
import { errorMessage } from "@/lib/errorMessage";
import { prisma } from "@/lib/db";
import { isUndeliverableEmail, sendPersonalizedEmails } from "@/lib/email";
import { newsletterNoticeEmail } from "@/lib/emails";
import { syncNewsletterContact } from "@/lib/resendContacts";
import { unsubscribeUrl } from "@/lib/unsubscribe";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

/**
 * The signup checkbox shipped at this moment. Anyone who joined before it was
 * never asked about the newsletter; anyone after it saw the box, so an
 * unticked box from them is an answer and is left alone.
 */
export const CHECKBOX_LAUNCHED_AT = new Date("2026-09-25T13:29:23.608Z");

// Resend allows two requests a second, and each contact sync makes two.
const PAUSE_BETWEEN_CONTACTS_MS = 1100;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** People who joined before the checkbox, were never asked, and haven't been told. */
export function neverAskedWhere(): Prisma.UserWhereInput {
  return {
    newsletterOptIn: false,
    newsletterNoticeSentAt: null,
    createdAt: { lt: CHECKBOX_LAUNCHED_AT }
  };
}

export async function countNeverAsked(): Promise<number> {
  const users = await prisma.user.findMany({ where: neverAskedWhere(), select: { email: true } });
  return users.filter((user) => !isUndeliverableEmail(user.email)).length;
}

/**
 * Subscribes each user, mirrors them to Resend, and sends the one-time notice
 * with its unsubscribe link. The notice date is stamped first, so a person is
 * never picked up twice, even if a later step fails part way.
 *
 * Returns how many were subscribed and how many syncs failed; a failed sync
 * is caught up by `npm run resend:sync`.
 */
export async function subscribeWithNotice(
  users: readonly Pick<User, "id" | "email" | "firstName">[],
  { pauseMs = PAUSE_BETWEEN_CONTACTS_MS }: { pauseMs?: number } = {}
): Promise<{ subscribed: number; syncFailures: number }> {
  const deliverable = users.filter((user) => !isUndeliverableEmail(user.email));
  let syncFailures = 0;

  for (const [index, user] of deliverable.entries()) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { newsletterOptIn: true, newsletterNoticeSentAt: new Date() }
    });
    try {
      await syncNewsletterContact(updated);
    } catch (error) {
      syncFailures += 1;
      console.error(`Resend contact sync failed for ${updated.email}:`, errorMessage(error));
    }
    if (pauseMs && index < deliverable.length - 1) {
      await pause(pauseMs);
    }
  }

  await sendPersonalizedEmails(
    deliverable.map((user) => ({
      to: user.email,
      ...newsletterNoticeEmail(user.firstName, unsubscribeUrl(siteUrl, user.id))
    }))
  );

  return { subscribed: deliverable.length, syncFailures };
}
