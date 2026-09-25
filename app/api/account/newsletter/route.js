import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncNewsletterContact } from "@/lib/resendContacts";

const updateSchema = z.object({
  newsletterOptIn: z.boolean()
});

/**
 * Separate from /api/account/profile, which requires a phone number to save.
 * Email preferences must not be gated behind a field that has nothing to do
 * with them — the people most likely to change this are the ones we already
 * know have no number on file.
 */
export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = updateSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { newsletterOptIn: input.newsletterOptIn },
      include: { artistProfile: true }
    });

    // This one is not quiet, unlike signup. Somebody who just unticked the box
    // needs to know if we failed to pass that on, and there is nothing else
    // riding on the request to protect.
    await syncNewsletterContact(updated);

    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
