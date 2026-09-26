import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { syncNewsletterContact } from "@/lib/resendContacts";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

const unsubscribeSchema = z.object({
  token: z.string().min(1)
});

/**
 * One-click unsubscribe from an email link, no sign-in needed. The signed
 * token is the permission.
 */
export async function POST(request) {
  try {
    const { token } = unsubscribeSchema.parse(await request.json());
    const userId = readUnsubscribeToken(token);
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user) {
      return fail("This unsubscribe link isn't valid. You can change email preferences from your account.", 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        newsletterOptIn: false,
        // Recorded as told, so nothing subscribes them by default again.
        newsletterNoticeSentAt: user.newsletterNoticeSentAt ?? new Date()
      }
    });

    // Not quiet: Resend is what actually stops the mail, so if this fails the
    // person has to know and try again.
    await syncNewsletterContact(updated);

    return ok({ unsubscribed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
