import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateOfBirthSchema } from "@/lib/dateOfBirth";

/**
 * Its own route rather than part of /api/account/profile, which cannot save
 * without a phone number. A field should never be gated behind an unrelated
 * one — the same reason email preferences are separate.
 */
const updateSchema = z.object({
  // An empty field clears the date rather than failing validation, so someone
  // who entered it can take it back out again.
  dateOfBirth: z.union([z.literal("").transform(() => null), z.null(), dateOfBirthSchema])
});

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = updateSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { dateOfBirth: input.dateOfBirth },
      include: { artistProfile: true }
    });

    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
