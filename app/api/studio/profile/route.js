import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateProfileSchema = z.object({
  displayName: z.string().min(1),
  bio: z.string().optional(),
  discipline: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal(""))
});

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user?.artistProfile) {
      return fail("Artist account required", 403);
    }

    const input = updateProfileSchema.parse(await request.json());
    const artistProfile = await prisma.artistProfile.update({
      where: { id: user.artistProfile.id },
      data: {
        displayName: input.displayName,
        bio: input.bio || null,
        discipline: input.discipline || null,
        location: input.location || null,
        website: input.website || null
      }
    });

    return ok({ artistProfile });
  } catch (error) {
    return handleApiError(error);
  }
}
